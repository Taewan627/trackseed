import { CAR_RADIUS, clamp, project, roadContact, roadHeight, type Point, type Track } from './core.js';

export interface Controls { throttle: boolean; reverse: boolean; left: boolean; right: boolean; brake: boolean }
export interface Vehicle extends Point {
  heading: number; speed: number; pitch: number;
  surface: 'asphalt' | 'curb' | 'sidewalk'; collision: number;
  vx: number; vz: number; roadIndex: number;
}
export const NO_INPUT: Controls = { throttle: false, reverse: false, left: false, right: false, brake: false };
const MARGIN = 0.002;

export function spawnVehicle(track: Track): Vehicle {
  // Prefer the original start. Validate the complete conservative circle first.
  const index = track.points.findIndex(p => roadContact(track, p.x, p.z).clearance >= CAR_RADIUS + MARGIN);
  if (index < 0) throw new Error('No asphalt area to place the vehicle.');
  const a = track.points[index], b = track.points[index + 1];
  return { ...a, y: roadHeight(track, a.x, a.z), heading: Math.atan2(b.x - a.x, b.z - a.z), speed: 0,
    pitch: Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)), surface: 'asphalt', collision: 0,
    vx: 0, vz: 0, roadIndex: index };
}

function approachZero(v: number, amount: number): number {
  return Math.sign(v) * Math.max(0, Math.abs(v) - amount);
}

// Positional correction and velocity clipping share the exact rendered edges.
// Repeated constraints handle corners; a validated fallback handles imported or
// externally displaced poses, rather than leaving a hull on the sidewalk.
function contain(car: Vehicle, track: Track, fallback: Point) {
  for (let i = 0; i < 12; i++) {
    const hit = roadContact(track, car.x, car.z);
    if (hit.clearance >= CAR_RADIUS + MARGIN - 1e-7) return;
    const penetration = CAR_RADIUS + MARGIN - hit.clearance;
    car.x += hit.nx * penetration; car.z += hit.nz * penetration;
    const outward = car.vx * hit.nx + car.vz * hit.nz;
    if (outward < 0) { car.vx -= outward * hit.nx; car.vz -= outward * hit.nz; }
    car.collision = 0.25;
  }
  if (roadContact(track, fallback.x, fallback.z).clearance >= CAR_RADIUS) {
    car.x = fallback.x; car.z = fallback.z;
  } else {
    const safe = spawnVehicle(track); car.x = safe.x; car.z = safe.z; car.roadIndex = safe.roadIndex;
  }
  car.vx = car.vz = 0;
}

// World-coordinate integration with a bounded 1/120s step (<=1.34u at max
// speed), well below the hull radius. There is no rail-following or auto-steer.
export function updateVehicle(car: Vehicle, input: Controls, track: Track, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const elapsed = Math.min(dt, 0.1);
  const steps = Math.ceil(elapsed / (1 / 120));
  for (let i = 0; i < steps; i++) integrate(car, input, track, elapsed / steps);
}

function integrate(car: Vehicle, input: Controls, track: Track, dt: number) {
  car.collision = Math.max(0, car.collision - dt);
  let prev = project(track, car.x, car.z, car.roadIndex);
  // External pose edits (test harness, future load) can invalidate the hint.
  if (prev.distance > track.params.width) prev = project(track, car.x, car.z);
  const forwardX = Math.sin(car.heading), forwardZ = Math.cos(car.heading);
  const slope = prev.slope * (prev.dx * forwardX + prev.dz * forwardZ);
  const throttle = Number(input.throttle) - Number(input.reverse);
  const acceleration = throttle > 0 ? (car.speed < -2 ? 150 : 95)
    : throttle < 0 ? (car.speed > 2 ? -150 : -65) : 0;
  const gravity = Math.abs(car.speed) > 0.4 || throttle !== 0 ? -30 * clamp(slope, -2, 2) : 0;
  // Retain the tangential velocity from the previous collision, while allowing
  // callers to set speed directly. Scalar speed remains signed for the HUD.
  if (Math.abs(Math.hypot(car.vx, car.vz) - Math.abs(car.speed)) > 1e-5) {
    car.vx = forwardX * car.speed; car.vz = forwardZ * car.speed;
  }
  const accelerated = car.speed + (acceleration + gravity) * dt;
  car.vx += forwardX * (accelerated - car.speed); car.vz += forwardZ * (accelerated - car.speed);
  let nextSpeed = approachZero(accelerated,
    (5 + Math.abs(accelerated) * 0.18 + accelerated ** 2 * 0.0018 + (input.brake ? 240 : 0)) * dt);
  nextSpeed = clamp(nextSpeed, -65, 160);
  if (Math.abs(nextSpeed) < 0.04) nextSpeed = 0;
  const magnitude = Math.hypot(car.vx, car.vz);
  if (magnitude > 0) { car.vx *= Math.abs(nextSpeed) / magnitude; car.vz *= Math.abs(nextSpeed) / magnitude; }
  const steer = Number(input.left) - Number(input.right);
  const angle = steer * 0.48 / (1 + Math.abs(nextSpeed) / 115);
  const turn = nextSpeed / 11 * Math.tan(angle) * dt;
  car.heading = Math.atan2(Math.sin(car.heading + turn), Math.cos(car.heading + turn));
  const vx = car.vx;
  car.vx = vx * Math.cos(turn) + car.vz * Math.sin(turn);
  car.vz = car.vz * Math.cos(turn) - vx * Math.sin(turn);
  const fallback = { x: car.x, y: car.y, z: car.z };
  contain(car, track, prev);
  car.x += car.vx * dt; car.z += car.vz * dt;
  contain(car, track, fallback);

  for (const obstacle of track.obstacles) {
    let dx = car.x - obstacle.x, dz = car.z - obstacle.z;
    const dist = Math.hypot(dx, dz), limit = CAR_RADIUS + obstacle.radius;
    if (dist < limit && Math.abs(car.y - obstacle.y) < 12) {
      if (dist < 1e-6) { dx = -Math.sin(car.heading); dz = -Math.cos(car.heading); }
      else { dx /= dist; dz /= dist; }
      car.x = obstacle.x + dx * (limit + 0.01); car.z = obstacle.z + dz * (limit + 0.01);
      car.vx *= 0.35; car.vz *= 0.35; car.collision = 0.25;
      contain(car, track, fallback);
    }
  }
  car.speed = Math.sign(nextSpeed) * Math.hypot(car.vx, car.vz);
  if (Math.abs(car.speed) < 0.04) { car.speed = 0; car.vx = car.vz = 0; }
  const ground = project(track, car.x, car.z, prev.index);
  car.roadIndex = ground.index; car.surface = 'asphalt';
  car.y = roadHeight(track, car.x, car.z, ground);
  const newSlope = ground.slope * (ground.dx * Math.sin(car.heading) + ground.dz * Math.cos(car.heading));
  car.pitch += (Math.atan(newSlope) - car.pitch) * (1 - Math.exp(-12 * dt));
}
