import { generateTrack } from '../../../src/core.ts';
import { canonicalStringify, serializeTrack } from '../../../src/schema.ts';
import { sha256 } from '../../../src/sha256.ts';
import { VERSION } from '../../../src/version.ts';
import { measure } from './measure.mjs';
export const runSubject = () => measure({ generateTrack, canonicalStringify, serializeTrack, sha256 }, VERSION);
