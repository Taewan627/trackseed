// Effect of the 0.5.0 -> 0.5.1 version stamp on E1's v0.5 document digests (E1 results are not modified).
import { readFileSync } from 'node:fs';
import { generateTrack } from '../../src/core.ts';
import { serializeTrack } from '../../src/schema.ts';
import { sha256 } from '../../src/sha256.ts';
import { CASES } from '../e1/cases.mjs';
const rec = JSON.parse(readFileSync('../e1/results/node22.v05.json', 'utf8')); // run with cwd experiments/amendment-01
const old = new Map(rec.cases.map(c => [c.id, c.digest]));
let same = 0, differ = 0;
// v1.1: pin the v1.0.0 join so committed results reproduce (docs/generator-auto-join.md)
for (const c of CASES) { if (sha256(serializeTrack(generateTrack({ ...c.params, autoJoin: 'legacy' }))) === old.get(c.id)) same++; else differ++; }
console.log(JSON.stringify({ e1RecordedGeneratorVersion: rec.generatorVersion, cases: CASES.length, digestEqualToE1Record: same, digestDiffersFromE1Record: differ }));
