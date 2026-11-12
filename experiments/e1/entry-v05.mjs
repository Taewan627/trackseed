import { generateTrack } from '../../src/core.ts';
import { serializeTrack } from '../../src/schema.ts';
import { sha256 } from '../../src/sha256.ts';
import { VERSION } from '../../src/version.ts';
import { runCases as run } from './cases.mjs';
// v1.1: pin the v1.0.0 join so committed results reproduce (docs/generator-auto-join.md)
export const run05 = () => run(p => sha256(serializeTrack(generateTrack({ ...p, autoJoin: 'legacy' }))), VERSION);
export default run05;
