// Deterministic elementary functions.
//
// ECMAScript only requires Math.sin/cos/atan2/hypot/exp/pow/... to be
// "implementation-approximated", so two engines (or two OSes/libm builds) may
// return floats that differ in the last bits. Track generation must be
// bit-for-bit reproducible from a seed, therefore the generation path uses the
// functions below, which are written ONLY with operations that ECMAScript pins
// to IEEE-754 binary64 semantics:
//   + - * /  (correctly rounded, round-to-nearest-even),
//   Math.sqrt (IEEE-754 correctly rounded on every mainstream engine; this is
//              an ASSUMPTION: the spec text alone does not mandate it, but
//              V8, SpiderMonkey and JavaScriptCore all lower it to the
//              hardware/soft-float sqrt instruction),
//   Math.abs/min/max/floor/ceil/round/trunc/sign/fround/imul (exact).
// No call to Math.sin/cos/tan/atan/atan2/exp/log/pow/hypot/cbrt/... occurs
// here, and the `**` operator is avoided as well. The sin/cos kernels, atan and
// exp follow the algorithms and coefficients of fdlibm / FreeBSD msun, which are
// distributed under the following notice:
/*
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice 
 * is preserved.
 * ====================================================
 */
// Not all of this file is fdlibm: the argument reduction, datan2, dhypot and the
// 2^k scaling are project code. The per-routine derivation is listed in
// THIRD_PARTY_NOTICES.md. The evaluation order below is fixed, and JS never fuses
// multiply-add, so results are identical on every conforming engine.

/** Math.PI is a literal constant, hence deterministic. */
export const DPI = Math.PI;

const PIO2_HI = DPI / 2;
const PI_LO = 1.2246467991473532e-16; // pi - DPI

// ---- sin / cos -----------------------------------------------------------
const INV_PIO2 = 6.36619772367581382433e-01;
// pi/2 split into six pieces of 20 significant bits (pi/2 = sum to ~2^-120), so n * piece is an
// exact double product for |n| < 2^33. Generated with exact big-integer arithmetic (Machin's formula).
const PIO2_PARTS = [1.5707950592041016, 1.2675900507019833e-06, 7.443542310303641e-13,
  5.170176613476942e-19, 6.368316315668184e-25, 8.478304727057185e-32];

const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03,
  S3 = -1.98412698298579493134e-04, S4 = 2.75573137070700676789e-06,
  S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03,
  C3 = 2.48015872894767294178e-05, C4 = -2.75573143513906633035e-07,
  C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;

// |r| <= pi/4
function sinKernel(x: number): number {
  const z = x * x, v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  return x + v * (S1 + z * r);
}
function cosKernel(x: number): number {
  const z = x * x, hz = 0.5 * z;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  const w = 1 - hz;
  return w + ((1 - w) - hz + z * r);
}

const REDUCE_LIMIT = 8589934592; // 2^33: n = round(x*2/pi) must have <= 33 bits for exact products

// Returns the quadrant n (mod 4, in 0..3) and writes the reduced argument to `reduced[0]`
// (|r| <= ~pi/4). Cody-Waite reduction with exactly representable pieces of pi/2. Accuracy is
// ~1e-15 absolute for |x| <= 2^33 (~8.6e9); TrackLab's largest argument is ~4.3e7 (seed*0.02).
// Beyond 2^33 the argument is first folded with the exact IEEE remainder `%` (deterministic, but
// accuracy degrades roughly like |x|*1e-16 there).
const reduced = [0];
function reduce(x: number): number {
  if (Math.abs(x) > REDUCE_LIMIT) x = x % (2 * DPI);
  const n = Math.round(x * INV_PIO2);
  let r = x;
  for (let i = 0; i < PIO2_PARTS.length; i++) r = r - n * PIO2_PARTS[i];
  reduced[0] = r;
  return ((n % 4) + 4) % 4;
}

export function dsin(x: number): number {
  if (!Number.isFinite(x)) return NaN;
  if (Math.abs(x) < 0.7853981633974483) return Math.abs(x) < 3.725290298461914e-9 ? x : sinKernel(x);
  const q = reduce(x), r = reduced[0];
  return q === 0 ? sinKernel(r) : q === 1 ? cosKernel(r) : q === 2 ? -sinKernel(r) : -cosKernel(r);
}

export function dcos(x: number): number {
  if (!Number.isFinite(x)) return NaN;
  if (Math.abs(x) < 0.7853981633974483) return cosKernel(x);
  const q = reduce(x), r = reduced[0];
  return q === 0 ? cosKernel(r) : q === 1 ? -sinKernel(r) : q === 2 ? -cosKernel(r) : sinKernel(r);
}

// ---- atan / atan2 --------------------------------------------------------
const ATAN_HI = [4.63647609000806093515e-01, 7.85398163397448278999e-01,
  9.82793723247329054082e-01, 1.57079632679489655800e+00];
const ATAN_LO = [2.26987774529616870924e-17, 3.06161699786838301793e-17,
  1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01,
  -1.11111104054623557880e-01, 9.09088713343650656196e-02, -7.69187620504482999495e-02,
  6.66107313738753120669e-02, -5.83357013379057348645e-02, 4.97687799461593236017e-02,
  -3.65315727442169155270e-02, 1.62858201153657823623e-02];

/** atan(x) for any finite or infinite x. */
export function datan(x: number): number {
  if (Number.isNaN(x)) return NaN;
  const neg = x < 0 || Object.is(x, -0);
  let a = Math.abs(x);
  if (a >= 7.378697629483821e19) return neg ? -(ATAN_HI[3] + ATAN_LO[3]) : ATAN_HI[3] + ATAN_LO[3];
  let id = -1;
  if (a < 0.4375) {
    if (a < 3.725290298461914e-9) return x;
  } else if (a < 1.1875) {
    if (a < 0.6875) { id = 0; a = (2 * a - 1) / (2 + a); } else { id = 1; a = (a - 1) / (a + 1); }
  } else if (a < 2.4375) { id = 2; a = (a - 1.5) / (1 + 1.5 * a); }
  else { id = 3; a = -1 / a; }
  const z = a * a, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) { const r = a - a * (s1 + s2); return neg ? -r : r; }
  const r = ATAN_HI[id] - ((a * (s1 + s2) - ATAN_LO[id]) - a);
  return neg ? -r : r;
}

/** atan2 with the exact special-value table of ECMAScript Math.atan2. */
export function datan2(y: number, x: number): number {
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  const yNeg = y < 0 || Object.is(y, -0), xNeg = x < 0 || Object.is(x, -0);
  const ay = Math.abs(y), ax = Math.abs(x);
  if (ay === 0) return xNeg ? (yNeg ? -DPI : DPI) : y;
  if (ax === 0) return yNeg ? -PIO2_HI : PIO2_HI;
  if (ax === Infinity) {
    if (ay === Infinity) { const q = xNeg ? 3 * DPI / 4 : DPI / 4; return yNeg ? -q : q; }
    return xNeg ? (yNeg ? -DPI : DPI) : (yNeg ? -0 : 0);
  }
  if (ay === Infinity) return yNeg ? -PIO2_HI : PIO2_HI;
  // Quotient overflow/underflow guard (2^60 ratio decides the quadrant axis).
  let z: number;
  const ratio = ay / ax;
  if (ratio > 1.152921504606847e18) z = PIO2_HI;
  else if (ratio === 0 || ratio < 1e-300) z = 0;
  else z = datan(ratio);
  if (xNeg) z = DPI - (z - PI_LO);
  return yNeg ? -z : z;
}

// ---- hypot ---------------------------------------------------------------
/** sqrt of the sum of squares (left-to-right), rescaled when it could over/underflow. */
export function dhypot(...xs: number[]): number {
  let max = 0, nan = false;
  for (const v of xs) {
    const a = Math.abs(v);
    if (a === Infinity) return Infinity;
    if (Number.isNaN(a)) nan = true; else if (a > max) max = a;
  }
  if (nan) return NaN;
  if (max === 0) return 0;
  let sum = 0;
  if (max > 1e150 || max < 1e-150) {
    for (const v of xs) { const s = v / max; sum += s * s; }
    return Math.sqrt(sum) * max;
  }
  for (const v of xs) sum += v * v;
  return Math.sqrt(sum);
}

// ---- exp -----------------------------------------------------------------
const LN2_HI = 6.93147180369123816490e-01, LN2_LO = 1.90821492927058770002e-10;
const INV_LN2 = 1.44269504088896338700e+00;
const E1 = 1.66666666666666019037e-01, E2 = -2.77777777770155933842e-03,
  E3 = 6.61375632143793436117e-05, E4 = -1.65339022054652515390e-06,
  E5 = 4.13813679705723846039e-08;
const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
const LITTLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
// Exact 2^k for -1022 <= k <= 1023, built from the IEEE bit pattern.
function pow2(k: number): number {
  u32[LITTLE ? 0 : 1] = 0; u32[LITTLE ? 1 : 0] = (k + 1023) << 20;
  return f64[0];
}

export function dexp(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x > 709.782712893384) return Infinity;
  if (x < -745.1332191019411) return 0;
  if (Math.abs(x) < 3.725290298461914e-9) return 1 + x;
  const k = Math.trunc(x * INV_LN2 + (x < 0 ? -0.5 : 0.5));
  const hi = x - k * LN2_HI, lo = k * LN2_LO, r = hi - lo;
  const t = r * r;
  const c = r - t * (E1 + t * (E2 + t * (E3 + t * (E4 + t * E5))));
  const y = 1 - ((lo - (r * c) / (2 - c)) - hi);
  if (k === 0) return y;
  if (k > 1023) return y * pow2(k - 1000) * pow2(1000);
  if (k < -1021) return y * pow2(k + 1000) * pow2(-1000);
  return y * pow2(k);
}
