import test from 'node:test';
import assert from 'node:assert/strict';
import { DPI, datan, datan2, dcos, dexp, dhypot, dsin } from '../src/detmath.js';

// Small seeded PRNG local to the test (xorshift32) so inputs never depend on src.
function stream(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const view = new DataView(new ArrayBuffer(8));
const bits = (v: number) => { view.setFloat64(0, v); return view.getBigUint64(0).toString(16).padStart(16, '0'); };

test('detmath: sin/cos agree with Math.* within 1e-14 on 200k seeded inputs, |x| <= 1e4', () => {
  const r = stream(0xc0ffee);
  let maxSin = 0, maxCos = 0;
  for (let i = 0; i < 200000; i++) {
    const x = (r() * 2 - 1) * (i % 4 === 0 ? 1e4 : i % 4 === 1 ? 100 : i % 4 === 2 ? 10 : 1);
    maxSin = Math.max(maxSin, Math.abs(dsin(x) - Math.sin(x)));
    maxCos = Math.max(maxCos, Math.abs(dcos(x) - Math.cos(x)));
  }
  assert.ok(maxSin <= 1e-14, `sin max error ${maxSin}`); assert.ok(maxCos <= 1e-14, `cos max error ${maxCos}`);
  t_diag({ maxSin, maxCos });
});

test('detmath: sin/cos stay within 1e-14 for the whole range TrackSeed can feed them (seed*0.02 <= 4.3e7) and up to 2^33', () => {
  const r = stream(31337);
  for (const range of [1e5, 1e6, 4.3e7, 1e9, 8e9]) {
    let m = 0;
    for (let i = 0; i < 50000; i++) {
      const x = (r() * 2 - 1) * range;
      m = Math.max(m, Math.abs(dsin(x) - Math.sin(x)), Math.abs(dcos(x) - Math.cos(x)));
    }
    assert.ok(m <= 1e-14, `range ${range}: max error ${m}`);
  }
  // Every seed-scaled phase used by elevation() at the extremes of the seed range.
  for (const seed of [0, 1, 7, 99999, 2147483646, 2147483647]) for (const k of [0.01, 0.02]) {
    const x = seed * k + 25.132741228718345;
    assert.ok(Math.abs(dsin(x) - Math.sin(x)) <= 1e-14 && Math.abs(dcos(x) - Math.cos(x)) <= 1e-14);
  }
});

test('detmath: sin/cos edge cases (zeros, multiples of pi/2, large and tiny arguments)', () => {
  assert.ok(Object.is(dsin(0), 0) && Object.is(dsin(-0), -0) && dcos(0) === 1 && dcos(-0) === 1);
  for (let k = -4000; k <= 4000; k++) {
    const x = k * DPI / 2;
    assert.ok(Math.abs(dsin(x) - Math.sin(x)) <= 1e-14 && Math.abs(dcos(x) - Math.cos(x)) <= 1e-14, `k=${k}`);
  }
  for (const x of [1e-300, 5e-324, 1e-9, -1e-9, 1e4, -1e4, 9999.999999, DPI, -DPI, 2 * DPI, 1e5, 1e6, 2147483647 * 0.02]) {
    const tol = 1e-14;
    assert.ok(Math.abs(dsin(x) - Math.sin(x)) <= tol && Math.abs(dcos(x) - Math.cos(x)) <= tol, `x=${x}`);
  }
  for (const x of [NaN, Infinity, -Infinity]) assert.ok(Number.isNaN(dsin(x)) && Number.isNaN(dcos(x)));
  // sin^2 + cos^2 = 1 on a deterministic sweep.
  for (let i = 0; i < 5000; i++) { const x = i * 0.37 - 900; assert.ok(Math.abs(dsin(x) ** 2 + dcos(x) ** 2 - 1) < 1e-14); }
});

test('detmath: atan2 agrees with Math.atan2 within 1e-14 over the full domain (all quadrants, 200k inputs)', () => {
  const r = stream(0xbeef);
  let max = 0; const quadrants = new Set<string>();
  for (let i = 0; i < 200000; i++) {
    const scale = (u: number) => (u * 2 - 1) * Math.pow(10, (r() * 2 - 1) * 12);
    const y = scale(r()), x = scale(r());
    max = Math.max(max, Math.abs(datan2(y, x) - Math.atan2(y, x)));
    quadrants.add(`${Math.sign(y)}${Math.sign(x)}`);
  }
  assert.equal(quadrants.size, 4); assert.ok(max <= 1e-14, `atan2 max error ${max}`);
  // Extreme ratios and subnormals.
  for (const [y, x] of [[1e300, 1e-300], [1e-300, 1e300], [5e-324, 1], [1, 5e-324], [-5e-324, -1], [Number.MAX_VALUE, 1], [1, Number.MAX_VALUE]])
    assert.ok(Math.abs(datan2(y, x) - Math.atan2(y, x)) <= 1e-14, `${y},${x}`);
  t_diag({ atan2Max: max });
});

test('detmath: atan2 special values match ECMAScript exactly (zeros, infinities, NaN)', () => {
  const specials = [0, -0, 1, -1, Infinity, -Infinity, 2.5, -2.5];
  for (const y of specials) for (const x of specials) {
    const got = datan2(y, x), want = Math.atan2(y, x);
    assert.ok(Object.is(got, want) || Math.abs(got - want) <= 1e-15, `atan2(${y}, ${x}) = ${got}, want ${want}`);
  }
  for (const y of [0, -0]) for (const x of [0, -0, 1, -1]) assert.ok(Object.is(datan2(y, x), Math.atan2(y, x)), `signed zero ${y},${x}`);
  assert.ok(Number.isNaN(datan2(NaN, 1)) && Number.isNaN(datan2(1, NaN)));
  assert.ok(Math.abs(datan(1) - DPI / 4) < 1e-16); assert.ok(Math.abs(datan(Infinity) - DPI / 2) < 1e-15);
});

test('detmath: exp and hypot track Math.* (relative 1e-14) and handle limits', () => {
  const r = stream(77);
  let maxRel = 0, maxHyp = 0;
  for (let i = 0; i < 100000; i++) {
    const x = (r() * 2 - 1) * 60; maxRel = Math.max(maxRel, Math.abs(dexp(x) / Math.exp(x) - 1));
    const a = (r() * 2 - 1) * 1e4, b = (r() * 2 - 1) * 1e4, c = (r() * 2 - 1) * 1e4;
    maxHyp = Math.max(maxHyp, Math.abs(dhypot(a, b) / Math.hypot(a, b) - 1), Math.abs(dhypot(a, b, c) / Math.hypot(a, b, c) - 1));
  }
  assert.ok(maxRel <= 1e-14, `exp rel ${maxRel}`); assert.ok(maxHyp <= 1e-14, `hypot rel ${maxHyp}`);
  assert.equal(dexp(0), 1); assert.equal(dexp(710), Infinity); assert.equal(dexp(-746), 0); assert.ok(Number.isNaN(dexp(NaN)));
  assert.ok(Math.abs(dexp(709) / Math.exp(709) - 1) < 1e-14 && Math.abs(dexp(-740) / Math.exp(-740) - 1) < 1e-12);
  assert.equal(dhypot(), 0); assert.equal(dhypot(3, 4), 5); assert.equal(dhypot(-0, 0), 0);
  assert.equal(dhypot(NaN, Infinity), Infinity); assert.ok(Number.isNaN(dhypot(NaN, 1)));
  assert.ok(Math.abs(dhypot(3e200, 4e200) / 5e200 - 1) < 1e-15 && Math.abs(dhypot(3e-200, 4e-200) / 5e-200 - 1) < 1e-15);
});

// Bit-exact expected float64 values (IEEE-754 hex). Any engine/OS that evaluates
// the exact operations differently, or any edit to coefficients/evaluation order, breaks this table.
const TABLE: [string, number | number[], string][] = [
  ['dsin', 0.1, '3fb98eaecb8bcb2c'], ['dcos', 0.1, '3fefd712f9a817c1'],
  ['dsin', 1, '3feaed548f090cee'], ['dcos', 1, '3fe14a280fb5068c'],
  ['dsin', 2.5, '3fe326af0dcfcab0'], ['dcos', 2.5, 'bfe9a2f7ef858b7d'],
  ['dsin', -3.7, '3fe0f46aec2e1b41'], ['dcos', -3.7, 'bfeb23a2ad7dd937'],
  ['dsin', 100, 'bfe03425b78c4db8'], ['dcos', 100, '3feb981dbf665fdf'],
  ['dsin', 12345.678, 'bfe687d5890974a5'], ['dcos', 12345.678, '3fe6b94c3bbe24b8'],
  ['dsin', -9999.5, 'bfc819bf47e7fab4'], ['dcos', -9999.5, 'bfef6d7af2c56c13'],
  ['dsin', 6.283185307179586, 'bcb1a62633145c07'], ['dcos', 6.283185307179586, '3ff0000000000000'],
  ['dsin', 21474836.47, '3fe67174a923712e'], ['dcos', 21474836.47, 'bfe6cf66a09a875a'],
  ['dsin', 42949672.94, 'bfeffeec326bfce4'], ['dcos', 42949672.94, '3f909b5576db14a9'],
  ['dsin', -1234567890.125, 'bfeead4cd45299bd'], ['dcos', -1234567890.125, 'bfd2366ba81043a3'],
  ['datan2', [1, 2], '3fddac670561bb4f'], ['datan2', [-3, -4], 'c003fc176b7a8560'],
  ['datan2', [3, -4], '4003fc176b7a8560'], ['datan2', [-1, 5], 'bfc94441f8f7260c'],
  ['datan2', [0.001, -7], '400921b06e4e282f'], ['datan2', [0.3, 0.7], '3fd9e9bf3d20dc71'],
  ['dexp', 1, '4005bf0a8b14576a'], ['dexp', -2.5, '3fb50385c094f425'], ['dexp', 0.001, '3ff0041919b7ee34'],
  ['dexp', 10, '40d5829dcf950560'], ['dexp', -20.25, '3e1b93de1e27ca3b'],
  ['dhypot', [3, 4], '4014000000000000'], ['dhypot', [1, 1], '3ff6a09e667f3bcd'],
  ['dhypot', [0.5, 1.25, -2], '4003498c97b10540'],
];
test('detmath: bit-exact table of hard-coded float64 results', () => {
  const fns: Record<string, (...a: number[]) => number> = { dsin, dcos, datan2, dexp, dhypot };
  for (const [name, input, expected] of TABLE) {
    const args = Array.isArray(input) ? input : [input];
    assert.equal(bits(fns[name](...args)), expected, `${name}(${args.join(', ')})`);
  }
});

function t_diag(o: object) { console.log('# detmath ' + JSON.stringify(o)); }
