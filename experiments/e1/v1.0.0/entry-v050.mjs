// Generator of the 0.5.0 tree (commit 145277e), reached through the esbuild alias @v050 (see build.sh).
import { generateTrack } from '@v050/core.ts';
import { canonicalStringify, serializeTrack } from '@v050/schema.ts';
import { sha256 } from '@v050/sha256.ts';
import { VERSION } from '@v050/version.ts';
import { measure } from './measure.mjs';
export const runSubject = () => measure({ generateTrack, canonicalStringify, serializeTrack, sha256 }, VERSION);
