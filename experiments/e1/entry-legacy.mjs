import { generateTrack } from '@legacy/core.ts';
import { sha256 } from '../../src/sha256.ts';
import { runCases as run } from './cases.mjs';
export const runLegacy = () => run(p => {
  const { points, normals, roadEdges, props, obstacles } = generateTrack(p);
  return sha256(JSON.stringify({ points, normals, roadEdges, props, obstacles }));
}, '0.4-legacy@6fea4d6');
export default runLegacy;
