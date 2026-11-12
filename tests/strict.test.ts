import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULTS, LIMITS, ParameterError, generateTrack, strictParams, type Params } from '../src/core.js';
import { serializeTrack } from '../src/schema.js';

const CLI = join(process.cwd(), 'cli-dist', 'cli.js');
const CLI_HINT = '; see "tracklab generate --help" for ranges';
const BAD: [string, Record<string, unknown>, RegExp][] = [
  ['unknown key', { seed: 1, turbo: 1 }, /unknown parameter "turbo"/],
  ['number below range', { curves: 2 }, /parameter "curves" = 2 is not valid \(sanitized to 3/],
  ['number above range', { width: 81 }, /parameter "width" = 81 is not valid \(sanitized to 80/],
  ['negative seed', { seed: -1 }, /parameter "seed" = -1 is not valid/],
  ['fraction where sanitize() rounds (height)', { height: 20.5 }, /parameter "height" = 20\.5 is not valid \(sanitized to 21/],
  ['fraction where sanitize() rounds (seed)', { seed: 1.5 }, /parameter "seed" = 1\.5 is not valid/],
  ['straight out of range', { straight: 0.61 }, /parameter "straight" = 0\.61 is not valid \(sanitized to 0\.6/],
  ['numeric string for a number', { curves: '6' }, /parameter "curves" must be a finite number, got "6"/],
  ['NaN', { density: NaN }, /parameter "density" must be a finite number, got null/],
  ['Infinity', { height: Infinity }, /parameter "height" must be a finite number/],
  ['undefined value', { height: undefined }, /parameter "height" must be a finite number, got undefined/],
  ['number for an enum', { scene: 3 }, /parameter "scene" must be a string, got 3/],
  ['unknown scene', { scene: 'desert' }, /parameter "scene" = "desert" is not valid \(sanitized to "mixed"/],
  ['unknown cornerPattern', { cornerPattern: 'loop' }, /parameter "cornerPattern" = "loop" is not valid/],
  ['unknown autoJoin', { autoJoin: 'smooth' }, /parameter "autoJoin" = "smooth" is not valid/],
  ['autoJoin inert for a spliced pattern', { cornerPattern: 'hairpin', cornerCount: 1, autoJoin: 'tangent' }, /parameter "autoJoin" = "tangent" is not valid \(sanitized to "legacy"/],
];
const GOOD: Record<string, unknown>[] = [
  {}, { seed: 7 }, { curves: 10, straight: 0.6, width: 80, size: 3, height: 200, obstacles: 8, density: 20 },
  { curves: 3, straight: 0, width: 20, size: 1, height: 0, obstacles: 0, density: 0, seed: 2147483647 },
  { straight: 0.123 }, { height: 82 }, { scene: 'city', cornerPattern: 'hairpin', cornerCount: 1, cornerStrength: 80 },
  { autoJoin: 'legacy' }, { autoJoin: 'tangent', straight: 0.3 }, { cornerPattern: 's-curve', cornerCount: 0, autoJoin: 'tangent' },
];

test('strict: default behaviour is unchanged (out-of-range and unknown input is still clamped and ignored)', () => {
  const loose = serializeTrack(generateTrack({ curves: 100, height: 20.5, width: -5 } as Partial<Params>));
  assert.equal(serializeTrack(generateTrack({ curves: 100, height: 20.5, width: -5 } as Partial<Params>, {})), loose);
  assert.equal(serializeTrack(generateTrack({ curves: 100, height: 20.5, width: -5 } as Partial<Params>, { strict: false })), loose);
  assert.equal(generateTrack({ curves: 100 }).params.curves, LIMITS.curves[1]);
  assert.doesNotThrow(() => generateTrack({ turbo: 1 } as unknown as Partial<Params>));
});

test('strict: valid input generates the same track as the default mode', () => {
  for (const g of GOOD) assert.equal(serializeTrack(generateTrack(g as Partial<Params>, { strict: true })), serializeTrack(generateTrack(g as Partial<Params>)), JSON.stringify(g));
});

test('strict: every out-of-range, off-grid, mistyped or unknown parameter throws a ParameterError with a clear English message', () => {
  for (const [name, input, pattern] of BAD) {
    assert.throws(() => generateTrack(input as Partial<Params>, { strict: true }), (e: unknown) =>
      e instanceof ParameterError && e.name === 'ParameterError' && pattern.test(e.message) && e.message.startsWith('generateTrack (strict): ') && !/[^\x00-\x7f]/.test(e.message), name);
  }
  for (const bad of [null, 5, 'x', [1]]) assert.throws(() => generateTrack(bad as never, { strict: true }), ParameterError);
  assert.equal(strictParams({}, 'x').seed, DEFAULTS.seed);
});

test('strict: the CLI rejects exactly what the library rejects (same function), with the same message, and accepts exactly the same input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracklab-strict-'));
  try {
    const run = (input: Record<string, unknown>) => {
      const file = join(dir, 'p.json'); writeFileSync(file, JSON.stringify(input, (_k, v) => v === undefined ? '__undefined__' : v));
      return spawnSync(process.execPath, [CLI, 'generate', '--params', file], { encoding: 'utf8', maxBuffer: 1 << 28 });
    };
    for (const [name, input] of BAD) {
      if ('height' in input && input.height === undefined) continue;                 // JSON cannot carry undefined
      if (Object.values(input).some(v => typeof v === 'number' && !Number.isFinite(v))) continue; // nor NaN / Infinity
      const r = run(input);
      assert.equal(r.status, 2, name);
      let message = '';
      try { strictParams(input, 'parameters', CLI_HINT); } catch (e) { message = (e as Error).message; }
      assert.ok(message.length > 0, name); assert.ok(r.stderr.includes(`tracklab: ${message}\n`), `${name}: ${r.stderr}`);
    }
    for (const input of GOOD) {
      const r = run(input);
      assert.equal(r.status, 0, `${JSON.stringify(input)}: ${r.stderr}`);
      assert.equal(r.stdout, serializeTrack(generateTrack(input as Partial<Params>, { strict: true })) + '\n', JSON.stringify(input));
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
