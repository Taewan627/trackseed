import { CAR_RADIUS, random, roadContact, roadHeight, type Point, type Track } from './core.js';
import { spawnVehicle } from './vehicle.js';

export const COIN_COUNT = 10;
export const COIN_RADIUS = 2.6;
export const COIN_PICKUP_RADIUS = CAR_RADIUS + COIN_RADIUS;
export interface Coin extends Point { id: number }

export function generateCoins(track: Track): Coin[] {
  // A separate random stream leaves road, obstacle and scenery generation intact.
  const rng = random(track.params.seed ^ 0x4c01a5);
  const count = track.points.length - 1;
  const spawn = spawnVehicle(track);
  const coins: Coin[] = [];
  const tryPosition = (index: number, offset: number) => {
    const p = track.points[index], n = track.normals[index];
    const x = p.x + n.x * offset, z = p.z + n.z * offset;
    // Leave room for the whole vehicle, not just the coin, to reach the pickup.
    if (roadContact(track, x, z).clearance < CAR_RADIUS + 0.4) return false;
    if (Math.hypot(x - track.points[0].x, z - track.points[0].z) < 40) return false;
    if (Math.hypot(x - spawn.x, z - spawn.z) < 40) return false;
    if (track.obstacles.some(o => Math.hypot(x - o.x, z - o.z) <
      CAR_RADIUS + o.radius + COIN_RADIUS + 2)) return false;
    if (coins.some(c => Math.hypot(x - c.x, z - c.z) < 28)) return false;
    coins.push({ id: coins.length, x, y: roadHeight(track, x, z), z });
    return true;
  };
  const lateralRoom = Math.min(track.params.width * 0.2, track.params.width / 2 - CAR_RADIUS - 1);
  // Spread the ten pickups around the lap, with seeded longitudinal/lateral jitter.
  for (let bin = 0; bin < COIN_COUNT; bin++) {
    for (let attempt = 0; attempt < 24; attempt++) {
      const index = Math.floor(count * (0.06 + 0.88 * (bin + rng()) / COIN_COUNT));
      if (tryPosition(index, (rng() * 2 - 1) * lateralRoom)) break;
    }
  }
  // Difficult corners/obstacles may reject a whole bin. Fill from a deterministic
  // permutation of safe centerline samples without weakening any clearance rule.
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (const index of indices) {
    if (coins.length === COIN_COUNT) break;
    tryPosition(index, 0);
  }
  if (coins.length !== COIN_COUNT) throw new Error('안전한 코인 위치 10개를 찾을 수 없습니다.');
  return coins;
}

export class CoinRun {
  readonly coins: Coin[];
  private collected = new Set<number>();

  constructor(track: Track) { this.coins = generateCoins(track); }
  get count() { return this.collected.size; }
  get complete() { return this.count === COIN_COUNT; }
  get collectedIds() { return [...this.collected]; }

  collect(position: Point): number[] {
    const picked: number[] = [];
    for (const coin of this.coins) {
      // Height prevents collecting a different level at an overlapping corner.
      if (!this.collected.has(coin.id) && Math.hypot(position.x - coin.x,
        position.y - coin.y, position.z - coin.z) <= COIN_PICKUP_RADIUS) {
        this.collected.add(coin.id); picked.push(coin.id);
      }
    }
    return picked;
  }
}
