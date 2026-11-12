// Auto join (core.ts `autoJoin`): backward compatibility with v1.0.0 on committed evidence, heading continuity,
// closure, determinism and schema round trips. See docs/generator-auto-join.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, JOIN_BLEND, STEPS, generateTrack, sanitize, type Params } from '../src/core.js';
import { sha256 } from '../src/sha256.js';
import { TrackDocumentError, canonicalStringify, exportTrack, importTrack, parseTrackDocument, serializeTrack,
  type TrackDocumentV1 } from '../src/schema.js';
import { validateTrack } from '../src/validate.js';

// ---- the 1000 E1 cases (experiments/e1/cases.mjs, reproduced here; the seed list is pinned by its SHA-256) ----
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const FIXED = [0, 1, 2, 3, 7, 42, 100, 1234, 12345, 65535, 65536, 99999, 1000000, 16777216, 2147483646, 2147483647];
const SEEDS = (() => {
  const r = mulberry32(20261111), seeds = [...FIXED];
  while (seeds.length < 200) { const v = Math.floor(r() * 2147483648); if (!seeds.includes(v)) seeds.push(v); }
  return seeds;
})();
const CONFIGS: [string, Partial<Params>][] = [
  ['auto', {}],
  ['right-angle', { cornerPattern: 'right-angle', cornerCount: 2, cornerStrength: 60 }],
  ['hairpin', { cornerPattern: 'hairpin', cornerCount: 1, cornerStrength: 80 }],
  ['s-curve', { cornerPattern: 's-curve', cornerCount: 3, cornerStrength: 40, curves: 8 }],
  ['extreme', { curves: 10, size: 3, width: 80, height: 200, obstacles: 8, density: 20 }],
];
const E1 = JSON.parse(readFileSync('experiments/e1/results/v1.0.0/node22.v100.json', 'utf8')) as
  { generatorVersion: string; cases: { id: string; digest: string; contentDigest: string }[] };

test('compat: E1 seed list is the pinned one and the stored v1.0.0 run has all 1000 cases', () => {
  assert.equal(sha256(JSON.stringify(SEEDS)), '5c5e64d680cecf26dacdad15c0766f498c9c85a997c0df1531b49e5a327a9f07');
  assert.equal(E1.generatorVersion, '1.0.0');
  assert.deepEqual(E1.cases.map(c => c.id), CONFIGS.flatMap(([cid]) => SEEDS.map(s => `${cid}:${s}`)));
});

test('compat: all 1000 E1 v1.0.0 documents regenerate bit-identically (contentDigest) under the legacy join, and import with verify regenerate', () => {
  let n = 0, viaDefaultPath = 0;
  for (const [cid, over] of CONFIGS) for (const seed of SEEDS) {
    const stored = E1.cases[n++];
    assert.equal(stored.id, `${cid}:${seed}`);
    // 1. the v1.0.0 parameter object interpreted as a v1.0.0 document (no autoJoin key = legacy)
    const doc = exportTrack(generateTrack({ ...over, seed, autoJoin: 'legacy' }));
    assert.equal(doc.integrity.contentDigest, stored.contentDigest, stored.id);
    assert.equal('autoJoin' in doc.params, false, stored.id);
    // 2. the stored document round-trips through the importer, which must regenerate it with the legacy join
    importTrack(JSON.parse(JSON.stringify(doc)), { verify: 'regenerate' });
    // 3. pattern configurations do not depend on the join at all: the plain (default-parameter) path matches too
    if (cid !== 'auto' && cid !== 'extreme') {
      assert.equal(exportTrack(generateTrack({ ...over, seed })).integrity.contentDigest, stored.contentDigest, stored.id);
      viaDefaultPath++;
    }
  }
  assert.equal(n, 1000); assert.equal(viaDefaultPath, 600);
});

test('compat: the 8 CI golden digests (legacy file for the legacy join, v1.1 file for the default join)', () => {
  const legacy = JSON.parse(readFileSync('tests/fixtures/ci-golden-digests.json', 'utf8')) as Record<string, string>;
  const current = JSON.parse(readFileSync('tests/fixtures/ci-golden-digests-v1.1.json', 'utf8')) as Record<string, string>;
  assert.equal(Object.keys(legacy).length, 8); assert.deepEqual(Object.keys(current), Object.keys(legacy));
  for (const seed of [0, 1, 42, 7]) for (const pattern of ['auto', 'hairpin'] as const) {
    const key = `seed-${seed}-${pattern}`;
    assert.equal(exportTrack(generateTrack({ seed, cornerPattern: pattern, autoJoin: 'legacy' })).integrity.contentDigest, legacy[key], key);
    assert.equal(exportTrack(generateTrack({ seed, cornerPattern: pattern })).integrity.contentDigest, current[key], key);
    if (pattern === 'hairpin') assert.equal(current[key], legacy[key], key); // inert option: same document
    else assert.notEqual(current[key], legacy[key], key);
  }
});

// ---- geometry of the tangent join ----
const turn = (P: { x: number; z: number }[], i: number) => {
  const n = P.length - 1, a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
  const x0 = b.x - a.x, z0 = b.z - a.z, x1 = c.x - b.x, z1 = c.z - b.z;
  return Math.abs(Math.atan2(x0 * z1 - z0 * x1, x0 * x1 + z0 * z1)) * 180 / Math.PI;
};
const SEED_SET = [0, 1, 2, 3, 5, 7, 42, 99, 1234, 500000];

test('tangent join: heading is continuous at every join of a straight (no spike), legacy has one', () => {
  let joins = 0, legacyAbove = 0;
  for (const seed of SEED_SET) for (const curves of [3, 4, 6, 8, 10]) for (const straight of [0.3, 0.6]) {
    const t = generateTrack({ seed, curves, straight, autoJoin: 'tangent' });
    const l = generateTrack({ seed, curves, straight, autoJoin: 'legacy' });
    assert.equal(t.params.autoJoin, 'tangent'); assert.equal(l.params.autoJoin, 'legacy');
    assert.deepEqual(t.straightSegments, l.straightSegments); // same segments are straight
    assert.equal(t.points.length, l.points.length); assert.equal(t.points.length, curves * STEPS + 1);
    for (let i = 0; i < curves; i++) {
      if (!t.straightSegments[i] && !t.straightSegments[(i - 1 + curves) % curves]) continue;
      joins++;
      assert.ok(turn(t.points, i * STEPS) < 12, `tangent join turn ${turn(t.points, i * STEPS)} (seed ${seed}, curves ${curves}, straight ${straight}, join ${i})`);
      if (turn(l.points, i * STEPS) > 12) legacyAbove++;
    }
    // no vertex anywhere of the loop (incl. the closing seam) turns more than 20 degrees
    for (let i = 0; i < t.points.length - 1; i++) assert.ok(turn(t.points, i) < 20, `vertex ${i}`);
    const r = validateTrack(t);
    assert.equal(r.violations.some(v => v.code === 'LOCAL_KINK' || v.code === 'CLOSURE_TANGENT'), false);
  }
  assert.ok(joins >= 300); assert.ok(legacyAbove >= joins * 0.8, `legacy join turn above 12 degrees in ${legacyAbove} of ${joins} joins`);
});

test('tangent join: waypoints are hit, loop is closed, straight middles are exactly straight, heights unchanged', () => {
  for (const seed of SEED_SET) for (const curves of [3, 6, 10]) for (const straight of [0.3, 0.6]) {
    const t = generateTrack({ seed, curves, straight });
    const l = generateTrack({ seed, curves, straight, autoJoin: 'legacy' });
    assert.deepEqual(t.points.at(-1), t.points[0]);
    assert.deepEqual(t.waypoints, l.waypoints);
    for (let i = 0; i < curves; i++) {
      assert.equal(t.points[i * STEPS].x, t.waypoints[i].x); assert.equal(t.points[i * STEPS].z, t.waypoints[i].z);
      for (let j = 0; j < STEPS; j++) assert.equal(t.points[i * STEPS + j].y, l.points[i * STEPS + j].y);
      if (!t.straightSegments[i]) continue;
      // the unblended middle of a straight keeps the chord direction exactly (up to float rounding)
      const head = t.straightSegments[(i - 1 + curves) % curves] ? Math.round(JOIN_BLEND * STEPS) : 0;
      const tail = t.straightSegments[(i + 1) % curves] ? Math.round(JOIN_BLEND * STEPS) : 0;
      for (let j = head + 1; j < STEPS - tail - 1; j++) assert.ok(turn(t.points, i * STEPS + j) < 1e-6);
      assert.ok(STEPS - head - tail >= 18);
    }
  }
});

test('tangent join: straight = 0 gives the legacy points bit-for-bit; non-Auto patterns ignore the option', () => {
  for (const seed of SEED_SET) for (const curves of [3, 6, 10]) {
    const t = generateTrack({ seed, curves, straight: 0, autoJoin: 'tangent' }), l = generateTrack({ seed, curves, straight: 0, autoJoin: 'legacy' });
    assert.deepEqual(t.points, l.points); assert.deepEqual(t.roadEdges, l.roadEdges); assert.equal(t.length, l.length);
  }
  for (const cornerPattern of ['right-angle', 'hairpin', 's-curve'] as const) {
    const t = generateTrack({ seed: 11, cornerPattern, cornerCount: 1, autoJoin: 'tangent' });
    assert.equal(t.params.autoJoin, 'legacy'); // canonicalised: inert when a pattern is spliced
    assert.deepEqual(t.points, generateTrack({ seed: 11, cornerPattern, cornerCount: 1, autoJoin: 'legacy' }).points);
  }
  // cornerCount 0 splices nothing, so the join is live
  assert.equal(sanitize({ cornerPattern: 'hairpin', cornerCount: 0 }).autoJoin, 'tangent');
});

test('tangent join: two runs give identical documents; DEFAULTS select the tangent join and are valid for 50 seeds', () => {
  assert.equal(DEFAULTS.autoJoin, 'tangent'); assert.equal(generateTrack({}).params.autoJoin, 'tangent');
  for (const seed of SEED_SET) {
    const a = serializeTrack(generateTrack({ seed, straight: 0.4, curves: 8 })), b = serializeTrack(generateTrack({ seed, straight: 0.4, curves: 8 }));
    assert.equal(a, b);
  }
  for (let seed = 0; seed < 50; seed++) assert.equal(validateTrack(generateTrack({ seed })).ok, true, `seed ${seed}`);
});

test('sanitize: autoJoin validated, unknown value falls back to the default, legacy kept for Auto', () => {
  assert.equal(sanitize({}).autoJoin, 'tangent');
  assert.equal(sanitize({ autoJoin: 'legacy' }).autoJoin, 'legacy');
  assert.equal(sanitize({ autoJoin: 'bogus' as never }).autoJoin, 'tangent');
  assert.equal(sanitize({ cornerPattern: 'hairpin', cornerCount: 1, autoJoin: 'tangent' }).autoJoin, 'legacy');
});

// ---- schema ----
const rejects = (fn: () => unknown, pathPattern: RegExp) =>
  assert.throws(fn, (e: unknown) => e instanceof TrackDocumentError && pathPattern.test(e.path));

test('schema: legacy documents are byte-identical to v1.0.0 (no autoJoin key) and import as legacy; tangent documents store the key', () => {
  const legacyTrack = generateTrack({ seed: 5, curves: 7, straight: 0.3, autoJoin: 'legacy' });
  const legacyDoc = exportTrack(legacyTrack);
  assert.equal('autoJoin' in legacyDoc.params, false);
  assert.equal(Object.keys(legacyDoc.params).length, Object.keys(DEFAULTS).length - 1);
  assert.equal(legacyDoc.schemaVersion, 1);
  const imported = importTrack(JSON.parse(serializeTrack(legacyTrack)), { verify: 'regenerate' });
  assert.equal(imported.params.autoJoin, 'legacy'); assert.deepEqual(imported.points, legacyTrack.points);

  const tangentTrack = generateTrack({ seed: 5, curves: 7, straight: 0.3 });
  const tangentDoc = exportTrack(tangentTrack);
  assert.equal(tangentDoc.params.autoJoin, 'tangent'); assert.equal(tangentDoc.schemaVersion, 1);
  assert.notEqual(tangentDoc.integrity.contentDigest, legacyDoc.integrity.contentDigest);
  const text = serializeTrack(tangentTrack);
  const back = importTrack(JSON.parse(text), { verify: 'regenerate' });
  assert.equal(back.params.autoJoin, 'tangent'); assert.deepEqual(back.points, tangentTrack.points);
  assert.equal(canonicalStringify(parseTrackDocument(text)), text); // canonical text is a fixed point
  assert.deepEqual(exportTrack(generateTrack(back.params)).integrity, tangentDoc.integrity);
});

test('schema: a legacy document is regenerated as legacy even though the default is tangent', () => {
  // A document with the defaults and NO autoJoin key must verify only against the legacy generator.
  const doc = JSON.parse(serializeTrack(generateTrack({ seed: 7, autoJoin: 'legacy' }))) as TrackDocumentV1;
  assert.equal(doc.params.curves, DEFAULTS.curves); assert.equal(doc.params.straight, DEFAULTS.straight);
  importTrack(doc, { verify: 'regenerate' });
  assert.notEqual(exportTrack(generateTrack({ ...doc.params })).integrity.contentDigest, doc.integrity.contentDigest); // raw params -> DEFAULTS merge -> tangent
});

test('schema: autoJoin is validated strictly', () => {
  const base = JSON.parse(serializeTrack(generateTrack({ seed: 3, curves: 5, straight: 0.3 }))) as Record<string, any>;
  const resign = (mutate: (d: Record<string, any>) => void) => {
    const d = JSON.parse(JSON.stringify(base)); mutate(d);
    const { integrity: _i, ...body } = d, { generator: _g, ...content } = body;
    d.integrity = { algorithm: 'sha256', canonical: 'sorted-keys-json', digest: sha256(canonicalStringify(body)), contentDigest: sha256(canonicalStringify(content)) };
    return d;
  };
  assert.doesNotThrow(() => parseTrackDocument(resign(() => {})));
  rejects(() => parseTrackDocument(resign(d => { d.params.autoJoin = 'legacy'; })), /^\$\.params\.autoJoin$/); // legacy = key absent
  rejects(() => parseTrackDocument(resign(d => { d.params.autoJoin = 'smooth'; })), /^\$\.params\.autoJoin$/);
  rejects(() => parseTrackDocument(resign(d => { d.params.autoJoin = 1; })), /^\$\.params\.autoJoin$/);
  rejects(() => parseTrackDocument(resign(d => { d.params.cornerPattern = 'hairpin'; d.params.cornerCount = 1; })), /^\$\.params\.autoJoin$/); // inert with a pattern
  rejects(() => parseTrackDocument(resign(d => { delete d.params.curves; })), /^\$\.params\.curves$/);
  rejects(() => parseTrackDocument(resign(d => { d.params.extra = 1; })), /^\$\.params\.extra$/);
  // tampering with the stored join is caught by the digest
  const tampered = JSON.parse(JSON.stringify(base)); delete tampered.params.autoJoin;
  rejects(() => parseTrackDocument(tampered), /^\$\.integrity\.digest$/);
  // a document that claims the tangent join but carries legacy geometry fails regeneration
  const legacyDoc = JSON.parse(serializeTrack(generateTrack({ seed: 3, curves: 5, straight: 0.3, autoJoin: 'legacy' })));
  const forged = resign(d => { Object.assign(d, { geometry: legacyDoc.geometry }); });
  rejects(() => importTrack(forged, { verify: 'regenerate' }), /^\$\.integrity\.contentDigest$/);
});
