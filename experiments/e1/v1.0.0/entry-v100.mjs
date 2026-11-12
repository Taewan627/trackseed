import { generateTrack } from '../../../src/core.ts';
import { canonicalStringify, serializeTrack } from '../../../src/schema.ts';
import { sha256 } from '../../../src/sha256.ts';
import { VERSION } from '../../../src/version.ts';
import { measure } from './measure.mjs';
// v1.1: pin the v1.0.0 join so committed results reproduce (docs/generator-auto-join.md)
export const runSubject = () => measure({ generateTrack: p => generateTrack({ ...p, autoJoin: 'legacy' }), canonicalStringify, serializeTrack, sha256 }, VERSION);
