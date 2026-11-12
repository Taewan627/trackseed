// alexnieves-cs/drift-school track generator (MIT, TypeScript; jittered convex hull + midpoint displacement + Catmull-Rom smoothing, its own
// self-intersection / radius validation with up to 24 re-seeded attempts) -> polylines.
// Run: node adapters/gen_driftschool.mjs --build build [--limit N] [--stage 0..4]
//
// The generator's TypeScript files (src/track/{generate,build,validate,spline}.ts, src/shared/{rng,constants,hash,types}.ts) are TRANSPILED
// 1:1 (typescript.transpileModule, module=commonjs, no other transform) into build/third_party/drift-school-js/ and loaded from there;
// their source is not edited. src/track/baseline.ts (needs the vehicle simulator) is not used.
// Call: generateTrack({ seed, stage }) -> TrackSpec; polyline = spec.samples[i].(x, z) (SAMPLE_SPACING = 0.1 along the centre line;
// n distinct vertices, implicit closure), width = STAGE_WIDTH[stage] = 2.2, 1.5, 1.0, 0.8, 0.75 (the nominal value of src/shared/constants.ts).
// Units: the game's world units (metres of a toy-scale car simulator; track length 15..150).
// Seeding: generateTrack takes the seed as its public argument (own sfc32 RNG, no Math.random). Failure handling of the generator itself: after
// 24 failed attempts it returns a 'fallbackOval' (a stadium shape, counted in generatorStats.fallbacks). Such fallbacks are NOT random-generator
// output: they are excluded from the polylines and listed in failures.tsv as 'fallback oval'.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const build = resolve(args.build ?? join(here, '..', 'build'));
const stage = Number(args.stage ?? 2);
const limit = args.limit ? Number(args.limit) : undefined;
const requireRepo = createRequire(join(here, '..', '..', '..', 'package.json'));
const ts = requireRepo('typescript');
const src = join(build, 'third_party', 'drift-school', 'src');
const dst = join(build, 'third_party', 'drift-school-js');
mkdirSync(join(dst, 'track'), { recursive: true }); mkdirSync(join(dst, 'shared'), { recursive: true });
writeFileSync(join(dst, 'package.json'), '{"type":"commonjs"}\n');
for (const f of ['track/generate', 'track/build', 'track/validate', 'track/spline', 'shared/rng', 'shared/constants', 'shared/hash', 'shared/types']) {
  const p = join(src, f + '.ts');
  if (!existsSync(p)) { if (f === 'shared/types') continue; throw new Error('missing ' + p); }
  const out = ts.transpileModule(readFileSync(p, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  writeFileSync(join(dst, f + '.js'), out.outputText);
}
const gen = requireRepo(join(dst, 'track', 'generate.js'));
const consts = requireRepo(join(dst, 'shared', 'constants.js'));
const seeds = JSON.parse(readFileSync(join(build, 'seeds.json'), 'utf8')).slice(0, limit);
const source = `gen-driftschool-s${stage}`;
const dir = join(build, 'polylines', source); mkdirSync(dir, { recursive: true });
const rows = [], fails = [];
for (const seed of seeds) {
  const before = gen.generatorStats.fallbacks;
  let spec;
  try { spec = gen.generateTrack({ seed, stage }); } catch (e) { fails.push([`s${seed}`, `${e.name}: ${String(e.message).slice(0, 80)}`]); continue; }
  if (gen.generatorStats.fallbacks !== before) { fails.push([`s${seed}`, 'fallback oval (generator gave up after 24 attempts)']); continue; }
  const pts = spec.samples.map(s => [s.x, s.z]);
  const width = consts.STAGE_WIDTH[stage]; // nominal stage width (the generator widens the road by up to 12 % in tight corners: loopFromControl)
  const d = pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); });
  const ds = [...d].sort((a, b) => a - b), mid = ds.length >> 1;
  const med = ds.length % 2 ? ds[mid] : (ds[mid - 1] + ds[mid]) / 2;
  const id = `s${seed}`;
  const closed = pts.length >= 4 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
  writeFileSync(join(dir, id + '.json'), JSON.stringify({ source, id, unit: 'u', width, closed: true, points: pts }) + '\n');
  rows.push([id, pts.length, width, 'u', d.reduce((a, b) => a + b, 0), med, 0, `seed ${seed}; stage ${stage}${closed ? '; last point repeats first' : ''}; generator length ${spec.length}`]);
}
writeFileSync(join(dir, 'manifest.tsv'), ['id\tn_points\twidth\tunit\tlength\tmedian_spacing\tclosing_vertex_dropped\tnote', ...rows.map(r => r.join('\t'))].join('\n') + '\n');
writeFileSync(join(dir, 'failures.tsv'), ['id\treason', ...fails.map(r => r.join('\t'))].join('\n') + '\n');
console.log(`[${source}] wrote ${rows.length} polylines, ${fails.length} generator failures -> ${dir}`);
