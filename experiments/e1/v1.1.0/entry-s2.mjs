// S2: v1.1.0 with the legacy join (the v1.0.0 construction).
import { generateTrack } from '../../../src/core.ts';
import { canonicalStringify, serializeTrack } from '../../../src/schema.ts';
import { sha256 } from '../../../src/sha256.ts';
import { VERSION } from '../../../src/version.ts';
import { measure } from './measure.mjs';
export const runSubject = () => measure({ generateTrack: p => generateTrack({ ...p, autoJoin: 'legacy' }), canonicalStringify, serializeTrack, sha256 }, VERSION);
