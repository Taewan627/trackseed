import test from 'node:test';
import assert from 'node:assert/strict';
import legacyAssert from 'node:assert';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { LIMITS, generateTrack, type Params, type Track } from '../src/core.js';
import { PatternGenerationError } from '../src/patterns.js';
import { sha256 } from '../src/sha256.js';
import { VERSION } from '../src/version.js';
import { TrackDocumentError, canonicalStringify, exportTrack, importTrack, parseTrackDocument,
  serializeTrack, type TrackDocumentV1 } from '../src/schema.js';

function stream(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const rejects = (fn: () => unknown, pathPattern: RegExp) =>
  assert.throws(fn, (e: unknown) => e instanceof TrackDocumentError && pathPattern.test(e.path) && e.message.startsWith(e.path + ': '));

test('version.ts matches package.json and is what exportTrack stamps', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  assert.equal(VERSION, pkg.version); assert.equal(VERSION, '1.1.0');
  assert.deepEqual(exportTrack(generateTrack({ obstacles: 0, density: 0 })).generator, { name: 'tracklab', version: pkg.version });
});

test('sha256: matches node:crypto on 1500 random strings (ASCII, non-ASCII, astral, lone surrogates, block-edge lengths)', () => {
  const known = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
  assert.equal(sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const r = stream(2024);
  const alphabet = ['a', 'Z', '0', ' ', '\n', '{', '"', 'é', 'ß', '한', '글', '트', '𝄞', '😀', '\u0000', '\ud800', '\udc00', '￿'];
  let count = 0;
  for (const len of [0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129]) {
    for (let k = 0; k < 20; k++) { const s = 'x'.repeat(len).split('').map(() => alphabet[Math.floor(r() * alphabet.length)]).join(''); assert.equal(sha256(s), known(s)); count++; }
  }
  while (count < 1500) {
    const len = Math.floor(r() * 400); let s = '';
    for (let i = 0; i < len; i++) s += r() < 0.5 ? String.fromCharCode(Math.floor(r() * 0xffff)) : alphabet[Math.floor(r() * alphabet.length)];
    assert.equal(sha256(s), known(s), JSON.stringify(s)); count++;
  }
  const big = randomBytes(200000).toString('base64'); assert.equal(sha256(big), known(big));
});

test('canonicalStringify: sorted keys, no whitespace, JSON numbers; rejects NaN/Infinity', () => {
  assert.equal(canonicalStringify({ b: 1, a: [true, null, { z: 0.1, y: 'é' }], c: undefined }), '{"a":[true,null,{"y":"é","z":0.1}],"b":1}');
  assert.equal(canonicalStringify({ n: 1e21, m: 1.5e-7, k: -0 }), '{"k":0,"m":1.5e-7,"n":1e+21}');
  assert.equal(canonicalStringify({ a: 1, b: 2 }), canonicalStringify({ b: 2, a: 1 }));
  for (const bad of [NaN, Infinity, -Infinity]) {
    rejects(() => canonicalStringify({ p: [1, { q: bad }] }), /^\$\.p\[1\]\.q$/);
  }
});

function randomParams(r: () => number): Partial<Params> {
  const pick = (k: keyof typeof LIMITS) => { const [lo, hi, step] = LIMITS[k]; return lo + Math.floor(r() * ((hi - lo) / step + 1)) * step; };
  const p: Partial<Params> = { curves: pick('curves'), straight: Math.round(pick('straight') * 100) / 100, width: pick('width'), size: pick('size'),
    height: pick('height'), obstacles: pick('obstacles'), density: pick('density'), seed: Math.floor(r() * 2147483647),
    scene: (['nature', 'city', 'mixed'] as const)[Math.floor(r() * 3)] };
  if (r() < 0.55) Object.assign(p, { cornerPattern: (['right-angle', 'hairpin', 's-curve'] as const)[Math.floor(r() * 3)],
    cornerCount: 1 + Math.floor(r() * 3), cornerStrength: pick('cornerStrength') });
  return p;
}

test('exchange format: export -> serialize -> parse -> import is lossless for >= 200 seeded random param sets; regenerate verifies all', () => {
  const r = stream(0x5eed);
  let ok = 0, patterned = 0, skipped = 0;
  while (ok < 200) {
    const params = randomParams(r);
    let track: Track;
    try { track = generateTrack(params); }
    catch (e) { assert.ok(e instanceof PatternGenerationError); skipped++; continue; }
    const doc = exportTrack(track), json = serializeTrack(track);
    assert.equal(json, canonicalStringify(doc)); assert.ok(!/\s/.test(json.replace(/"(?:[^"\\]|\\.)*"/g, '')));
    const parsed = parseTrackDocument(json);
    assert.deepStrictEqual(parsed, doc); assert.equal(serializeTrack(track), canonicalStringify(parsed));
    for (const mode of ['digest', 'regenerate'] as const) {
      const back = importTrack(parsed, { verify: mode });
      // JSON cannot carry the sign of -0, so compare numerically (legacy deepEqual treats -0 == 0).
      legacyAssert.deepEqual(back.points, track.points); legacyAssert.deepEqual(back.normals, track.normals);
      legacyAssert.deepEqual(back.roadEdges, track.roadEdges); legacyAssert.deepEqual(back.straightSegments, track.straightSegments);
      legacyAssert.deepEqual(back.bounds, track.bounds); assert.equal(back.length, track.length);
      legacyAssert.deepEqual(back.props, track.props); legacyAssert.deepEqual(back.obstacles, track.obstacles);
      legacyAssert.deepEqual(back.params, track.params); assert.equal(back.coins.length, 10);
      assert.equal(back.patternReport.inserted, track.patternReport.inserted);
    }
    assert.deepStrictEqual(importTrack(json, { verify: 'regenerate' }).points, parsed.geometry.points);
    if (track.patternReport.inserted) patterned++;
    ok++;
  }
  assert.ok(patterned >= 60, `pattern-mode coverage ${patterned}`);
  console.log(`# schema round-trip: ${ok} ok (${patterned} with patterns), ${skipped} param sets rejected by PatternGenerationError`);
});

const resign = (o: Record<string, any>) => {
  const { integrity, ...body } = o; const { generator: _g, ...content } = body;
  return { ...o, integrity: { ...integrity, digest: sha256(canonicalStringify(body)), contentDigest: sha256(canonicalStringify(content)) } };
};

test('exchange format: tampering, schema/version errors and structural problems throw TrackDocumentError', () => {
  const track = generateTrack({ cornerPattern: 'hairpin', cornerCount: 1, seed: 11 });
  const json = serializeTrack(track), base = () => JSON.parse(json) as Record<string, any>;
  // Flip one coordinate / change one param / change the schema version.
  const flipped = base(); flipped.geometry.points[7].x += 1e-9;
  rejects(() => parseTrackDocument(JSON.stringify(flipped)), /^\$\.integrity\.digest$/);
  const edge = base(); edge.geometry.roadEdges[1][3].z += 0.5;
  rejects(() => parseTrackDocument(edge), /^\$\.integrity\.digest$/);
  const param = base(); param.params.width += 1;
  rejects(() => importTrack(param, { verify: 'digest' }), /^\$\.integrity\.digest$/);
  const version = base(); version.schemaVersion = 2;
  rejects(() => parseTrackDocument(JSON.stringify(version)), /^\$\.schemaVersion$/);
  const resignedVersion = resign(version); rejects(() => parseTrackDocument(resignedVersion), /^\$\.schemaVersion$/);
  const name = base(); name.schema = 'other'; rejects(() => parseTrackDocument(name), /^\$\.schema$/);
  // Structure.
  const missing = base(); delete missing.geometry.length; rejects(() => parseTrackDocument(missing), /^\$\.geometry\.length$/);
  const extra = base(); extra.surprise = 1; rejects(() => parseTrackDocument(extra), /^\$\.surprise$/);
  const nan = base(); nan.geometry.points[2].y = NaN; rejects(() => parseTrackDocument(nan), /^\$\.geometry\.points\[2\]\.y$/);
  const inf = base(); inf.obstacles = [{ x: 0, y: 0, z: Infinity, radius: 4, heading: 0 }]; rejects(() => parseTrackDocument(inf), /^\$\.obstacles\[0\]\.z$/);
  const shortNormals = base(); shortNormals.geometry.normals.pop(); rejects(() => parseTrackDocument(shortNormals), /^\$\.geometry\.normals$/);
  const badKind = base(); badKind.patternReport.patterns[0].kind = 'loop'; rejects(() => parseTrackDocument(badKind), /^\$\.patternReport\.patterns\[0\]\.kind$/);
  const badContent = base(); badContent.integrity.contentDigest = 'ABC'; rejects(() => parseTrackDocument(badContent), /^\$\.integrity\.contentDigest$/);
  const noContent = base(); delete noContent.integrity.contentDigest; rejects(() => parseTrackDocument(noContent), /^\$\.integrity\.contentDigest$/);
  const badDigest = base(); badDigest.integrity.digest = 'ABC'; rejects(() => parseTrackDocument(badDigest), /^\$\.integrity\.digest$/);
  const badAlg = base(); badAlg.integrity.algorithm = 'md5'; rejects(() => parseTrackDocument(badAlg), /^\$\.integrity\.algorithm$/);
  rejects(() => parseTrackDocument('{not json'), /^\$$/);
  rejects(() => parseTrackDocument('[]'), /^\$$/);
  rejects(() => parseTrackDocument(null), /^\$$/);
  // Out-of-range / non-sanitized params are refused even when correctly re-signed.
  const wild = base(); wild.params.curves = 99; rejects(() => parseTrackDocument(resign(wild)), /^\$\.params\.curves$/);
  assert.ok(new TrackDocumentError('$.x', 'y') instanceof Error);
  // The untouched document still imports.
  assert.doesNotThrow(() => importTrack(json, { verify: 'regenerate' }));
});

test('exchange format: a re-signed forgery passes digest mode but regenerate mode catches it', () => {
  const doc = JSON.parse(serializeTrack(generateTrack({ seed: 5 }))) as Record<string, any>;
  const geom = JSON.parse(JSON.stringify(doc)); geom.geometry.points[10].x += 1;
  assert.doesNotThrow(() => importTrack(resign(geom), { verify: 'digest' }));
  rejects(() => importTrack(resign(geom), { verify: 'regenerate' }), /^\$\.integrity\.contentDigest$/);
  const par = JSON.parse(JSON.stringify(doc)); par.params.seed = 6;
  assert.doesNotThrow(() => importTrack(resign(par), { verify: 'digest' }));
  rejects(() => importTrack(resign(par), { verify: 'regenerate' }), /^\$\.integrity\.contentDigest$/);
  const coin = JSON.parse(JSON.stringify(doc)); coin.coins[0].x += 0.25;
  rejects(() => importTrack(resign(coin), { verify: 'regenerate' }), /^\$\.integrity\.contentDigest$/);
  rejects(() => importTrack(doc, { verify: 'bogus' as never }), /^\$$/);
  // A document stamped by another generator version still regenerates if the content is identical.
  const other = JSON.parse(JSON.stringify(doc)); other.generator.version = '0.0.1';
  assert.doesNotThrow(() => importTrack(resign(other), { verify: 'regenerate' }));
  const typed: TrackDocumentV1 = parseTrackDocument(JSON.stringify(doc)); assert.equal(typed.schemaVersion, 1);
});

test('integrity.contentDigest: excludes generator, is stable across a simulated version change; digest still covers it', () => {
  const doc = JSON.parse(serializeTrack(generateTrack({ seed: 21, cornerPattern: 's-curve', cornerCount: 1 }))) as Record<string, any>;
  const { generator: _g, integrity: _i, ...content } = doc;
  assert.equal(doc.integrity.contentDigest, sha256(canonicalStringify(content)));
  const { integrity: _i2, ...whole } = doc;
  assert.equal(doc.integrity.digest, sha256(canonicalStringify(whole)));
  assert.notEqual(doc.integrity.digest, doc.integrity.contentDigest);
  // Simulated version change: only the generator stamp differs; digest changes, contentDigest does not.
  const bumped = resign({ ...JSON.parse(JSON.stringify(doc)), generator: { name: 'tracklab', version: '9.9.9' } });
  assert.notEqual(bumped.integrity.digest, doc.integrity.digest);
  assert.equal(bumped.integrity.contentDigest, doc.integrity.contentDigest);
  assert.doesNotThrow(() => parseTrackDocument(bumped));
  assert.doesNotThrow(() => importTrack(bumped, { verify: 'regenerate' }));
  // Editing the generator stamp without re-signing is caught by digest; it leaves contentDigest valid.
  const stamped = JSON.parse(JSON.stringify(doc)); stamped.generator.version = '9.9.9';
  rejects(() => parseTrackDocument(stamped), /^\$\.integrity\.digest$/);
  // Tampering with content while re-signing only digest (not contentDigest) is caught by contentDigest.
  const forged = JSON.parse(JSON.stringify(doc)); forged.geometry.points[4].z += 1;
  const { integrity: fi, ...fbody } = forged;
  forged.integrity = { ...fi, digest: sha256(canonicalStringify(fbody)) };
  rejects(() => parseTrackDocument(forged), /^\$\.integrity\.contentDigest$/);
  // Replacing contentDigest only (digest untouched) is caught by digest first.
  const swapped = JSON.parse(JSON.stringify(doc)); swapped.integrity.contentDigest = doc.integrity.digest;
  assert.throws(() => parseTrackDocument(swapped), (e: unknown) => e instanceof TrackDocumentError && /^\$\.integrity\.contentDigest$/.test(e.path));
});
