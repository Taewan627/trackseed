// TrackLab exchange format v1: a self-describing, integrity-protected JSON
// document holding the full deterministic output of generateTrack().
import { DEFAULTS, generateTrack, sanitize, type Obstacle, type Params, type Point, type Prop, type Track } from './core.js';
import { generateCoins, type Coin } from './coins.js';
import type { GeometryAudit, PatternMeasurement, PatternReport } from './patterns.js';
import { sha256 } from './sha256.js';
import { VERSION } from './version.js';

export const SCHEMA_NAME = 'tracklab.track';
export const SCHEMA_VERSION = 1;
export const CANONICAL_NAME = 'sorted-keys-json';

export class TrackDocumentError extends Error {
  constructor(readonly path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.name = 'TrackDocumentError';
  }
}

export interface TrackBounds { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number }
export interface TrackDocumentV1 {
  schema: typeof SCHEMA_NAME;
  schemaVersion: 1;
  generator: { name: string; version: string };
  params: Params;
  geometry: {
    points: Point[]; normals: { x: number; z: number }[]; roadEdges: [Point[], Point[]];
    straightSegments: boolean[]; length: number; bounds: TrackBounds;
  };
  props: Prop[];
  obstacles: Obstacle[];
  coins: Coin[];
  patternReport: PatternReport;
  integrity: { algorithm: 'sha256'; canonical: typeof CANONICAL_NAME; digest: string; contentDigest: string };
}
/** Everything importTrack reconstructs (Track minus the internal `waypoints`, plus coins). */
export type ImportedTrack = Omit<Track, 'waypoints'> & { coins: Coin[] };
export type VerifyMode = 'digest' | 'regenerate';

// ---- canonical JSON ------------------------------------------------------
/** JSON with sorted object keys, no whitespace; rejects NaN/Infinity and non-JSON values. */
export function canonicalStringify(value: unknown, path = '$'): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean': return value ? 'true' : 'false';
    case 'string': return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) throw new TrackDocumentError(path, `non-finite number (${value}) cannot be serialized`);
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) {
        return '[' + value.map((v, i) => canonicalStringify(v, `${path}[${i}]`)).join(',') + ']';
      }
      const o = value as Record<string, unknown>;
      return '{' + Object.keys(o).filter(k => o[k] !== undefined).sort()
        .map(k => JSON.stringify(k) + ':' + canonicalStringify(o[k], `${path}.${k}`)).join(',') + '}';
    }
    default: throw new TrackDocumentError(path, `unsupported value of type ${typeof value}`);
  }
}

// Deep copy as plain JSON data: drops undefined properties, maps -0 to 0 (JSON cannot keep its sign).
function plain<T>(value: T, path = '$'): T {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TrackDocumentError(path, `non-finite number (${value})`);
    return (value === 0 ? 0 : value) as T;
  }
  if (Array.isArray(value)) return value.map((v, i) => plain(v, `${path}[${i}]`)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = plain(v, `${path}.${k}`);
    return out as T;
  }
  return value;
}

const digestOf = (body: object) => sha256(canonicalStringify(body));
/** Digest of the document without `integrity` and without `generator`: independent of which build stamped it. */
const contentDigestOf = (body: object) => { const { generator: _generator, ...content } = body as Record<string, unknown>; return digestOf(content); };

// ---- export --------------------------------------------------------------
function assemble(track: Track, generator: { name: string; version: string }): TrackDocumentV1 {
  const body = plain({
    schema: SCHEMA_NAME, schemaVersion: SCHEMA_VERSION, generator, params: track.params,
    geometry: { points: track.points, normals: track.normals, roadEdges: track.roadEdges,
      straightSegments: track.straightSegments, length: track.length, bounds: track.bounds },
    props: track.props, obstacles: track.obstacles, coins: generateCoins(track),
    patternReport: track.patternReport,
  });
  return { ...body, integrity: { algorithm: 'sha256', canonical: CANONICAL_NAME, digest: digestOf(body), contentDigest: contentDigestOf(body) } } as TrackDocumentV1;
}

export function exportTrack(track: Track): TrackDocumentV1 {
  return assemble(track, { name: 'tracklab', version: VERSION });
}
export function serializeTrack(track: Track): string { return canonicalStringify(exportTrack(track)); }

// ---- validation ----------------------------------------------------------
const fail = (path: string, detail: string): never => { throw new TrackDocumentError(path, detail); };
type Obj = Record<string, unknown>;
function obj(v: unknown, path: string, keys?: readonly string[], optional: readonly string[] = []): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return fail(path, 'expected an object');
  const o = v as Obj;
  if (keys) {
    for (const k of keys) if (!(k in o) || o[k] === undefined) fail(`${path}.${k}`, 'missing required field');
    for (const k of Object.keys(o)) if (!keys.includes(k) && !optional.includes(k)) fail(`${path}.${k}`, 'unknown field');
  }
  return o;
}
const num = (v: unknown, path: string): number => {
  if (typeof v !== 'number') return fail(path, 'expected a number');
  if (!Number.isFinite(v)) return fail(path, `non-finite number (${v})`);
  return v;
};
const int = (v: unknown, path: string): number => {
  const n = num(v, path); if (!Number.isInteger(n)) fail(path, 'expected an integer'); return n;
};
const bool = (v: unknown, path: string): boolean => typeof v === 'boolean' ? v : fail(path, 'expected a boolean');
const str = (v: unknown, path: string): string => typeof v === 'string' ? v : fail(path, 'expected a string');
const oneOf = <T extends string>(v: unknown, set: readonly T[], path: string): T =>
  set.includes(v as T) ? v as T : fail(path, `expected one of ${set.join(', ')}`);
function list<T>(v: unknown, path: string, item: (x: unknown, p: string) => T): T[] {
  if (!Array.isArray(v)) return fail(path, 'expected an array');
  return v.map((x, i) => item(x, `${path}[${i}]`));
}
const nums = (o: Obj, keys: readonly string[], path: string) => {
  for (const k of keys) num(o[k], `${path}.${k}`);
};
const point = (v: unknown, p: string): Point => { nums(obj(v, p, ['x', 'y', 'z']), ['x', 'y', 'z'], p); return v as Point; };
const KINDS = ['right-angle', 'hairpin', 's-curve'] as const;

function validateParams(v: unknown, path: string): Params {
  const o = obj(v, path, Object.keys(DEFAULTS));
  for (const [k, d] of Object.entries(DEFAULTS)) {
    if (typeof d === 'number') num(o[k], `${path}.${k}`); else str(o[k], `${path}.${k}`);
  }
  // Params must already be in canonical (sanitized) form.
  const clean = sanitize(o as unknown as Params) as unknown as Obj;
  for (const k of Object.keys(DEFAULTS)) if (clean[k] !== o[k]) fail(`${path}.${k}`, `value ${JSON.stringify(o[k])} is not a sanitized parameter (expected ${JSON.stringify(clean[k])})`);
  return o as unknown as Params;
}

function validateAudit(v: unknown, path: string): GeometryAudit | null {
  if (v === null) return null;
  const keys = ['valid', 'closed', 'minRadius', 'maxStepAngle', 'selfIntersections', 'boundaryIntersections',
    'foldedTriangles', 'boundariesChecked', 'reasons'];
  const o = obj(v, path, keys);
  for (const k of ['valid', 'closed', 'boundariesChecked']) bool(o[k], `${path}.${k}`);
  nums(o, ['minRadius', 'maxStepAngle', 'selfIntersections', 'boundaryIntersections', 'foldedTriangles'], path);
  list(o.reasons, `${path}.reasons`, str);
  return v as unknown as GeometryAudit;
}

function validateReport(v: unknown, path: string): PatternReport {
  const o = obj(v, path, ['selected', 'requested', 'inserted', 'attempts', 'scale', 'patterns', 'geometry']);
  oneOf(o.selected, ['auto', ...KINDS], `${path}.selected`);
  nums(o, ['requested', 'inserted', 'attempts', 'scale'], path);
  list(o.patterns, `${path}.patterns`, (x, p): PatternMeasurement => {
    const m = obj(x, p, ['kind', 'startIndex', 'endIndex', 'turnDegrees', 'positiveTurnDegrees',
      'negativeTurnDegrees', 'curvatureChanges', 'verified'], ['parallelDot']);
    oneOf(m.kind, KINDS, `${p}.kind`); bool(m.verified, `${p}.verified`);
    nums(m, ['startIndex', 'endIndex', 'turnDegrees', 'positiveTurnDegrees', 'negativeTurnDegrees', 'curvatureChanges'], p);
    if (m.parallelDot !== undefined) num(m.parallelDot, `${p}.parallelDot`);
    return x as PatternMeasurement;
  });
  validateAudit(o.geometry, `${path}.geometry`);
  return v as PatternReport;
}

/**
 * Parse + validate a document (JSON text or an already-parsed value) and verify
 * its SHA-256 integrity digest. Throws TrackDocumentError with a path-like message.
 */
export function parseTrackDocument(json: string | unknown): TrackDocumentV1 {
  let value: unknown = json;
  if (typeof json === 'string') {
    try { value = JSON.parse(json); }
    catch (e) { return fail('$', `invalid JSON (${e instanceof Error ? e.message : String(e)})`); }
  }
  const root = obj(value, '$', ['schema', 'schemaVersion', 'generator', 'params', 'geometry', 'props',
    'obstacles', 'coins', 'patternReport', 'integrity']);
  if (root.schema !== SCHEMA_NAME) fail('$.schema', `expected "${SCHEMA_NAME}", got ${JSON.stringify(root.schema)}`);
  if (root.schemaVersion !== SCHEMA_VERSION) fail('$.schemaVersion', `unsupported version ${JSON.stringify(root.schemaVersion)} (this build reads ${SCHEMA_VERSION})`);
  const gen = obj(root.generator, '$.generator', ['name', 'version']);
  str(gen.name, '$.generator.name'); str(gen.version, '$.generator.version');
  const params = validateParams(root.params, '$.params');
  const g = obj(root.geometry, '$.geometry', ['points', 'normals', 'roadEdges', 'straightSegments', 'length', 'bounds']);
  const points = list(g.points, '$.geometry.points', point);
  const normals = list(g.normals, '$.geometry.normals', (x, p) => { nums(obj(x, p, ['x', 'z']), ['x', 'z'], p); return x; });
  if (points.length < 4) fail('$.geometry.points', 'a closed track needs at least 4 points');
  if (normals.length !== points.length) fail('$.geometry.normals', `expected ${points.length} entries, got ${normals.length}`);
  const edges = list(g.roadEdges, '$.geometry.roadEdges', (x, p) => list(x, p, point));
  if (edges.length !== 2) fail('$.geometry.roadEdges', 'expected exactly 2 edges');
  edges.forEach((e, i) => { if (e.length !== points.length) fail(`$.geometry.roadEdges[${i}]`, `expected ${points.length} entries, got ${e.length}`); });
  const straight = list(g.straightSegments, '$.geometry.straightSegments', bool);
  if (straight.length !== params.curves) fail('$.geometry.straightSegments', `expected ${params.curves} entries, got ${straight.length}`);
  num(g.length, '$.geometry.length');
  const b = obj(g.bounds, '$.geometry.bounds', ['minX', 'maxX', 'minZ', 'maxZ', 'minY', 'maxY']);
  nums(b, ['minX', 'maxX', 'minZ', 'maxZ', 'minY', 'maxY'], '$.geometry.bounds');
  list(root.props, '$.props', (x, p) => {
    const o = obj(x, p, ['x', 'y', 'z', 'kind', 'heading', 'scale']);
    nums(o, ['x', 'y', 'z', 'heading', 'scale'], p); oneOf(o.kind, ['tree', 'bench', 'lamp', 'building'], `${p}.kind`); return x;
  });
  list(root.obstacles, '$.obstacles', (x, p) => { nums(obj(x, p, ['x', 'y', 'z', 'radius', 'heading']), ['x', 'y', 'z', 'radius', 'heading'], p); return x; });
  list(root.coins, '$.coins', (x, p) => { const o = obj(x, p, ['id', 'x', 'y', 'z']); int(o.id, `${p}.id`); nums(o, ['x', 'y', 'z'], p); return x; });
  validateReport(root.patternReport, '$.patternReport');
  const integ = obj(root.integrity, '$.integrity', ['algorithm', 'canonical', 'digest', 'contentDigest']);
  if (integ.algorithm !== 'sha256') fail('$.integrity.algorithm', 'expected "sha256"');
  if (integ.canonical !== CANONICAL_NAME) fail('$.integrity.canonical', `expected "${CANONICAL_NAME}"`);
  if (typeof integ.digest !== 'string' || !/^[0-9a-f]{64}$/.test(integ.digest)) fail('$.integrity.digest', 'expected 64 lower-case hex characters');
  if (typeof integ.contentDigest !== 'string' || !/^[0-9a-f]{64}$/.test(integ.contentDigest)) fail('$.integrity.contentDigest', 'expected 64 lower-case hex characters');
  const { integrity: _integrity, ...body } = root;
  const actual = digestOf(body);
  if (actual !== integ.digest) fail('$.integrity.digest', `digest mismatch (document says ${integ.digest}, content hashes to ${actual})`);
  const actualContent = contentDigestOf(body);
  if (actualContent !== integ.contentDigest) fail('$.integrity.contentDigest', `contentDigest mismatch (document says ${integ.contentDigest}, content hashes to ${actualContent})`);
  return value as TrackDocumentV1;
}

/**
 * Validate a document and turn it back into track data.
 * 'digest'     : structure + SHA-256 integrity only.
 * 'regenerate' : additionally runs generateTrack(doc.params) and requires the regenerated
 *                document to have the same contentDigest (the digest that excludes the
 *                `generator` stamp, so documents written by another build with identical
 *                content verify), i.e. the parameters fully determine the stored content
 *                on this build.
 */
export function importTrack(doc: unknown, options: { verify?: VerifyMode } = {}): ImportedTrack {
  const verify = options.verify ?? 'digest';
  if (verify !== 'digest' && verify !== 'regenerate') fail('$', `unknown verify mode ${JSON.stringify(verify)}`);
  const d = parseTrackDocument(doc);
  if (verify === 'regenerate') {
    let fresh: TrackDocumentV1;
    try { fresh = exportTrack(generateTrack(d.params)); }
    catch (e) { return fail('$.params', `cannot regenerate track (${e instanceof Error ? e.message : String(e)})`); }
    if (fresh.integrity.contentDigest !== d.integrity.contentDigest) {
      fail('$.integrity.contentDigest', `regenerated content differs (regenerated ${fresh.integrity.contentDigest}, document ${d.integrity.contentDigest})`);
    }
  }
  const { points, normals, roadEdges, straightSegments, length, bounds } = d.geometry;
  return { params: d.params, points, normals, roadEdges, straightSegments, length, bounds,
    props: d.props, obstacles: d.obstacles, coins: d.coins, patternReport: d.patternReport };
}
