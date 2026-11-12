// Writes build/seeds.json: the 1000 registered seeds of E5 (experiments/e5/adapter.mjs; sha256 of the JSON list is pinned there).
// E9 reuses exactly this list for every third-party generator so that seeds are comparable across experiments.
import { SEEDS } from '../../e5/adapter.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'build');
mkdirSync(out, { recursive: true });
const text = JSON.stringify(SEEDS);
const sha = createHash('sha256').update(text).digest('hex');
if (sha !== '6fc50bc3d1fad596f5593ee17116c15992c0c16b702e8d0b4da2abe1fcbcc095') throw new Error('seed list differs from the E5 registration: ' + sha);
writeFileSync(join(out, 'seeds.json'), text + '\n');
console.log(`seeds.json: ${SEEDS.length} seeds, sha256 ${sha}`);
