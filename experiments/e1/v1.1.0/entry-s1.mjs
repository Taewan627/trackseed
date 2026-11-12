// S1: v1.1.0 with the default join (autoJoin is not passed; 'tangent' where the join is not inert).
import { generateTrack } from '../../../src/core.ts';
import { canonicalStringify, serializeTrack } from '../../../src/schema.ts';
import { sha256 } from '../../../src/sha256.ts';
import { VERSION } from '../../../src/version.ts';
import { measure } from './measure.mjs';
export const runSubject = () => measure({ generateTrack, canonicalStringify, serializeTrack, sha256 }, VERSION);
