import { CURB, SIDEWALK, mapTransform, type Track } from './core.js';
import { t } from './i18n.js';

export class Minimap {
  private base = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private transform!: ReturnType<typeof mapTransform>;
  readonly width = 264;
  readonly height = 204;
  marker = { x: 0, y: 0, heading: 0 };

  constructor(canvas: HTMLCanvasElement) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = this.base.width = this.width * dpr;
    canvas.height = this.base.height = this.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(t('minimap.noContext'));
    this.ctx = ctx;
    this.ctx.scale(dpr, dpr);
  }

  setTrack(track: Track) {
    this.transform = mapTransform(track, this.width, this.height, 16);
    const ctx = this.base.getContext('2d')!;
    const dpr = this.base.width / this.width;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    // Leave the canvas background transparent; the panel supplies 45% opacity.
    // Track bands, marker and direction keep their original opaque colors.
    ctx.strokeStyle = '#213037';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < this.width; x += 22) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 22) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
    }
    const band = (halfWidth: number, color: string) => {
      ctx.beginPath();
      for (const side of [1, -1]) {
        const indices = track.points.map((_, i) => i);
        if (side === -1) indices.reverse();
        for (const i of indices) {
          const p = track.points[i], n = track.normals[i];
          const edge = halfWidth === track.params.width / 2 ? track.roadEdges[side < 0 ? 0 : 1][i] : undefined;
          const v = this.transform.point(edge?.x ?? p.x + n.x * halfWidth * side, edge?.z ?? p.z + n.z * halfWidth * side);
          ctx.lineTo(v.x, v.y);
        }
      }
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    };
    band(track.params.width / 2 + CURB + SIDEWALK, '#3b4b50');
    band(track.params.width / 2 + CURB, '#8f9e9a');
    band(track.params.width / 2, '#27333a');
    ctx.strokeStyle = '#708281'; ctx.lineWidth = 0.6; ctx.setLineDash([2, 4]);
    ctx.beginPath();
    for (const p of track.points) {
      const v = this.transform.point(p.x, p.z); ctx.lineTo(v.x, v.y);
    }
    ctx.stroke(); ctx.setLineDash([]);
    const start = this.transform.point(track.points[0].x, track.points[0].z);
    ctx.fillStyle = '#ecf3e4'; ctx.fillRect(start.x - 2, start.y - 2, 4, 4);
    for (const obstacle of track.obstacles) {
      const v = this.transform.point(obstacle.x, obstacle.z);
      ctx.fillStyle = '#e69a67'; ctx.fillRect(v.x - 1.5, v.y - 1.5, 3, 3);
    }
  }

  draw(x: number, z: number, heading: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(this.base, 0, 0, this.width, this.height);
    const v = this.transform.point(x, z);
    this.marker = { ...v, heading };
    ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(-heading);
    ctx.shadowColor = '#c2f28d'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#c2f28d'; ctx.strokeStyle = '#15251b'; ctx.lineWidth = 1.5;
    // Local forward is +Z, which points down in the map.
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-4.5, -4); ctx.lineTo(0, -2);
    ctx.lineTo(4.5, -4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
}
