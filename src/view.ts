import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CURB, CURB_HEIGHT, SIDEWALK, STEPS, project, type Track, type Point } from './core.js';
import { COIN_RADIUS, generateCoins, type Coin } from './coins.js';
import { t } from './i18n.js';

type Pose = Point & { heading: number; pitch: number };
export type CameraMode = 'overview' | 'chase';

function material(color: number, emissive = 0) {
  return new THREE.MeshLambertMaterial({ color, emissive });
}

// Each regeneration owns its geometries/materials. Shared resources are disposed once.
export function disposeGroup(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
      geometries.add(object.geometry);
      for (const mat of Array.isArray(object.material) ? object.material : [object.material]) materials.add(mat);
    }
    if (object instanceof THREE.InstancedMesh) object.dispose();
  });
  geometries.forEach(g => g.dispose());
  materials.forEach(m => m.dispose());
  group.clear();
}

function ribbon(track: Track, from: number, to: number, height: number, color: number, name: string) {
  const positions: number[] = [], indices: number[] = [];
  track.points.forEach((p, i) => {
    const n = track.normals[i];
    for (const offset of [from, to]) {
      const edge = Math.abs(offset) === track.params.width / 2
        ? track.roadEdges[offset < 0 ? 0 : 1][i] : undefined;
      positions.push(edge?.x ?? p.x + n.x * offset, p.y + height, edge?.z ?? p.z + n.z * offset);
    }
    if (i < track.points.length - 1) {
      const k = i * 2; indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const mat = material(color); mat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geometry, mat); mesh.name = name;
  return mesh;
}

function wall(track: Track, offset: number, low: number, high: number, color: number) {
  const positions: number[] = [], indices: number[] = [];
  track.points.forEach((p, i) => {
    const n = track.normals[i];
    for (const y of [low, high]) positions.push(p.x + n.x * offset, p.y + y, p.z + n.z * offset);
    if (i < track.points.length - 1) {
      const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const mat = material(color); mat.side = THREE.DoubleSide;
  return new THREE.Mesh(geometry, mat);
}

export class TrackView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.5, 12000);
  readonly controls: OrbitControls;
  readonly car = new THREE.Group();
  private environment = new THREE.Group();
  private coinObjects = new Map<number, { group: THREE.Group; baseY: number }>();
  private coinTime = 0;
  private center = new THREE.Vector3();
  private followPosition = new THREE.Vector3();
  private followTarget = new THREE.Vector3();
  private target = new THREE.Vector3();
  private boundsRadius = 600;
  private groundY = -300;
  private cameraSurfaces: THREE.Mesh[] = [];
  private cameraOccluders: THREE.Mesh[] = [];
  private cameraCeiling = 1000;
  private cameraRay = new THREE.Raycaster();
  private cameraHits: THREE.Intersection[] = [];
  private cameraProbe = new THREE.Vector3();
  private cameraDown = new THREE.Vector3(0, -1, 0);
  private cameraFocus = new THREE.Vector3();
  private cameraDirection = new THREE.Vector3();
  private track?: Track;
  private observer: ResizeObserver;
  mode: CameraMode = 'overview';

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x182329);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('aria-label', t('canvas.aria'));
    host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xd6ecf4, 0x4e5c42, 2.5));
    const sun = new THREE.DirectionalLight(0xffedd4, 2.5);
    sun.position.set(-400, 1000, 300); this.scene.add(sun);
    this.scene.add(this.environment, this.car);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 40; this.controls.maxDistance = 3500;
    this.makeCar();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host); this.resize();
  }

  setTrack(track: Track, coins: Coin[] = generateCoins(track)) {
    this.track = track;
    const next = new THREE.Group();
    const hw = track.params.width / 2;
    next.add(ribbon(track, -hw, hw, 0, 0x343e43, 'asphalt'));
    for (const side of [-1, 1]) {
      next.add(ribbon(track, side * hw, side * (hw + CURB), CURB_HEIGHT, 0xb1b7ad, 'curb'));
      next.add(wall(track, side * hw, 0, CURB_HEIGHT, 0x9ca496));
      next.add(ribbon(track, side * (hw + CURB), side * (hw + CURB + SIDEWALK), CURB_HEIGHT,
        0x6b7776, 'sidewalk'));
      next.add(wall(track, side * (hw + CURB + SIDEWALK), -3, CURB_HEIGHT, 0x485451));
      next.add(ribbon(track, side * (hw - 1), side * (hw - 0.5), 0.09, 0xd5d8c1, 'edge-line'));
    }
    // Dashed center line: a single indexed mesh, generated only when the track changes.
    const dash = ribbon(track, -0.25, 0.25, 0.1, 0xa8b1a4, 'center-line');
    const index = dash.geometry.getIndex()!;
    const kept: number[] = [];
    for (let i = 0; i < track.points.length - 1; i++) {
      if (i % 8 < 3) for (let j = 0; j < 6; j++) kept.push(index.getX(i * 6 + j));
    }
    dash.geometry.setIndex(kept); next.add(dash);
    // A small original checkerboard marks the start; no image assets are used.
    const start = track.points[0], nextPoint = track.points[1];
    const startGroup = new THREE.Group();
    startGroup.position.set(start.x, start.y + 0.17, start.z);
    startGroup.rotation.y = Math.atan2(nextPoint.x - start.x, nextPoint.z - start.z);
    const checkGeo = new THREE.BoxGeometry(track.params.width / 10, 0.12, 2);
    const checkMats = [material(0xe6e8d8), material(0x20292a)];
    for (let x = 0; x < 10; x++) for (let z = 0; z < 2; z++) {
      const mesh = new THREE.Mesh(checkGeo, checkMats[(x + z) % 2]);
      mesh.position.set((x - 4.5) * track.params.width / 10, 0, (z - 0.5) * 2);
      startGroup.add(mesh);
    }
    next.add(startGroup);
    this.groundY = track.bounds.minY - 30;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), material(0x26352f));
    ground.rotation.x = -Math.PI / 2; ground.position.y = this.groundY - 0.3; next.add(ground);
    const grid = new THREE.GridHelper(2800, 56, 0x40564a, 0x30443a);
    grid.position.y = this.groundY; next.add(grid);
    const pillars = track.points.filter((_, i) => i % (STEPS / 2) === 0);
    this.instances(next, pillars, new THREE.BoxGeometry(1, 1, 1), material(0x48574e), (pt, o) => {
      const h = pt.y - this.groundY - 2;
      o.position.set(pt.x, this.groundY + h / 2, pt.z); o.scale.set(3, h, 3);
    });
    this.addProps(next, track);
    this.instances(next, track.obstacles, new THREE.BoxGeometry(7, 7, 7), material(0xd88c57), (p, o) => {
      o.position.set(p.x, p.y + 3.5, p.z); o.rotation.y = p.heading;
    });
    this.addCoins(next, coins);
    const old = this.environment;
    this.environment = next; this.scene.add(next); this.scene.remove(old); disposeGroup(old);
    this.cameraSurfaces = next.children.filter((o): o is THREE.Mesh =>
      o instanceof THREE.Mesh && ['asphalt', 'curb', 'sidewalk'].includes(o.name));
    this.cameraOccluders = next.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh);
    this.cameraCeiling = track.bounds.maxY + CURB_HEIGHT + 100;
    // Camera collision queries must also work before the first render after regeneration.
    next.updateMatrixWorld(true);
    const b = track.bounds;
    this.center.set((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2);
    this.boundsRadius = Math.hypot((b.maxX - b.minX) / 2 + 50, (b.maxZ - b.minZ) / 2 + 50,
      (b.maxY - b.minY) / 2 + 40);
    if (this.mode === 'overview') this.fitOverview();
  }

  private addCoins(environment: THREE.Group, coins: Coin[]) {
    this.coinObjects.clear(); this.coinTime = 0;
    const container = new THREE.Group(); container.name = 'coins';
    const disk = new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, 0.7, 24);
    const rim = new THREE.TorusGeometry(COIN_RADIUS - 0.25, 0.2, 6, 24);
    const emblem = new THREE.CylinderGeometry(1.3, 1.3, 0.82, 6);
    const gold = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.4,
      roughness: 0.28, emissive: 0x493000, emissiveIntensity: 0.3 });
    const highlight = material(0xffe59a, 0x332200);
    for (const coin of coins) {
      const group = new THREE.Group(); group.name = `coin-${coin.id}`;
      const body = new THREE.Mesh(disk, gold); body.rotation.x = Math.PI / 2;
      const edge = new THREE.Mesh(rim, highlight); edge.position.z = 0.4;
      const stamp = new THREE.Mesh(emblem, highlight); stamp.rotation.x = Math.PI / 2;
      group.add(body, edge, stamp);
      group.position.set(coin.x, coin.y + 4.4, coin.z);
      group.rotation.y = coin.id * 0.7;
      container.add(group); this.coinObjects.set(coin.id, { group, baseY: coin.y + 4.4 });
    }
    environment.add(container);
  }

  hideCoins(ids: number[]) {
    // Keep hidden shared resources owned by this environment until regeneration,
    // so collecting the last coin cannot orphan its geometry/material disposal.
    for (const id of ids) {
      const coin = this.coinObjects.get(id);
      if (coin) coin.group.visible = false;
    }
  }

  get visibleCoinCount() { return [...this.coinObjects.values()].filter(c => c.group.visible).length; }

  private instances<T>(group: THREE.Group, items: T[], geometry: THREE.BufferGeometry,
    mat: THREE.Material, transform: (item: T, dummy: THREE.Object3D) => void) {
    if (!items.length) { geometry.dispose(); mat.dispose(); return; }
    const mesh = new THREE.InstancedMesh(geometry, mat, items.length);
    const dummy = new THREE.Object3D();
    items.forEach((item, i) => {
      dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
      transform(item, dummy); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); group.add(mesh);
  }

  private addProps(group: THREE.Group, track: Track) {
    const parts = (kind: string, geometry: THREE.BufferGeometry, color: number, pos: Point, scale: Point, emissive = 0) => {
      const items = track.props.filter(p => p.kind === kind);
      this.instances(group, items, geometry, material(color, emissive), (p, o) => {
        const sin = Math.sin(p.heading), cos = Math.cos(p.heading), s = p.scale;
        o.position.set(p.x + (pos.x * cos + pos.z * sin) * s, p.y + pos.y * s,
          p.z + (-pos.x * sin + pos.z * cos) * s);
        o.rotation.y = p.heading; o.scale.set(scale.x * s, scale.y * s, scale.z * s);
      });
    };
    const box = () => new THREE.BoxGeometry(1, 1, 1);
    parts('tree', box(), 0x75634a, { x: 0, y: 7, z: 0 }, { x: 2, y: 14, z: 2 });
    parts('tree', new THREE.ConeGeometry(1, 1, 7), 0x658d61, { x: 0, y: 17, z: 0 }, { x: 7, y: 18, z: 7 });
    parts('tree', new THREE.ConeGeometry(1, 1, 7), 0x7b9e6c, { x: 0, y: 24, z: 0 }, { x: 5, y: 13, z: 5 });
    parts('bench', box(), 0xb79970, { x: 0, y: 3.4, z: 0 }, { x: 9, y: 1.2, z: 3 });
    parts('bench', box(), 0xb79970, { x: 0, y: 5.2, z: -1.5 }, { x: 9, y: 3, z: 0.7 });
    for (const x of [-3, 3]) parts('bench', box(), 0x343e3d, { x, y: 1.5, z: 0 }, { x: 0.8, y: 3, z: 2.5 });
    parts('lamp', box(), 0x677773, { x: 0, y: 14, z: 0 }, { x: 0.8, y: 28, z: 0.8 });
    parts('lamp', box(), 0x677773, { x: 0, y: 27.7, z: 2 }, { x: 1, y: 0.8, z: 5 });
    parts('lamp', box(), 0xe8e5b9, { x: 0, y: 27, z: 4 }, { x: 2.5, y: 0.7, z: 2.5 }, 0x999566);
    parts('building', box(), 0x7f8d89, { x: 0, y: 24, z: 0 }, { x: 20, y: 48, z: 20 });
    parts('building', box(), 0xa1aaa0, { x: 0, y: 49, z: 0 }, { x: 22, y: 2, z: 22 });
    for (const y of [10, 22, 34]) parts('building', box(), 0xb5c9bd, { x: 0, y, z: 10.1 }, { x: 14, y: 4, z: 0.2 });
  }

  private makeCar() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mats = { paint: material(0xd1ef85), dark: material(0x26393d), tire: material(0x172025), light: material(0xfff5c9, 0x777053) };
    const part = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); this.car.add(mesh);
    };
    part(0, 2.4, 0, 6.3, 2.2, 10.8, mats.paint);
    part(0, 4.2, -0.8, 4.7, 2, 5, mats.dark);
    part(0, 5.3, -1.1, 4.8, 0.4, 3.5, mats.paint);
    for (const x of [-3.3, 3.3]) for (const z of [-3.5, 3.5]) part(x, 1.5, z, 1.3, 2.8, 2.4, mats.tire);
    for (const x of [-2, 2]) part(x, 2.4, 5.5, 1.3, 0.7, 0.2, mats.light);
  }

  setMode(mode: CameraMode, pose: Pose) {
    this.mode = mode; this.controls.enabled = mode === 'overview';
    if (mode === 'overview') this.fitOverview();
    else this.follow(pose, 1);
  }

  private fitOverview() {
    const vertical = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * this.camera.aspect);
    const distance = this.boundsRadius / Math.sin(Math.min(vertical, horizontal)) * 1.05;
    this.controls.maxDistance = Math.max(3500, distance * 1.1);
    this.camera.position.copy(this.center).add(new THREE.Vector3(0.25, 0.95, 0.85).normalize().multiplyScalar(distance));
    this.controls.target.copy(this.center); this.controls.update();
  }

  private follow(pose: Pose, alpha: number) {
    const dx = Math.sin(pose.heading), dz = Math.cos(pose.heading);
    this.followPosition.set(pose.x - dx * 47, pose.y + 26, pose.z - dz * 47);
    this.followPosition.y = Math.max(this.followPosition.y, this.groundY + 10);
    if (this.track) {
      const ground = project(this.track, this.followPosition.x, this.followPosition.z);
      if (ground.distance < this.track.params.width / 2 + CURB + SIDEWALK) {
        this.followPosition.y = Math.max(this.followPosition.y, ground.y + 16);
      }
    }
    this.followTarget.set(pose.x + dx * 19, pose.y + 4, pose.z + dz * 19);
    this.camera.position.lerp(this.followPosition, alpha);
    this.target.lerp(this.followTarget, alpha);
    this.keepCameraAboveRoad();
    // A ridge or a roadside object can completely hide the car. Shorten only
    // obstructed chase views, keeping the normal camera distance unchanged.
    this.cameraFocus.set(pose.x, pose.y + 3.5, pose.z);
    this.cameraDirection.subVectors(this.camera.position, this.cameraFocus);
    const distance = this.cameraDirection.length();
    if (distance > 1) {
      this.cameraDirection.divideScalar(distance);
      this.cameraRay.set(this.cameraFocus, this.cameraDirection);
      this.cameraRay.far = distance;
      this.cameraHits.length = 0;
      this.cameraRay.intersectObjects(this.cameraOccluders, false, this.cameraHits);
      const obstruction = this.cameraHits[0];
      // Keep the lens outside the car; a prop already touching it needs a more
      // involved avoidance path, which is deliberately outside this small fix.
      if (obstruction && obstruction.distance > 10) {
        this.camera.position.copy(this.cameraFocus).addScaledVector(this.cameraDirection,
          obstruction.distance - 1);
        this.target.copy(this.cameraFocus);
        // Shortening changes X/Z too; the new position needs its own floor check.
        this.keepCameraAboveRoad();
      }
      this.cameraHits.length = 0;
    }
    this.camera.lookAt(this.target);
  }

  private keepCameraAboveRoad() {
    // The smoothed camera can cut through a steep corner even when its desired
    // position is safe. Query the actual ribbon, not just the nearest centerline.
    this.camera.position.y = Math.max(this.camera.position.y, this.groundY + 10);
    if (this.camera.position.y < this.cameraCeiling) {
      this.cameraProbe.set(this.camera.position.x, this.cameraCeiling, this.camera.position.z);
      this.cameraRay.set(this.cameraProbe, this.cameraDown);
      this.cameraRay.far = Infinity;
      this.cameraHits.length = 0;
      this.cameraRay.intersectObjects(this.cameraSurfaces, false, this.cameraHits);
      if (this.cameraHits.length) this.camera.position.y = Math.max(this.camera.position.y, this.cameraHits[0].point.y + 3);
      this.cameraHits.length = 0;
    }
  }

  render(pose: Pose, dt: number) {
    this.car.position.set(pose.x, pose.y, pose.z); this.car.rotation.set(0, pose.heading, 0);
    this.car.rotateX(-pose.pitch);
    this.coinTime += dt;
    for (const [id, coin] of this.coinObjects) {
      if (!coin.group.visible) continue;
      coin.group.rotation.y = id * 0.7 + this.coinTime * 1.6;
      coin.group.position.y = coin.baseY + Math.sin(this.coinTime * 2 + id) * 0.35;
    }
    if (this.mode === 'chase') this.follow(pose, 1 - Math.exp(-7 * dt));
    else this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.mode === 'overview') this.fitOverview();
  }

  dispose() {
    this.observer.disconnect(); this.controls.dispose(); disposeGroup(this.environment);
    this.cameraSurfaces.length = 0; this.cameraOccluders.length = 0; this.cameraHits.length = 0;
    this.coinObjects.clear();
    disposeGroup(this.car); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
