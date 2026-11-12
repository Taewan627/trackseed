// JSON Schema (schema/trackdocument-v1.schema.json) vs src/schema.ts: a small dependency-free validator for the subset of
// JSON Schema 2020-12 that the schema file uses (an unsupported keyword makes the validator throw, so the subset cannot silently grow).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, LIMITS, generateTrack, type Params } from '../src/core.js';
import { TrackDocumentError, exportTrack, importTrack } from '../src/schema.js';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Schema = { [k: string]: Json };
const schema = JSON.parse(readFileSync('schema/trackdocument-v1.schema.json', 'utf8')) as Schema;
const ANNOTATIONS = new Set(['$schema', '$id', 'title', 'description', '$defs']);
const KEYWORDS = new Set(['type', 'const', 'enum', 'required', 'properties', 'additionalProperties', 'items', 'minItems', 'maxItems',
  'minimum', 'maximum', 'pattern', 'oneOf', 'not', 'if', 'then', '$ref']);

const isObj = (v: unknown): v is { [k: string]: Json } => typeof v === 'object' && v !== null && !Array.isArray(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b); // enough for the scalar const/enum values used
function typeOk(t: string, v: unknown): boolean {
  switch (t) {
    case 'object': return isObj(v);
    case 'array': return Array.isArray(v);
    case 'string': return typeof v === 'string';
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    case 'integer': return typeof v === 'number' && Number.isInteger(v);
    case 'boolean': return typeof v === 'boolean';
    case 'null': return v === null;
    default: throw new Error(`unsupported type ${t}`);
  }
}
/** Errors of `value` against `s` (empty = valid). */
function check(s: Schema, value: unknown, path = '$'): string[] {
  const errs: string[] = [];
  for (const k of Object.keys(s)) if (!KEYWORDS.has(k) && !ANNOTATIONS.has(k)) throw new Error(`unsupported keyword ${k}`);
  if (s.$ref !== undefined) {
    const m = /^#\/\$defs\/(\w+)$/.exec(String(s.$ref));
    if (!m || !isObj(schema.$defs) || !isObj(schema.$defs[m[1]])) throw new Error(`unsupported $ref ${s.$ref}`);
    errs.push(...check(schema.$defs[m[1]] as Schema, value, path));
  }
  if (s.type !== undefined && !typeOk(String(s.type), value)) return [...errs, `${path}: expected ${s.type}`];
  if (s.const !== undefined && !same(s.const, value)) errs.push(`${path}: expected const ${JSON.stringify(s.const)}`);
  if (s.enum !== undefined && !(s.enum as Json[]).some(e => same(e, value))) errs.push(`${path}: not in enum`);
  if (typeof value === 'number') {
    if (s.minimum !== undefined && value < (s.minimum as number)) errs.push(`${path}: below minimum`);
    if (s.maximum !== undefined && value > (s.maximum as number)) errs.push(`${path}: above maximum`);
  }
  if (typeof value === 'string' && s.pattern !== undefined && !new RegExp(String(s.pattern)).test(value)) errs.push(`${path}: pattern`);
  if (Array.isArray(value)) {
    if (s.minItems !== undefined && value.length < (s.minItems as number)) errs.push(`${path}: too few items`);
    if (s.maxItems !== undefined && value.length > (s.maxItems as number)) errs.push(`${path}: too many items`);
    if (isObj(s.items)) value.forEach((x, i) => errs.push(...check(s.items as Schema, x, `${path}[${i}]`)));
  }
  if (isObj(value)) {
    for (const k of (s.required as string[] | undefined) ?? []) if (!(k in value) || value[k] === undefined) errs.push(`${path}.${k}: missing`);
    const props = (s.properties as { [k: string]: Schema } | undefined) ?? {};
    for (const k of Object.keys(value)) {
      if (k in props) errs.push(...check(props[k], value[k], `${path}.${k}`));
      else if (s.additionalProperties === false) errs.push(`${path}.${k}: unknown field`);
    }
  }
  if (s.oneOf !== undefined) {
    const ok = (s.oneOf as Schema[]).filter(sub => check(sub, value, path).length === 0).length;
    if (ok !== 1) errs.push(`${path}: matches ${ok} of oneOf`);
  }
  if (s.not !== undefined && check(s.not as Schema, value, path).length === 0) errs.push(`${path}: matches a forbidden schema`);
  if (s.if !== undefined && check(s.if as Schema, value, path).length === 0 && s.then !== undefined) errs.push(...check(s.then as Schema, value, path));
  return errs;
}
const schemaErrors = (doc: unknown) => check(schema, doc);

const toDoc = (p: Partial<Params>) => JSON.parse(JSON.stringify(exportTrack(generateTrack(p)))) as Record<string, any>;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const importOk = (doc: unknown) => { importTrack(doc, { verify: 'regenerate' }); };

// the 8 CI golden documents, regenerated as in scripts/ci-digests.mjs (height pinned to the value the goldens were recorded at)
const GOLDEN_SEEDS = [0, 1, 42, 7], GOLDEN_PATTERNS = ['auto', 'hairpin'] as const;

test('json schema: structural facts mirror LIMITS, DEFAULTS and the validator enums', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  const params = (schema.$defs as Record<string, Schema>).params, props = params.properties as Record<string, Schema>;
  assert.deepEqual([...(params.required as string[])].sort(), Object.keys(DEFAULTS).filter(k => k !== 'autoJoin').sort());
  assert.deepEqual(Object.keys(props).sort(), Object.keys(DEFAULTS).sort());
  for (const [k, [lo, hi]] of Object.entries(LIMITS)) {
    assert.equal(props[k].minimum, lo, k); assert.equal(props[k].maximum, hi, k);
    assert.equal(props[k].type, k === 'straight' ? 'number' : 'integer', k);
  }
  assert.deepEqual(props.autoJoin, { const: 'tangent' });
  assert.equal(params.additionalProperties, false);
});

test('json schema: the 8 CI golden documents (legacy join: no autoJoin key; default join) validate against the schema and import with verify regenerate', () => {
  let n = 0;
  for (const autoJoin of ['legacy', 'tangent'] as const) for (const seed of GOLDEN_SEEDS) for (const cornerPattern of GOLDEN_PATTERNS) {
    const doc = toDoc({ seed, cornerPattern, height: 80, autoJoin });
    assert.deepEqual(schemaErrors(doc), [], `${autoJoin} seed ${seed} ${cornerPattern}`);
    importOk(doc); n++;
  }
  assert.equal(n, 16); // 8 legacy + 8 tangent (the hairpin ones are identical under both joins)
});

test('json schema: the committed v1.0.0 document validates and imports; tangent, pattern and flat documents validate', () => {
  const v100 = JSON.parse(readFileSync('tests/fixtures/v1.0.0-auto-seed42.json', 'utf8'));
  assert.equal('autoJoin' in v100.params, false);
  assert.deepEqual(schemaErrors(v100), []); importOk(v100);
  const docs = [
    toDoc({ seed: 5, curves: 7, straight: 0.3 }), toDoc({ seed: 11, curves: 10, straight: 0.6, size: 3, width: 80, height: 200 }),
    toDoc({ seed: 3, height: 0, obstacles: 0, density: 0 }), toDoc({ seed: 9, cornerPattern: 's-curve', cornerCount: 3, curves: 8 }),
    toDoc({ seed: 2, cornerPattern: 'right-angle', cornerCount: 0, straight: 0.2 }), toDoc({}),
  ];
  assert.equal(docs[0].params.autoJoin, 'tangent'); assert.equal('autoJoin' in docs[3].params, false);
  assert.equal(docs[4].params.autoJoin, 'tangent'); // pattern requested but count 0: the join still applies
  for (const [i, d] of docs.entries()) { assert.deepEqual(schemaErrors(d), [], `doc ${i}`); importOk(d); }
});

test('json schema: structurally broken documents are rejected by the schema and by importTrack', () => {
  const base = toDoc({ seed: 5, curves: 7, straight: 0.3 });
  const mutations: [string, (d: Record<string, any>) => void][] = [
    ['missing top-level key', d => { delete d.coins; }],
    ['unknown top-level key', d => { d.extra = 1; }],
    ['wrong schema name', d => { d.schema = 'other'; }],
    ['wrong schemaVersion', d => { d.schemaVersion = 2; }],
    ['generator.version not a string', d => { d.generator.version = 1; }],
    ['missing param', d => { delete d.params.width; }],
    ['unknown param', d => { d.params.extra = 1; }],
    ['param out of range (curves)', d => { d.params.curves = 11; }],
    ['param out of range (width)', d => { d.params.width = 19; }],
    ['param not an integer (height)', d => { d.params.height = 20.5; }],
    ['param wrong type (seed)', d => { d.params.seed = '42'; }],
    ['bad scene', d => { d.params.scene = 'desert'; }],
    ['bad cornerPattern', d => { d.params.cornerPattern = 'loop'; }],
    ['autoJoin legacy stored', d => { d.params.autoJoin = 'legacy'; }],
    ['autoJoin stored for a spliced pattern', d => { d.params.cornerPattern = 'hairpin'; d.params.cornerCount = 1; d.params.autoJoin = 'tangent'; }],
    ['point missing y', d => { delete d.geometry.points[3].y; }],
    ['point has an extra field', d => { d.geometry.points[0].w = 0; }],
    ['too few points', d => { d.geometry.points = d.geometry.points.slice(0, 3); }],
    ['three road edges', d => { d.geometry.roadEdges.push(d.geometry.roadEdges[0]); }],
    ['straightSegments not booleans', d => { d.geometry.straightSegments[0] = 1; }],
    ['bounds field missing', d => { delete d.geometry.bounds.maxY; }],
    ['prop kind', d => { d.props[0].kind = 'rock'; }],
    ['obstacle field missing', d => { delete d.obstacles[0].radius; }],
    ['coin id not an integer', d => { d.coins[0].id = 0.5; }],
    ['patternReport.selected', d => { d.patternReport.selected = 'loop'; }],
    ['patternReport.geometry wrong type', d => { d.patternReport.geometry = 5; }],
    ['integrity.algorithm', d => { d.integrity.algorithm = 'md5'; }],
    ['integrity.digest not hex', d => { d.integrity.digest = 'XYZ'; }],
    ['integrity.contentDigest short', d => { d.integrity.contentDigest = d.integrity.contentDigest.slice(1); }],
  ];
  assert.ok(base.props.length > 0 && base.obstacles.length > 0 && base.coins.length > 0);
  for (const [name, mutate] of mutations) {
    const d = clone(base); mutate(d);
    assert.notDeepEqual(schemaErrors(d), [], `schema must reject: ${name}`);
    assert.throws(() => importTrack(d), TrackDocumentError, `importTrack must reject: ${name}`);
  }
  assert.deepEqual(schemaErrors(base), []); importOk(base); // the unmutated base is valid for both
});

test('json schema: what the schema cannot express is caught by importTrack only (digests, array-length relations)', () => {
  const base = toDoc({ seed: 5, curves: 7, straight: 0.3 });
  const gaps: [string, (d: Record<string, any>) => void][] = [
    ['tampered digest (well-formed hex)', d => { d.integrity.digest = '0'.repeat(64); }],
    ['tampered content under an unchanged digest', d => { d.geometry.length += 1; }],
    ['normals shorter than points', d => { d.geometry.normals.pop(); }],
    ['straightSegments length differs from params.curves', d => { d.geometry.straightSegments.pop(); }],
    ['unsanitized but in-range straight is accepted by the schema, rejected only by digest', d => { d.params.straight = 0.31; }],
  ];
  for (const [name, mutate] of gaps) {
    const d = clone(base); mutate(d);
    assert.deepEqual(schemaErrors(d), [], `schema accepts (documented gap): ${name}`);
    assert.throws(() => importTrack(d), TrackDocumentError, `importTrack rejects: ${name}`);
  }
});
