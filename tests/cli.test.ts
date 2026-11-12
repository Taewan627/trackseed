import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseTrackDocument } from '../src/schema.js';

const CLI = join(process.cwd(), 'cli-dist', 'cli.js');
const run = (args: string[], cwd?: string) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', cwd, maxBuffer: 1 << 28 });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const tmp = () => mkdtempSync(join(tmpdir(), 'trackseed-cli-'));

test('cli: --help for the program and every command, exit 0 and a Usage line', () => {
  for (const args of [['--help'], ['generate', '--help'], ['batch', '--help'], ['validate', '--help'], ['metrics', '--help']]) {
    const r = run(args); assert.equal(r.code, 0, args.join(' ')); assert.match(r.out, /Usage:/);
  }
  assert.equal(run([]).code, 2);
  const bad = run(['frobnicate']); assert.equal(bad.code, 2); assert.match(bad.err, /unknown command/);
});

test('cli: a reader that closes stdout early (EPIPE) ends quietly with status 0 and no stack trace', async () => {
  // generate prints about 108 KB, more than a pipe buffer, so the write reaches a pipe with no reader
  const child = spawn(process.execPath, [CLI, 'generate', '--seed', '1'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  child.stderr.setEncoding('utf8').on('data', d => { err += d; });
  child.stdout.destroy(); // no reader is left for the pipe (as in `generate | head -c 10` after the first bytes)
  const code = await new Promise<number | null>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  assert.equal(code, 0); assert.equal(err, '');
});

test('cli: generate -> validate -> metrics round trip, exit codes, stdout vs --out', () => {
  const dir = tmp();
  try {
    const file = join(dir, 'a.json');
    assert.equal(run(['generate', '--seed', '5', '--set', 'curves=7', 'straight=0.3', '--out', file]).code, 0);
    const doc = parseTrackDocument(readFileSync(file, 'utf8'));
    assert.equal(doc.params.seed, 5); assert.equal(doc.params.curves, 7); assert.equal(doc.params.straight, 0.3);
    const viaStdout = run(['generate', '--seed', '5', '--set', 'curves=7', '--set', 'straight=0.3']);
    assert.equal(viaStdout.code, 0); assert.equal(viaStdout.out, readFileSync(file, 'utf8'));
    // --params file gives the same document
    const pf = join(dir, 'p.json'); writeFileSync(pf, JSON.stringify({ curves: 7, straight: 0.3 }));
    assert.equal(run(['generate', '--params', pf, '--seed', '5']).out, readFileSync(file, 'utf8'));

    const v = run(['validate', file, '--verify', 'regenerate']);
    assert.ok(v.code === 0 || v.code === 1, `validate exit ${v.code}: ${v.err}`);
    const report = JSON.parse(v.out) as { ok: boolean; digest: string; violations: { severity: string }[]; checks: unknown[] };
    assert.equal(report.digest, doc.integrity.digest); assert.equal(report.checks.length, 8); // seven v1.0.0 checks plus local-kink (default closureTangentMode 'kink')
    assert.equal(v.code === 0, report.ok);
    assert.equal(report.ok, !report.violations.some(x => x.severity === 'error'));

    const m = run(['metrics', file]); assert.equal(m.code, 0);
    const metrics = JSON.parse(m.out) as { length: number; curvature?: number[]; totalTurningDegrees: number };
    assert.ok(Math.abs(metrics.length - doc.geometry.length) < 1e-6 * doc.geometry.length);
    assert.equal(metrics.curvature, undefined);
    // absolute turning of a closed loop is >= 360; the tangent join may add a small S-bend near a straight (docs/generator-auto-join.md)
    assert.ok(metrics.totalTurningDegrees >= 360 - 1e-6 && metrics.totalTurningDegrees < 540);
    const withSamples = JSON.parse(run(['metrics', file, '--samples']).out) as { curvature: number[] };
    assert.equal(withSamples.curvature.length, doc.geometry.points.length - 1);
    assert.deepEqual(JSON.parse(run(['metrics', file]).out), metrics, 'metrics deterministic');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('cli: validate exit code 1 for a document with error violations, 2 for invalid documents', () => {
  const dir = tmp();
  try {
    // the default (autoJoin tangent) is valid; the legacy v1.0.0 join is the known source of error-severity violations
    let bad: string | undefined, good: string | undefined;
    for (let seed = 1; seed <= 12 && !(bad && good); seed++) {
      const f = join(dir, `s${seed}.json`), g = join(dir, `g${seed}.json`);
      run(['generate', '--seed', String(seed), '--set', 'autoJoin=legacy', '--out', f]);
      run(['generate', '--seed', String(seed), '--out', g]);
      if (run(['validate', f]).code === 1 && !bad) bad = f;
      if (run(['validate', g]).code === 0 && !good) good = g;
    }
    assert.ok(bad, 'expected at least one legacy-join track of seeds 1..12 to violate');
    assert.ok(good, 'expected at least one default-join track of seeds 1..12 to validate');
    const strict = run(['validate', bad!, '--limit', 'tangentToleranceDegrees=1000', '--limit', 'foldEpsilon=-1e9', '--limit', 'closureTolerance=1e9']);
    assert.ok(strict.code === 0 || strict.code === 1);
    if (good) assert.equal(run(['validate', good, '--strict', '--limit', 'maxSlope=1e9', '--limit', 'minRadiusToHalfWidth=0']).code, 0);

    // invalid documents -> 2
    const notJson = join(dir, 'x.json'); writeFileSync(notJson, '{nope');
    assert.equal(run(['validate', notJson]).code, 2);
    assert.equal(run(['validate', join(dir, 'missing.json')]).code, 2);
    const tampered = join(dir, 't.json'); const doc = JSON.parse(readFileSync(bad!, 'utf8'));
    doc.geometry.points[3].x += 1; writeFileSync(tampered, JSON.stringify(doc));
    const t = run(['validate', tampered]); assert.equal(t.code, 2); assert.match(t.err, /digest mismatch/);
    assert.equal(run(['metrics', tampered]).code, 2);
    assert.equal(run(['validate', bad!, '--verify', 'bogus']).code, 2);
    assert.equal(run(['validate']).code, 2);
    // out-of-range / unknown parameters are rejected, not clamped
    assert.equal(run(['generate', '--set', 'curves=99']).code, 2);
    assert.equal(run(['generate', '--set', 'nope=1']).code, 2);
    assert.equal(run(['generate', '--seed', 'x']).code, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('cli: batch on examples/grid-small.json writes N documents and N JSONL lines, digests identical on a second run', () => {
  const dir = tmp();
  try {
    const grid = JSON.parse(readFileSync('examples/grid-small.json', 'utf8')) as { seeds: { from: number; to: number }; params: Record<string, unknown[] | unknown> };
    const expected = (grid.seeds.to - grid.seeds.from + 1) * Object.values(grid.params).reduce<number>((a, v) => a * (Array.isArray(v) ? v.length : 1), 1);
    const out1 = join(dir, 'run1'), out2 = join(dir, 'run2');
    const r1 = run(['batch', '--grid', 'examples/grid-small.json', '--out', out1, '--jsonl', join(dir, 's1.jsonl')]);
    assert.equal(r1.code, 0, r1.err);
    const r2 = run(['batch', '--grid', 'examples/grid-small.json', '--out', out2, '--jsonl', join(dir, 's2.jsonl')]);
    assert.equal(r2.code, 0);
    const lines = (f: string) => readFileSync(join(dir, f), 'utf8').trim().split('\n').map(l => JSON.parse(l) as Record<string, any>);
    const a = lines('s1.jsonl'), b = lines('s2.jsonl');
    assert.equal(a.length, expected); assert.equal(b.length, expected);
    const generated = a.filter(l => l.generated);
    assert.ok(generated.length > 0);
    assert.equal(readdirSync(out1).length, generated.length); assert.equal(readdirSync(out2).length, generated.length);
    assert.deepEqual(a.map(l => l.digest), b.map(l => l.digest));
    assert.ok(a.some(l => l.params.cornerPattern !== 'auto'), 'grid includes pattern modes');
    for (const l of a) {
      assert.ok(l.timing && typeof l.timing.generation_ms === 'number' && l.timing.generation_ms >= 0);
      assert.deepEqual(Object.keys(l).filter(k => k.includes('_ms')), [], 'timing only under "timing"');
      if (!l.generated) { assert.equal(l.digest, null); assert.ok(l.error); continue; }
      assert.equal(typeof l.ok, 'boolean'); assert.ok(Array.isArray(l.violationCodes)); assert.ok(l.metrics.length > 0);
      assert.equal(l.metrics.curvature, undefined);
      assert.equal(l.file, `case-${String(l.case).padStart(4, '0')}-seed${l.seed}.json`);
      const text = readFileSync(join(out1, l.file), 'utf8');
      assert.equal(parseTrackDocument(text).integrity.digest, l.digest);
      assert.equal(text, readFileSync(join(out2, l.file), 'utf8'), 'documents byte-identical across runs');
    }
    // with --no-timing the whole JSONL is byte-identical across runs
    const n1 = join(dir, 'n1.jsonl'), n2 = join(dir, 'n2.jsonl');
    run(['batch', '--grid', 'examples/grid-small.json', '--out', join(dir, 'n1'), '--jsonl', n1, '--no-timing']);
    run(['batch', '--grid', 'examples/grid-small.json', '--out', join(dir, 'n2'), '--jsonl', n2, '--no-timing']);
    assert.equal(readFileSync(n1, 'utf8'), readFileSync(n2, 'utf8'));
    assert.ok(!readFileSync(n1, 'utf8').includes('generation_ms'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('cli: batch rejects invalid grids with exit 2 and writes nothing', () => {
  const dir = tmp();
  try {
    const bad = (grid: unknown) => { const f = join(dir, 'g.json'); writeFileSync(f, JSON.stringify(grid)); const out = join(dir, 'out'); const r = run(['batch', '--grid', f, '--out', out]); return { code: r.code, wrote: (() => { try { return readdirSync(out).length; } catch { return 0; } })() }; };
    for (const grid of [{ seeds: { from: 1, to: 2 }, params: { curves: [99] } }, { seeds: { from: 3, to: 1 } }, { seeds: [1], params: { seed: [1] } },
      { seeds: [1], params: { bogus: [1] } }, { seeds: [1], params: { curves: [] } }, { params: {} }, { seeds: [1], extra: 1 }, []]) {
      const r = bad(grid); assert.equal(r.code, 2, JSON.stringify(grid)); assert.equal(r.wrote, 0);
    }
    mkdirSync(join(dir, 'unused'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('cli: --closure-tangent-mode and --seam-ratio on validate and batch', () => {
  const dir = tmp();
  try {
    // Seed 36 with a hairpin pattern has one seam heading change above 5 degrees that the ratio rule accepts.
    const file = join(dir, 'seam.json');
    assert.equal(run(['generate', '--seed', '36', '--set', 'cornerPattern=hairpin', 'curves=10', 'cornerCount=2', '--out', file]).code, 0);
    const codes = (r: { out: string }) => (JSON.parse(r.out) as { violations: { code: string }[] }).violations.map(v => v.code);
    const def = run(['validate', file]), ratio = run(['validate', file, '--closure-tangent-mode', 'ratio']);
    assert.equal(ratio.code, 0); assert.equal(def.code, 0); // the default is 'kink' (validator v1.1); both accept this track
    assert.ok(!codes(def).includes('CLOSURE_TANGENT'));
    assert.equal(run(['validate', file, '--closure-tangent-mode', 'kink']).out, def.out, 'kink is the default');
    const abs = run(['validate', file, '--closure-tangent-mode=absolute']);
    assert.equal(abs.code, 1); assert.ok(codes(abs).includes('CLOSURE_TANGENT'));
    // seam-ratio 0 makes the ratio rule equal to the absolute limit; a large ratio never fires; same as --limit seamRatio=
    const R = ['--closure-tangent-mode', 'ratio'];
    assert.equal(run(['validate', file, ...R, '--seam-ratio', '0']).code, 1);
    assert.equal(run(['validate', file, ...R, '--seam-ratio', '2']).out, ratio.out);
    assert.equal(run(['validate', file, ...R, '--seam-ratio', '5']).out, run(['validate', file, ...R, '--limit', 'seamRatio=5']).out);
    // --seam-ratio applies only to mode ratio: without it (default kink) or with another mode it is a usage error (exit 2)
    const seamErr = run(['validate', file, '--seam-ratio', '2']);
    assert.equal(seamErr.code, 2); assert.match(seamErr.err, /--seam-ratio applies only to --closure-tangent-mode ratio/);
    assert.equal(run(['validate', file, '--closure-tangent-mode', 'absolute', '--seam-ratio', '2']).code, 2);
    const csv = join(dir, 'circle.csv');
    writeFileSync(csv, 'x,z\n' + Array.from({ length: 60 }, (_, i) => `${50 * Math.cos(2 * Math.PI * i / 60)},${50 * Math.sin(2 * Math.PI * i / 60)}`).join('\n') + '\n');
    assert.equal(run(['validate-polyline', csv, '--width', '12', '--seam-ratio', '2']).code, 2);
    assert.equal(run(['validate-polyline', csv, '--width', '12', '--closure-tangent-mode', 'kink']).code, 0);
    // --limit seamRatio=N is the same option: outside mode ratio it would be silently ignored, so it is a usage error too
    for (const args of [['--limit', 'seamRatio=3'], ['--closure-tangent-mode', 'absolute', '--limit', 'seamRatio=3']]) {
      const r = run(['validate', file, ...args]); assert.equal(r.code, 2, args.join(' '));
      assert.match(r.err, /--limit seamRatio applies only to --closure-tangent-mode ratio/);
    }
    assert.equal(run(['validate-polyline', csv, '--width', '12', '--limit', 'seamRatio=2']).code, 2);
    assert.equal(run(['validate', file, ...R, '--limit', 'seamRatio=5']).code, 0);
    // Errors: bad mode, bad ratio, conflicting spec, non-numeric limit
    for (const bad of [['--closure-tangent-mode', 'sloppy'], [...R, '--seam-ratio', 'x'], [...R, '--seam-ratio', '-1'],
      [...R, '--seam-ratio', '3', '--limit', 'seamRatio=3'], ['--limit', 'closureTangentMode=absolute']]) {
      const r = run(['validate', file, ...bad]); assert.equal(r.code, 2, bad.join(' ')); assert.match(r.err, /trackseed:/);
    }
    // batch: same options, summary reflects the mode; documents and digests are unaffected.
    const grid = join(dir, 'g.json');
    writeFileSync(grid, JSON.stringify({ seeds: [36], params: { cornerPattern: 'hairpin', curves: 10, cornerCount: 2 } }));
    const line = (args: string[]) => {
      const out = join(dir, 'o-' + args.join('_').replace(/[^\w]/g, '')), jl = out + '.jsonl';
      const r = run(['batch', '--grid', grid, '--out', out, '--jsonl', jl, '--no-timing', ...args]); assert.equal(r.code, 0, r.err);
      return JSON.parse(readFileSync(jl, 'utf8').trim()) as { ok: boolean; violationCodes: string[]; digest: string; checkFailures: Record<string, number> };
    };
    const d = line([]), a = line(['--closure-tangent-mode', 'absolute']), s0 = line(['--closure-tangent-mode', 'ratio', '--seam-ratio', '0']);
    assert.equal(d.ok, true); assert.equal(a.ok, false); assert.ok(a.violationCodes.includes('CLOSURE_TANGENT'));
    assert.equal(s0.ok, false); assert.equal(a.digest, d.digest);
    assert.equal(run(['batch', '--grid', grid, '--out', join(dir, 'x'), '--closure-tangent-mode', 'nope']).code, 2);
    assert.match(run(['validate', '--help']).out, /--closure-tangent-mode/); assert.match(run(['batch', '--help']).out, /--seam-ratio/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
