import { generateTrack } from '../../src/core.ts';
import { serializeTrack } from '../../src/schema.ts';
import { sha256 } from '../../src/sha256.ts';
import { VERSION } from '../../src/version.ts';
import { runCases as run } from './cases.mjs';
export const run05 = () => run(p => sha256(serializeTrack(generateTrack(p))), VERSION);
export default run05;
