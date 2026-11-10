// ../../../../../../tmp/tlsx-v050/src/detmath.ts
var DPI = Math.PI;
var PIO2_HI = DPI / 2;
var PI_LO = 12246467991473532e-32;
var INV_PIO2 = 0.6366197723675814;
var PIO2_PARTS = [
  1.5707950592041016,
  12675900507019833e-22,
  7443542310303641e-28,
  5170176613476942e-34,
  6368316315668184e-40,
  8478304727057185e-47
];
var S1 = -0.16666666666666632;
var S2 = 0.00833333333332249;
var S3 = -1984126982985795e-19;
var S4 = 27557313707070068e-22;
var S5 = -25050760253406863e-24;
var S6 = 158969099521155e-24;
var C1 = 0.0416666666666666;
var C2 = -0.001388888888887411;
var C3 = 2480158728947673e-20;
var C4 = -27557314351390663e-23;
var C5 = 2087572321298175e-24;
var C6 = -11359647557788195e-27;
function sinKernel(x) {
  const z = x * x, v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  return x + v * (S1 + z * r);
}
function cosKernel(x) {
  const z = x * x, hz = 0.5 * z;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  const w = 1 - hz;
  return w + (1 - w - hz + z * r);
}
var REDUCE_LIMIT = 8589934592;
var reduced = [0];
function reduce(x) {
  if (Math.abs(x) > REDUCE_LIMIT) x = x % (2 * DPI);
  const n = Math.round(x * INV_PIO2);
  let r = x;
  for (let i = 0; i < PIO2_PARTS.length; i++) r = r - n * PIO2_PARTS[i];
  reduced[0] = r;
  return (n % 4 + 4) % 4;
}
function dsin(x) {
  if (!Number.isFinite(x)) return NaN;
  if (Math.abs(x) < 0.7853981633974483) return Math.abs(x) < 3725290298461914e-24 ? x : sinKernel(x);
  const q = reduce(x), r = reduced[0];
  return q === 0 ? sinKernel(r) : q === 1 ? cosKernel(r) : q === 2 ? -sinKernel(r) : -cosKernel(r);
}
function dcos(x) {
  if (!Number.isFinite(x)) return NaN;
  if (Math.abs(x) < 0.7853981633974483) return cosKernel(x);
  const q = reduce(x), r = reduced[0];
  return q === 0 ? cosKernel(r) : q === 1 ? -sinKernel(r) : q === 2 ? -cosKernel(r) : sinKernel(r);
}
var ATAN_HI = [
  0.4636476090008061,
  0.7853981633974483,
  0.982793723247329,
  1.5707963267948966
];
var ATAN_LO = [
  22698777452961687e-33,
  3061616997868383e-32,
  13903311031230998e-33,
  6123233995736766e-32
];
var AT = [
  0.3333333333333293,
  -0.19999999999876483,
  0.14285714272503466,
  -0.11111110405462356,
  0.09090887133436507,
  -0.0769187620504483,
  0.06661073137387531,
  -0.058335701337905735,
  0.049768779946159324,
  -0.036531572744216916,
  0.016285820115365782
];
function datan(x) {
  if (Number.isNaN(x)) return NaN;
  const neg = x < 0 || Object.is(x, -0);
  let a = Math.abs(x);
  if (a >= 7378697629483821e4) return neg ? -(ATAN_HI[3] + ATAN_LO[3]) : ATAN_HI[3] + ATAN_LO[3];
  let id = -1;
  if (a < 0.4375) {
    if (a < 3725290298461914e-24) return x;
  } else if (a < 1.1875) {
    if (a < 0.6875) {
      id = 0;
      a = (2 * a - 1) / (2 + a);
    } else {
      id = 1;
      a = (a - 1) / (a + 1);
    }
  } else if (a < 2.4375) {
    id = 2;
    a = (a - 1.5) / (1 + 1.5 * a);
  } else {
    id = 3;
    a = -1 / a;
  }
  const z = a * a, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) {
    const r2 = a - a * (s1 + s2);
    return neg ? -r2 : r2;
  }
  const r = ATAN_HI[id] - (a * (s1 + s2) - ATAN_LO[id] - a);
  return neg ? -r : r;
}
function datan2(y, x) {
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  const yNeg = y < 0 || Object.is(y, -0), xNeg = x < 0 || Object.is(x, -0);
  const ay = Math.abs(y), ax = Math.abs(x);
  if (ay === 0) return xNeg ? yNeg ? -DPI : DPI : y;
  if (ax === 0) return yNeg ? -PIO2_HI : PIO2_HI;
  if (ax === Infinity) {
    if (ay === Infinity) {
      const q = xNeg ? 3 * DPI / 4 : DPI / 4;
      return yNeg ? -q : q;
    }
    return xNeg ? yNeg ? -DPI : DPI : yNeg ? -0 : 0;
  }
  if (ay === Infinity) return yNeg ? -PIO2_HI : PIO2_HI;
  let z;
  const ratio = ay / ax;
  if (ratio > 1152921504606847e3) z = PIO2_HI;
  else if (ratio === 0 || ratio < 1e-300) z = 0;
  else z = datan(ratio);
  if (xNeg) z = DPI - (z - PI_LO);
  return yNeg ? -z : z;
}
function dhypot(...xs) {
  let max = 0, nan = false;
  for (const v of xs) {
    const a = Math.abs(v);
    if (a === Infinity) return Infinity;
    if (Number.isNaN(a)) nan = true;
    else if (a > max) max = a;
  }
  if (nan) return NaN;
  if (max === 0) return 0;
  let sum = 0;
  if (max > 1e150 || max < 1e-150) {
    for (const v of xs) {
      const s = v / max;
      sum += s * s;
    }
    return Math.sqrt(sum) * max;
  }
  for (const v of xs) sum += v * v;
  return Math.sqrt(sum);
}
var LN2_HI = 0.6931471803691238;
var LN2_LO = 19082149292705877e-26;
var INV_LN2 = 1.4426950408889634;
var E1 = 0.16666666666666602;
var E2 = -0.0027777777777015593;
var E3 = 6613756321437934e-20;
var E4 = -16533902205465252e-22;
var E5 = 41381367970572385e-24;
var f64 = new Float64Array(1);
var u32 = new Uint32Array(f64.buffer);
var LITTLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
function pow2(k) {
  u32[LITTLE ? 0 : 1] = 0;
  u32[LITTLE ? 1 : 0] = k + 1023 << 20;
  return f64[0];
}
function dexp(x) {
  if (Number.isNaN(x)) return NaN;
  if (x > 709.782712893384) return Infinity;
  if (x < -745.1332191019411) return 0;
  if (Math.abs(x) < 3725290298461914e-24) return 1 + x;
  const k = Math.trunc(x * INV_LN2 + (x < 0 ? -0.5 : 0.5));
  const hi = x - k * LN2_HI, lo = k * LN2_LO, r = hi - lo;
  const t = r * r;
  const c = r - t * (E1 + t * (E2 + t * (E3 + t * (E4 + t * E5))));
  const y = 1 - (lo - r * c / (2 - c) - hi);
  if (k === 0) return y;
  if (k > 1023) return y * pow2(k - 1e3) * pow2(1e3);
  if (k < -1021) return y * pow2(k + 1e3) * pow2(-1e3);
  return y * pow2(k);
}

// ../../../../../../tmp/tlsx-v050/src/patterns.ts
var MAX_PATTERN_ATTEMPTS = 6;
var PatternGenerationError = class extends Error {
  constructor(attempts, reasons) {
    super(`\uD2B9\uC218 \uCF54\uB108 \uC801\uC6A9 \uC2E4\uD328 (${attempts}\uD68C \uC2DC\uB3C4): ${reasons.at(-1) ?? "\uD615\uC0C1 \uAC80\uC0AC \uC2E4\uD328"}`);
    this.attempts = attempts;
    this.reasons = reasons;
    this.name = "PatternGenerationError";
  }
};
var P = (x, z) => ({ x, y: 0, z });
var distance = (a, b) => dhypot(b.x - a.x, b.z - a.z);
var mix = (a, b, t) => P(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
var direction = (a, b) => {
  const d = distance(a, b) || 1;
  return P((b.x - a.x) / d, (b.z - a.z) / d);
};
var angle = (a, b) => datan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z);
var degrees = (r) => r * 180 / Math.PI;
function cumulative(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + distance(points[i - 1], points[i]));
  return lengths;
}
function resample(points, spacing = 8) {
  const lengths = cumulative(points), length = lengths.at(-1);
  const count = Math.min(1800, Math.max(120, Math.ceil(length / spacing)));
  const result = [];
  let index = 0;
  for (let i = 0; i < count; i++) {
    const d = i * length / count;
    while (index < points.length - 2 && lengths[index + 1] < d) index++;
    result.push(mix(points[index], points[index + 1], (d - lengths[index]) / (lengths[index + 1] - lengths[index] || 1)));
  }
  result.push({ ...result[0] });
  return { points: result, length, step: length / count };
}
function smoothBase(original, scale, margin, rounding) {
  const sampled = resample(original.map((p) => P(p.x * scale, p.z * scale)));
  const n = sampled.points.length - 1, sigma = Math.max(12, margin * rounding) / sampled.step;
  const radius = Math.ceil(sigma * 3);
  const weights = Array.from({ length: radius * 2 + 1 }, (_, i) => dexp(-0.5 * ((i - radius) / sigma * ((i - radius) / sigma))));
  const sum = weights.reduce((a, b) => a + b, 0);
  const points = sampled.points.slice(0, -1).map((_, i) => {
    let x = 0, z = 0;
    weights.forEach((w, k) => {
      const p = sampled.points[(i + k - radius + n) % n];
      x += p.x * w;
      z += p.z * w;
    });
    return P(x / sum, z / sum);
  });
  points.push({ ...points[0] });
  return resample(points);
}
function localPattern(kind, radius, strength) {
  const points = [P(0, 0)];
  let heading = kind === "right-angle" ? Math.PI / 4 : 0;
  const line = (length) => {
    const start2 = points.at(-1);
    for (let i = 1, n = Math.ceil(length / 4); i <= n; i++)
      points.push(P(start2.x + dcos(heading) * length * i / n, start2.z + dsin(heading) * length * i / n));
  };
  const arc = (turn) => {
    const start2 = points.at(-1), sign = Math.sign(turn), before = heading;
    for (let i = 1, n = Math.ceil(Math.abs(turn) * radius / 4); i <= n; i++) {
      const h = before + turn * i / n;
      points.push(P(
        start2.x + sign * radius * (dsin(h) - dsin(before)),
        start2.z + sign * radius * (dcos(before) - dcos(h))
      ));
    }
    heading += turn;
  };
  let start = 0, end = 0, leg = 0;
  if (kind === "right-angle") {
    arc(-Math.PI / 2);
    end = points.length - 1;
  } else if (kind === "hairpin") {
    arc(Math.PI / 2);
    leg = radius * (0.65 + 0.8 * strength);
    line(leg);
    start = points.length - 1;
    arc(-Math.PI);
    end = points.length - 1;
    line(leg);
    arc(Math.PI / 2);
  } else {
    const turn = (20 + 45 * strength) * Math.PI / 180;
    arc(turn);
    arc(-2 * turn);
    arc(turn);
    end = points.length - 1;
  }
  return { points, start, end, leg };
}
function bezier(a, b, da, db) {
  const span = b.x - a.x;
  const c = P(a.x + span / 3, a.z + da.z / da.x * span / 3);
  const d = P(b.x - span / 3, b.z - db.z / db.x * span / 3);
  const n = Math.max(8, Math.ceil((distance(a, c) + distance(c, d) + distance(d, b)) / 4));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    const u3 = u * u * u, u2 = u * u, t2 = t * t, t3 = t * t * t;
    return P(
      u3 * a.x + 3 * u2 * t * c.x + 3 * u * t2 * d.x + t3 * b.x,
      u3 * a.z + 3 * u2 * t * c.z + 3 * u * t2 * d.z + t3 * b.z
    );
  });
}
function splicePatterns(base, p, rng, margin, attempt) {
  const n = base.points.length - 1, result = [], marks = [];
  const append = (points) => {
    for (const point of points) if (!result.length || distance(result.at(-1), point) > 1e-7) result.push(point);
  };
  const window = (0.24 - attempt % 3 * 0.025) * n;
  const strength = p.cornerStrength / 100, kind = p.cornerPattern;
  const maxRadius = Math.max(32, margin * (2.4 - 0.8 * strength)) * 1.03;
  const requiredWidth = localPattern(kind, maxRadius, strength).points.at(-1).x + margin * 4.4;
  const candidates = [];
  for (let k = 0; k < 80; k++) {
    const center = n * (k + rng() * 0.5) / 80;
    const from = Math.floor(center - window / 2), to = Math.ceil(center + window / 2);
    if (from < 2 || to >= n - 2) continue;
    const a = base.points[from], b = base.points[to], u = direction(a, b);
    if (distance(a, b) < requiredWidth) continue;
    const entry = direction(base.points[from - 1], base.points[from + 1]);
    const exit = direction(base.points[to - 1], base.points[to + 1]);
    const score = Math.min(entry.x * u.x + entry.z * u.z, exit.x * u.x + exit.z * u.z);
    if (score >= 0.55) candidates.push({ from, to, score: score + rng() * 0.15 });
  }
  const memo = /* @__PURE__ */ new Map();
  const choose = (index, left) => {
    if (!left) return { score: 0, indices: [] };
    if (index >= candidates.length) return { score: -Infinity, indices: [] };
    const key = `${index}/${left}`, cached = memo.get(key);
    if (cached) return cached;
    const skip = choose(index + 1, left), current = candidates[index];
    let next = index + 1;
    while (next < candidates.length && candidates[next].from < current.to + n * 0.025) next++;
    const tail = choose(next, left - 1), score = current.score + tail.score;
    const result2 = score > skip.score ? { score, indices: [index, ...tail.indices] } : skip;
    memo.set(key, result2);
    return result2;
  };
  const selected = choose(0, p.cornerCount).indices.map((i) => candidates[i]);
  if (selected.length !== p.cornerCount) throw new Error("\uB3C4\uB85C\xB7\uBCF4\uB3C4 \uD3ED\uC5D0 \uBE44\uD574 \uC548\uC804\uD55C \uD328\uD134 \uC5F0\uACB0 \uAD6C\uAC04\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4");
  let cursor = 0;
  for (const { from, to } of selected) {
    const center = (from + to) / 2;
    if (from <= cursor || to >= n - 2) throw new Error("\uCF54\uB108\uB97C \uC5F0\uACB0\uD560 \uAD6C\uAC04\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4");
    const a = base.points[from], b = base.points[to], u = direction(a, b), chord = distance(a, b);
    const middle = base.points[Math.floor(center)];
    let v = P(u.z, -u.x);
    if ((middle.x - (a.x + b.x) / 2) * v.x + (middle.z - (a.z + b.z) / 2) * v.z < 0) v = P(-v.x, -v.z);
    const localDirection = (d) => P(d.x * u.x + d.z * u.z, d.x * v.x + d.z * v.z);
    const entry = localDirection(direction(base.points[from - 1], base.points[from + 1]));
    const exit = localDirection(direction(base.points[to - 1], base.points[to + 1]));
    if (entry.x < 0.35 || exit.x < 0.35) throw new Error("\uC5F0\uACB0 \uC811\uC120\uC758 \uBC29\uD5A5 \uC5EC\uC720\uAC00 \uBD80\uC871\uD569\uB2C8\uB2E4");
    const radius = Math.max(32, margin * (2.4 - 0.8 * strength)) * (1 + rng() * 0.03);
    const pattern = localPattern(kind, radius, strength), width = pattern.points.at(-1).x;
    const gap = (chord - width) / 2;
    if (gap < margin * 1.4) throw new Error("\uB3C4\uB85C\xB7\uBCF4\uB3C4 \uD3ED\uC5D0 \uBE44\uD574 \uD328\uD134 \uC5F0\uACB0 \uACF5\uAC04\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4");
    const first = direction(pattern.points[0], pattern.points[1]);
    const last = direction(pattern.points.at(-2), pattern.points.at(-1));
    const lift = gap * (entry.z / entry.x + first.z / first.x - exit.z / exit.x - last.z / last.x) / 4;
    const local = pattern.points.map((q) => P(q.x + gap, q.z + Math.max(0, lift)));
    const world = (q) => P(a.x + u.x * q.x + v.x * q.z, a.z + u.z * q.x + v.z * q.z);
    append(base.points.slice(cursor, from + 1));
    append(bezier(P(0, 0), local[0], entry, first).map(world));
    const start = result.length - 1;
    append(local.map(world));
    marks.push({ kind, start: start + pattern.start, end: start + pattern.end, leg: pattern.leg });
    append(bezier(local.at(-1), P(chord, 0), last, exit).map(world));
    cursor = to + 1;
  }
  append(base.points.slice(cursor));
  result[result.length - 1] = { ...result[0] };
  const lengths = cumulative(result), sampled = resample(result);
  const measurements = marks.map((mark) => {
    const start = Math.round(lengths[mark.start] / sampled.step), end = Math.round(lengths[mark.end] / sampled.step);
    return measurePattern(sampled.points, mark.kind, start, end, mark.leg / sampled.step);
  });
  return { points: sampled.points, measurements };
}
function measurePattern(points, kind, startIndex, endIndex, legSamples = 0) {
  let positive = 0, negative = 0, changes = 0, previousSign = 0;
  for (let i = startIndex; i <= endIndex; i++) {
    const weight = i === startIndex || i === endIndex ? 0.5 : 1;
    const turn2 = weight * degrees(angle(direction(points[i - 1], points[i]), direction(points[i], points[i + 1])));
    positive += Math.max(0, turn2);
    negative += Math.min(0, turn2);
    if (i > startIndex && i < endIndex && Math.abs(turn2) > 0.12) {
      const sign = Math.sign(turn2);
      if (previousSign && previousSign !== sign) changes++;
      previousSign = sign;
    }
  }
  const turn = positive + negative;
  let parallelDot;
  if (kind === "hairpin") {
    const length = Math.max(2, Math.floor(legSamples * 0.7));
    const a = direction(points[Math.max(0, startIndex - length)], points[startIndex]);
    const b = direction(points[endIndex], points[Math.min(points.length - 1, endIndex + length)]);
    parallelDot = a.x * b.x + a.z * b.z;
  }
  const verified = kind === "right-angle" ? Math.abs(Math.abs(turn) - 90) < 13 : kind === "hairpin" ? Math.abs(Math.abs(turn) - 180) < 13 && parallelDot < -0.97 : positive > 30 && negative < -30 && changes >= 2;
  return {
    kind,
    startIndex,
    endIndex,
    turnDegrees: turn,
    positiveTurnDegrees: positive,
    negativeTurnDegrees: negative,
    curvatureChanges: changes,
    parallelDot,
    verified
  };
}
var cross = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
function intersects(a, b) {
  if (a.maxX < b.minX || b.maxX < a.minX || a.maxZ < b.minZ || b.maxZ < a.minZ) return false;
  const ab1 = cross(a.a, a.b, b.a), ab2 = cross(a.a, a.b, b.b);
  const ba1 = cross(b.a, b.b, a.a), ba2 = cross(b.a, b.b, a.b);
  return ab1 * ab2 <= 0 && ba1 * ba2 <= 0;
}
function validatePatternGeometry(points, width, curb = 2.5, sidewalk = 17) {
  const n = points.length - 1, margin = width / 2 + curb + sidewalk;
  const closed = n >= 3 && distance(points[0], points[n]) < 1e-8;
  let minRadius = Infinity, maxStepAngle = 0, foldedTriangles = 0;
  const normals = points.map((_, i) => {
    const d = direction(points[(i - 1 + n) % n], points[(i + 1) % n]);
    return P(-d.z, d.x);
  });
  const offsets = [-margin, -width / 2 - curb, -width / 2, width / 2, width / 2 + curb, margin];
  const rings = offsets.map((offset) => points.map((p, i) => P(
    Math.fround(p.x + normals[i].x * offset),
    Math.fround(p.z + normals[i].z * offset)
  )));
  for (let i = 0; i < n; i++) {
    const before = points[(i - 1 + n) % n], p = points[i], after = points[(i + 1) % n];
    const turn = Math.abs(angle(direction(before, p), direction(p, after)));
    minRadius = Math.min(minRadius, (distance(before, p) + distance(p, after)) / 2 / (turn || 1e-15));
    maxStepAngle = Math.max(maxStepAngle, degrees(turn));
    for (let band = 0; band < rings.length - 1; band++) {
      const a = rings[band][i], b = rings[band][i + 1], c = rings[band + 1][i], d = rings[band + 1][i + 1];
      if (cross(a, b, c) <= 1e-5 || cross(c, b, d) <= 1e-5) foldedTriangles++;
    }
  }
  const reasons = [];
  if (!closed || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.z))) reasons.push("\uD3D0\uD569 \uB610\uB294 \uC88C\uD45C \uAC80\uC0AC \uC2E4\uD328");
  if (minRadius < margin * 1.12 || maxStepAngle > 20) reasons.push("\uC811\uD569\uBD80 \uB610\uB294 \uACE1\uB960 \uBC18\uACBD\uC774 \uB3C4\uB85C\xB7\uBCF4\uB3C4 \uD3ED\uC5D0 \uBE44\uD574 \uC791\uC2B5\uB2C8\uB2E4");
  if (foldedTriangles) reasons.push("\uB3C4\uB85C\xB7\uC5F0\uC11D\xB7\uBCF4\uB3C4 \uC0BC\uAC01\uD615\uC758 \uC811\uD798\uC774 \uAC80\uCD9C\uB410\uC2B5\uB2C8\uB2E4");
  let selfIntersections = 0, boundaryIntersections = 0;
  const boundariesChecked = reasons.length === 0;
  if (boundariesChecked) {
    const grid = /* @__PURE__ */ new Map(), segments = [], cell = Math.max(64, margin * 2);
    outer: for (const [ring, contour] of [points, ...rings].entries()) for (let i = 0; i < n; i++) {
      const a = contour[i], b = contour[i + 1];
      const segment = {
        a,
        b,
        ring,
        index: i,
        minX: Math.min(a.x, b.x),
        maxX: Math.max(a.x, b.x),
        minZ: Math.min(a.z, b.z),
        maxZ: Math.max(a.z, b.z)
      };
      const keys = [], seen = /* @__PURE__ */ new Set();
      for (let x = Math.floor(segment.minX / cell); x <= Math.floor(segment.maxX / cell); x++)
        for (let z = Math.floor(segment.minZ / cell); z <= Math.floor(segment.maxZ / cell); z++) keys.push(`${x},${z}`);
      for (const key of keys) for (const id2 of grid.get(key) ?? []) {
        if (seen.has(id2)) continue;
        seen.add(id2);
        const other = segments[id2], gap = Math.abs(other.index - i);
        if (other.ring === ring && (gap <= 1 || gap === n - 1)) continue;
        if (intersects(segment, other)) {
          if (ring === 0 && other.ring === 0) selfIntersections++;
          else boundaryIntersections++;
          if (selfIntersections + boundaryIntersections >= 8) break outer;
        }
      }
      const id = segments.push(segment) - 1;
      for (const key of keys) {
        const entries = grid.get(key) ?? [];
        entries.push(id);
        grid.set(key, entries);
      }
    }
  }
  if (selfIntersections) reasons.push("\uC911\uC2EC\uC120 \uC790\uAE30\uAD50\uCC28\uAC00 \uAC80\uCD9C\uB410\uC2B5\uB2C8\uB2E4");
  if (boundaryIntersections) reasons.push("\uB3C4\uB85C\xB7\uC5F0\uC11D\xB7\uBCF4\uB3C4 \uACBD\uACC4 \uACB9\uCE68\uC774 \uAC80\uCD9C\uB410\uC2B5\uB2C8\uB2E4");
  return {
    valid: reasons.length === 0,
    closed,
    minRadius,
    maxStepAngle,
    selfIntersections,
    boundaryIntersections,
    foldedTriangles,
    boundariesChecked,
    reasons
  };
}
function applyPatterns(original, p, rng, curb, sidewalk) {
  const reasons = [], margin = p.width / 2 + curb + sidewalk;
  for (let attempt = 0; attempt < MAX_PATTERN_ATTEMPTS; attempt++) {
    const scale = 1 + attempt * 0.45;
    try {
      const candidate = splicePatterns(smoothBase(original, scale, margin, 2.5 + attempt), p, rng, margin, attempt);
      const geometry = validatePatternGeometry(candidate.points, p.width, curb, sidewalk);
      if (!geometry.valid) throw new Error(geometry.reasons.join(" \xB7 "));
      if (!candidate.measurements.every((m) => m.verified) || candidate.measurements.length !== p.cornerCount)
        throw new Error("\uC120\uD0DD\uD55C \uCF54\uB108\uC758 \uC2E4\uC81C \uBAA9\uD45C\uAC01 \uB610\uB294 \uACE1\uB960 \uBCC0\uD654 \uAC80\uC0AC \uC2E4\uD328");
      const report = {
        selected: p.cornerPattern,
        requested: p.cornerCount,
        inserted: candidate.measurements.length,
        attempts: attempt + 1,
        scale,
        patterns: candidate.measurements,
        geometry
      };
      return { points: candidate.points, report };
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new PatternGenerationError(MAX_PATTERN_ATTEMPTS, reasons);
}

// ../../../../../../tmp/tlsx-v050/src/core.ts
var DEFAULTS = {
  curves: 6,
  straight: 0.25,
  width: 40,
  size: 2,
  height: 80,
  obstacles: 3,
  density: 10,
  scene: "mixed",
  seed: 42,
  cornerPattern: "auto",
  cornerCount: 1,
  cornerStrength: 60
};
var LIMITS = {
  curves: [3, 10, 1],
  straight: [0, 0.6, 0.05],
  width: [20, 80, 1],
  size: [1, 3, 1],
  height: [0, 200, 5],
  obstacles: [0, 8, 1],
  density: [0, 20, 1],
  seed: [0, 2147483647, 1],
  cornerCount: [0, 3, 1],
  cornerStrength: [20, 100, 1]
};
var STEPS = 60;
var CURB = 2.5;
var SIDEWALK = 17;
var CURB_HEIGHT = 1.1;
var CAR_RADIUS = 7.2;
var TAU = Math.PI * 2;
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var lerp = (a, b, t) => a + (b - a) * t;
function sanitize(input) {
  const p = { ...DEFAULTS, ...input };
  for (const key of Object.keys(LIMITS)) {
    const [lo, hi] = LIMITS[key];
    const raw = Number(p[key]);
    p[key] = clamp(Number.isFinite(raw) ? raw : DEFAULTS[key], lo, hi);
    if (key !== "straight") p[key] = Math.round(p[key]);
  }
  if (!["nature", "city", "mixed"].includes(p.scene)) p.scene = DEFAULTS.scene;
  if (!["auto", "right-angle", "hairpin", "s-curve"].includes(p.cornerPattern)) p.cornerPattern = "auto";
  return p;
}
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = state + 1831565813 >>> 0;
    let t = Math.imul(state ^ state >>> 15, state | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function catmull(a, b, c, d, t) {
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
}
function elevation(t, p) {
  return (dsin(t * TAU * 2 + p.seed * 0.01) + dsin(t * TAU * 4 + p.seed * 0.02) * 0.4) * p.height;
}
function generateTrack(input = {}) {
  const p = sanitize(input);
  const rng = random(p.seed);
  const radius = 300 + p.size * 60;
  const waypoints = Array.from({ length: p.curves }, (_, i) => {
    const r = radius * (0.7 + rng() * 0.4);
    const a = i / p.curves * TAU - Math.PI / 2 + (rng() * 0.7 - 0.35) * Math.PI * 0.7 / p.curves;
    return { x: dcos(a) * r, y: 0, z: dsin(a) * r };
  });
  const order = Array.from({ length: p.curves }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const straightSegments = Array(p.curves).fill(false);
  order.slice(0, Math.round(p.straight * p.curves)).forEach((i) => {
    straightSegments[i] = true;
  });
  const points = [];
  for (let i = 0; i < p.curves; i++) {
    const [a, b, c, d] = [-1, 0, 1, 2].map((k) => waypoints[(i + k + p.curves) % p.curves]);
    for (let j = 0; j < STEPS; j++) {
      const t = j / STEPS;
      points.push({
        x: straightSegments[i] ? lerp(b.x, c.x, t) : catmull(a.x, b.x, c.x, d.x, t),
        z: straightSegments[i] ? lerp(b.z, c.z, t) : catmull(a.z, b.z, c.z, d.z, t),
        y: elevation((i + t) / p.curves, p)
      });
    }
  }
  points.push({ ...points[0] });
  let patternReport = {
    selected: p.cornerPattern,
    requested: 0,
    inserted: 0,
    attempts: 0,
    scale: 1,
    patterns: [],
    geometry: null
  };
  if (p.cornerPattern !== "auto" && p.cornerCount > 0) {
    const result = applyPatterns(points, p, random(p.seed ^ 3933345), CURB, SIDEWALK);
    points.splice(0, points.length, ...result.points);
    for (let i = 0; i < points.length; i++) points[i].y = elevation(i / (points.length - 1), p);
    points[points.length - 1] = { ...points[0] };
    patternReport = result.report;
  }
  const n = points.length - 1;
  const normals = points.map((_, i) => {
    const a = points[(i - 1 + n) % n], b = points[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = dhypot(dx, dz) || 1;
    return { x: -dz / len, z: dx / len };
  });
  const margin = p.width / 2 + CURB + SIDEWALK;
  let length = 0;
  for (let i = 0; i < n; i++) length += dhypot(
    points[i + 1].x - points[i].x,
    points[i + 1].y - points[i].y,
    points[i + 1].z - points[i].z
  );
  const track = {
    params: p,
    waypoints,
    points,
    normals,
    straightSegments,
    length,
    patternReport,
    // These exact float32 vertices are shared with the rendered asphalt ribbon.
    roadEdges: [-1, 1].map((side) => points.map((pt, i) => ({
      x: Math.fround(pt.x + normals[i].x * side * p.width / 2),
      y: Math.fround(pt.y),
      z: Math.fround(pt.z + normals[i].z * side * p.width / 2)
    }))),
    bounds: {
      minX: Math.min(...points.map((v) => v.x)) - margin,
      maxX: Math.max(...points.map((v) => v.x)) + margin,
      minZ: Math.min(...points.map((v) => v.z)) - margin,
      maxZ: Math.max(...points.map((v) => v.z)) + margin,
      minY: Math.min(...points.map((v) => v.y)),
      maxY: Math.max(...points.map((v) => v.y))
    },
    props: [],
    obstacles: []
  };
  track.obstacles = makeObstacles(track);
  track.props = makeProps(track);
  return track;
}
function project(track, x, z, hint) {
  let best = Infinity;
  let result;
  const count = track.points.length - 1;
  const local = hint !== void 0 && hint >= 0 && hint < count;
  for (let k = 0; k < (local ? 17 : count); k++) {
    const i = local ? (hint + k - 8 + count) % count : k;
    const a = track.points[i], b = track.points[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len2 = dx * dx + dz * dz;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (len2 || 1), 0, 1);
    const px = a.x + dx * t, pz = a.z + dz * t;
    const dist2 = (x - px) * (x - px) + (z - pz) * (z - pz);
    if (dist2 < best) {
      best = dist2;
      const len = Math.sqrt(len2) || 1;
      result = {
        x: px,
        y: lerp(a.y, b.y, t),
        z: pz,
        t,
        index: i,
        distance: Math.sqrt(dist2),
        dx: dx / len,
        dz: dz / len,
        slope: (b.y - a.y) / len
      };
    }
  }
  return result;
}
function roadContact(track, x, z) {
  let result = { clearance: Infinity, nx: 0, nz: 0 };
  const reference = track.points[0];
  for (const edge of track.roadEdges) {
    let inside = false, referenceInside = false, best = Infinity, qx = 0, qz = 0;
    let fallbackX = 0, fallbackZ = 0;
    for (let i = 0; i < edge.length - 1; i++) {
      const a = edge[i], b = edge[i + 1], dx = b.x - a.x, dz = b.z - a.z;
      if (a.z > z !== b.z > z && x < a.x + dx * (z - a.z) / dz) inside = !inside;
      if (a.z > reference.z !== b.z > reference.z && reference.x < a.x + dx * (reference.z - a.z) / dz) referenceInside = !referenceInside;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      const px = a.x + dx * t, pz = a.z + dz * t, d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (d2 < best) {
        best = d2;
        qx = px;
        qz = pz;
        const center = track.points[i], length = dhypot(dx, dz) || 1;
        const sign2 = Math.sign(-dz * (center.x - a.x) + dx * (center.z - a.z));
        fallbackX = -dz / length * sign2;
        fallbackZ = dx / length * sign2;
      }
    }
    const distance2 = Math.sqrt(best), sign = inside === referenceInside ? 1 : -1;
    if (distance2 * sign < result.clearance) result = {
      clearance: distance2 * sign,
      nx: distance2 > 1e-9 ? (x - qx) / distance2 * sign : fallbackX,
      nz: distance2 > 1e-9 ? (z - qz) / distance2 * sign : fallbackZ
    };
  }
  return result;
}
function roadHeight(track, x, z, hit = project(track, x, z)) {
  const count = track.points.length - 1;
  let height = -Infinity;
  const [left, right] = track.roadEdges;
  for (let i = 0; i < count; i++) {
    if (x < Math.min(left[i].x, left[i + 1].x, right[i].x, right[i + 1].x) - 1e-6 || x > Math.max(left[i].x, left[i + 1].x, right[i].x, right[i + 1].x) + 1e-6 || z < Math.min(left[i].z, left[i + 1].z, right[i].z, right[i + 1].z) - 1e-6 || z > Math.max(left[i].z, left[i + 1].z, right[i].z, right[i + 1].z) + 1e-6) continue;
    for (const [a, b, c] of [[left[i], left[i + 1], right[i]], [right[i], left[i + 1], right[i + 1]]]) {
      const det = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
      if (Math.abs(det) < 1e-12) continue;
      const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / det;
      const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / det;
      if (u >= 0 && v >= 0 && u + v <= 1) {
        height = Math.max(height, a.y * u + b.y * v + c.y * (1 - u - v));
      }
    }
  }
  return Number.isFinite(height) ? height : hit.y;
}
function makeObstacles(track) {
  const rng = random(track.params.seed ^ 6239);
  const n = track.points.length - 1;
  return Array.from({ length: track.params.obstacles }, (_, i) => {
    const idx = Math.floor(n * (0.09 + (i + rng() * 0.5) / Math.max(1, track.params.obstacles) * 0.8));
    const pt = track.points[idx], normal = track.normals[idx];
    const offset = (rng() - 0.5) * track.params.width * 0.5;
    return {
      x: pt.x + normal.x * offset,
      y: pt.y,
      z: pt.z + normal.z * offset,
      radius: 4,
      heading: datan2(normal.z, -normal.x)
    };
  });
}
function makeProps(track) {
  const { params: p, points, normals } = track;
  const count = p.density * 8;
  if (count === 0) return [];
  const rng = random(p.seed ^ 3862935);
  const props = [];
  const n = points.length - 1;
  for (let i = 0; i < count; i++) {
    const idx = Math.floor((i + 0.2 + rng() * 0.6) / count * n) % n;
    const pt = points[idx], normal = normals[idx], side = i % 2 ? -1 : 1;
    const choices = p.scene === "nature" ? ["tree", "tree", "bench", "lamp"] : p.scene === "city" ? ["building", "building", "bench", "lamp"] : ["tree", "building", "bench", "lamp"];
    const kind = choices[i % choices.length];
    const scale = 0.75 + rng() * 0.5;
    const dist = p.width / 2 + CURB + (kind === "building" ? SIDEWALK + 18 + rng() * 24 : 8 + rng() * 3);
    const x = pt.x + normal.x * side * dist, z = pt.z + normal.z * side * dist;
    const clearance = kind === "building" ? 13 * scale : 5 * scale;
    if (project(track, x, z).distance < p.width / 2 + CURB + clearance) continue;
    if (dhypot(x - points[0].x, z - points[0].z) < 32) continue;
    props.push({
      x,
      y: pt.y + (kind === "building" ? 0 : CURB_HEIGHT),
      z,
      kind,
      scale,
      heading: datan2(normal.z, -normal.x)
    });
  }
  return props;
}

// ../../../../../../tmp/tlsx-v050/src/vehicle.ts
var MARGIN = 2e-3;
function spawnVehicle(track) {
  const index = track.points.findIndex((p) => roadContact(track, p.x, p.z).clearance >= CAR_RADIUS + MARGIN);
  if (index < 0) throw new Error("\uCC28\uB7C9\uC744 \uBC30\uCE58\uD560 \uC218 \uC788\uB294 \uC544\uC2A4\uD314\uD2B8 \uC601\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
  const a = track.points[index], b = track.points[index + 1];
  return {
    ...a,
    y: roadHeight(track, a.x, a.z),
    heading: Math.atan2(b.x - a.x, b.z - a.z),
    speed: 0,
    pitch: Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)),
    surface: "asphalt",
    collision: 0,
    vx: 0,
    vz: 0,
    roadIndex: index
  };
}

// ../../../../../../tmp/tlsx-v050/src/coins.ts
var COIN_COUNT = 10;
var COIN_RADIUS = 2.6;
var COIN_PICKUP_RADIUS = CAR_RADIUS + COIN_RADIUS;
function generateCoins(track) {
  const rng = random(track.params.seed ^ 4981157);
  const count = track.points.length - 1;
  const spawn = spawnVehicle(track);
  const coins = [];
  const tryPosition = (index, offset) => {
    const p = track.points[index], n = track.normals[index];
    const x = p.x + n.x * offset, z = p.z + n.z * offset;
    if (roadContact(track, x, z).clearance < CAR_RADIUS + 0.4) return false;
    if (dhypot(x - track.points[0].x, z - track.points[0].z) < 40) return false;
    if (dhypot(x - spawn.x, z - spawn.z) < 40) return false;
    if (track.obstacles.some((o) => dhypot(x - o.x, z - o.z) < CAR_RADIUS + o.radius + COIN_RADIUS + 2)) return false;
    if (coins.some((c) => dhypot(x - c.x, z - c.z) < 28)) return false;
    coins.push({ id: coins.length, x, y: roadHeight(track, x, z), z });
    return true;
  };
  const lateralRoom = Math.min(track.params.width * 0.2, track.params.width / 2 - CAR_RADIUS - 1);
  for (let bin = 0; bin < COIN_COUNT; bin++) {
    for (let attempt = 0; attempt < 24; attempt++) {
      const index = Math.floor(count * (0.06 + 0.88 * (bin + rng()) / COIN_COUNT));
      if (tryPosition(index, (rng() * 2 - 1) * lateralRoom)) break;
    }
  }
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (const index of indices) {
    if (coins.length === COIN_COUNT) break;
    tryPosition(index, 0);
  }
  if (coins.length !== COIN_COUNT) throw new Error("\uC548\uC804\uD55C \uCF54\uC778 \uC704\uCE58 10\uAC1C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
  return coins;
}

// ../../../../../../tmp/tlsx-v050/src/sha256.ts
var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
function sha256Bytes(data) {
  const h = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  const total = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(total);
  padded.set(data);
  padded[data.length] = 128;
  const view = new DataView(padded.buffer);
  view.setUint32(total - 8, Math.floor(data.length / 536870912));
  view.setUint32(total - 4, data.length << 3 >>> 0);
  const w = new Uint32Array(64);
  const rotr = (x, n) => x >>> n | x << 32 - n;
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + (e & f ^ ~e & g) + K[i] + w[i] >>> 0;
      const t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  const out = new Uint8Array(32), ov = new DataView(out.buffer);
  h.forEach((v, i) => ov.setUint32(i * 4, v));
  return out;
}
function sha256(text) {
  return Array.from(sha256Bytes(new TextEncoder().encode(text)), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ../../../../../../tmp/tlsx-v050/src/version.ts
var VERSION = "0.5.0";

// ../../../../../../tmp/tlsx-v050/src/schema.ts
var SCHEMA_NAME = "tracklab.track";
var SCHEMA_VERSION = 1;
var CANONICAL_NAME = "sorted-keys-json";
var TrackDocumentError = class extends Error {
  constructor(path, detail) {
    super(`${path}: ${detail}`);
    this.path = path;
    this.name = "TrackDocumentError";
  }
};
function canonicalStringify(value, path = "$") {
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) throw new TrackDocumentError(path, `non-finite number (${value}) cannot be serialized`);
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) {
        return "[" + value.map((v, i) => canonicalStringify(v, `${path}[${i}]`)).join(",") + "]";
      }
      const o = value;
      return "{" + Object.keys(o).filter((k) => o[k] !== void 0).sort().map((k) => JSON.stringify(k) + ":" + canonicalStringify(o[k], `${path}.${k}`)).join(",") + "}";
    }
    default:
      throw new TrackDocumentError(path, `unsupported value of type ${typeof value}`);
  }
}
function plain(value, path = "$") {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TrackDocumentError(path, `non-finite number (${value})`);
    return value === 0 ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((v, i) => plain(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (v !== void 0) out[k] = plain(v, `${path}.${k}`);
    return out;
  }
  return value;
}
var digestOf = (body) => sha256(canonicalStringify(body));
function assemble(track, generator) {
  const body = plain({
    schema: SCHEMA_NAME,
    schemaVersion: SCHEMA_VERSION,
    generator,
    params: track.params,
    geometry: {
      points: track.points,
      normals: track.normals,
      roadEdges: track.roadEdges,
      straightSegments: track.straightSegments,
      length: track.length,
      bounds: track.bounds
    },
    props: track.props,
    obstacles: track.obstacles,
    coins: generateCoins(track),
    patternReport: track.patternReport
  });
  return { ...body, integrity: { algorithm: "sha256", canonical: CANONICAL_NAME, digest: digestOf(body) } };
}
function exportTrack(track) {
  return assemble(track, { name: "tracklab", version: VERSION });
}
function serializeTrack(track) {
  return canonicalStringify(exportTrack(track));
}

// ../../../src/sha256.ts
var K2 = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
function sha256Bytes2(data) {
  const h = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  const total = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(total);
  padded.set(data);
  padded[data.length] = 128;
  const view = new DataView(padded.buffer);
  view.setUint32(total - 8, Math.floor(data.length / 536870912));
  view.setUint32(total - 4, data.length << 3 >>> 0);
  const w = new Uint32Array(64);
  const rotr = (x, n) => x >>> n | x << 32 - n;
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + (e & f ^ ~e & g) + K2[i] + w[i] >>> 0;
      const t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  const out = new Uint8Array(32), ov = new DataView(out.buffer);
  h.forEach((v, i) => ov.setUint32(i * 4, v));
  return out;
}
function sha2562(text) {
  return Array.from(sha256Bytes2(new TextEncoder().encode(text)), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ../cases.mjs
var FIXED = [0, 1, 2, 3, 7, 42, 100, 1234, 12345, 65535, 65536, 99999, 1e6, 16777216, 2147483646, 2147483647];
var SEEDS_SHA256 = "5c5e64d680cecf26dacdad15c0766f498c9c85a997c0df1531b49e5a327a9f07";
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = s + 1831565813 >>> 0;
    let t = Math.imul(s ^ s >>> 15, s | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var SEEDS = (() => {
  const r = mulberry32(20261111), seeds = [...FIXED];
  while (seeds.length < 200) {
    const v = Math.floor(r() * 2147483648);
    if (!seeds.includes(v)) seeds.push(v);
  }
  return seeds;
})();
if (sha2562(JSON.stringify(SEEDS)) !== SEEDS_SHA256) throw new Error("E1 seed list does not match PROTOCOL.md");
var CONFIGS = [
  ["auto", {}],
  ["right-angle", { cornerPattern: "right-angle", cornerCount: 2, cornerStrength: 60 }],
  ["hairpin", { cornerPattern: "hairpin", cornerCount: 1, cornerStrength: 80 }],
  ["s-curve", { cornerPattern: "s-curve", cornerCount: 3, cornerStrength: 40, curves: 8 }],
  ["extreme", { curves: 10, size: 3, width: 80, height: 200, obstacles: 8, density: 20 }]
];
var CASES = CONFIGS.flatMap(([cid, over]) => SEEDS.map((seed) => ({ id: `${cid}:${seed}`, params: { ...over, seed } })));
if (CASES.length !== 1e3) throw new Error("expected 1000 cases");

// measure.mjs
function measure(g, version) {
  const cases = CASES.map((c) => {
    try {
      const json = g.serializeTrack(g.generateTrack(c.params));
      const { integrity, generator, ...content } = JSON.parse(json);
      const contentDigest = g.sha256(g.canonicalStringify(content));
      return {
        id: c.id,
        digest: g.sha256(json),
        contentDigest,
        embeddedOk: integrity.contentDigest === void 0 ? null : integrity.contentDigest === contentDigest
      };
    } catch (e) {
      const t = "THROW:" + (e && e.name || "Error");
      return { id: c.id, digest: t, contentDigest: t, embeddedOk: null };
    }
  });
  return { generatorVersion: version, selfTest: g.sha256("abc") === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", cases };
}

// entry-v050.mjs
var runSubject = () => measure({ generateTrack, canonicalStringify, serializeTrack, sha256 }, VERSION);
export {
  runSubject
};
