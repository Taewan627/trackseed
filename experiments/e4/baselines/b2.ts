// B2: sorted-uniform-angle random radial waypoints + uniform Catmull-Rom, pure spline (PROTOCOL.md).
import { random } from '../../../src/core.js';
import { dcos, dsin } from '../../../src/detmath.js';
import { finishTrack, radiusOf, resample, uniformSpline, type BaselineParams, type BaselineTrack, type P2 } from './common.js';

export function generateB2(prm: BaselineParams): BaselineTrack {
  const rng = random(prm.seed ^ 0x0b2ca002), R = radiusOf(prm.size), K = prm.curves, TAU = Math.PI * 2;
  const angles = Array.from({ length: K }, () => rng() * TAU).sort((a, b) => a - b);
  const wp: P2[] = angles.map(a => { const r = R * (0.7 + 0.4 * rng()); return { x: dcos(a) * r, z: dsin(a) * r }; });
  return finishTrack(resample(uniformSpline(wp), prm.spacing ?? 8), K, prm.width, prm.height, prm.seed);
}
