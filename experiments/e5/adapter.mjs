// Engine-portable adapter: runs the UNMODIFIED inline script of the third-party generator headless, with a seeded Math.random.
// See PROTOCOL.md ("Seeding method"). No Node-only APIs are used here (the same bytes run in Node, Deno, Bun and browsers).
import { sha256, sha256Bytes } from '../../src/sha256.ts';
import { SEEDS as E1_SEEDS } from '../e1/cases.mjs';

const SEEDS_SHA256 = '6fc50bc3d1fad596f5593ee17116c15992c0c16b702e8d0b4da2abe1fcbcc095';
function mulberry32(seed) { // identical to random() in src/core.ts
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const SEEDS = (() => {
  const r = mulberry32(20261112), seeds = [...E1_SEEDS];
  while (seeds.length < 1000) { const v = Math.floor(r() * 2147483648); if (!seeds.includes(v)) seeds.push(v); }
  return seeds;
})();
if (sha256(JSON.stringify(SEEDS)) !== SEEDS_SHA256) throw new Error('E5 seed list does not match PROTOCOL.md');

const APPROXIMATED = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'pow', 'cbrt', 'hypot'];

/** The generator is the first inline <script> (without src) of index.html. */
export function extractScript(html) {
  const found = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (found.length !== 1) throw new Error(`expected exactly one inline <script>, found ${found.length}`);
  return found[0][1];
}

/** Static audit of Math usage: raw tokens and tokens left after a heuristic strip of // and block comments. */
export function staticMathAudit(script) {
  const code = script.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:\\"'])\/\/.*$/gm, '$1');
  const count = text => { const c = {}; for (const m of text.matchAll(/Math\.([A-Za-z0-9_]+)/g)) c[m[1]] = (c[m[1]] ?? 0) + 1; return Object.fromEntries(Object.entries(c).sort()); };
  const raw = count(script), stripped = count(code);
  return { raw, codeOnly: stripped, powOperatorRaw: (script.match(/\*\*/g) ?? []).length, powOperatorCodeOnly: (code.match(/\*\*/g) ?? []).length,
    approximatedUsedInCode: Object.keys(stripped).filter(k => APPROXIMATED.includes(k)), approximatedList: APPROXIMATED,
    mathRandomRaw: raw.random ?? 0 };
}

const PRELUDE = 'var points, what, TRACK_WIDTH;\n';
const EPILOGUE = '\nreturn { t: t, has_collisions: has_collisions, itrials: itrials, TRACK_WIDTH: TRACK_WIDTH, centerline: centerline,' +
  ' heights: centerline.map(function (_p, i) { return get_track_h(i); }) };\n';

function hex(bytes) { return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''); }

/** Runs the script once with Math.random = mulberry32(seed). Returns { record, polyline }. */
export function runCase(script, seed, mathCalls) {
  const M = {};
  for (const k of Object.getOwnPropertyNames(Math)) {
    const v = Math[k];
    if (k === 'random') M.random = mulberry32(seed);
    else if (typeof v === 'function') { mathCalls[k] ??= 0; M[k] = function (...a) { mathCalls[k]++; return v(...a); }; }
    else M[k] = v;
  }
  const ctx = new Proxy({}, { get: () => () => undefined, set: () => true });
  const canvas = { width: 500, height: 500, getContext: () => ctx };
  const state = { reloads: 0 };
  const doc = { getElementById: () => canvas };
  const win = { location: { reload: () => { state.reloads++; } } };
  const con = { log() {}, warn() {}, error() {} };
  let outcome = 'ok', res = null;
  try {
    res = new Function('document', 'window', 'console', 'Math', PRELUDE + script + EPILOGUE)(doc, win, con, M);
    if (state.reloads > 0) outcome = 'FAIL';
    else if (!(res.t && !res.has_collisions)) outcome = 'FAIL-noreload';
  } catch (e) { outcome = 'THROW:' + (typeof e === 'string' ? e : (e && e.name) || 'Error'); }
  const ok = outcome === 'ok';
  const centerline = ok ? res.centerline : null, heights = ok ? res.heights : null;
  const flat = new Float64Array(ok ? centerline.length * 2 : 0);
  if (ok) centerline.forEach((p, i) => { flat[2 * i] = p[0]; flat[2 * i + 1] = p[1]; });
  const record = {
    seed, outcome, digest: sha256(JSON.stringify({ centerline, outcome })),
    bitsDigest: ok ? hex(sha256Bytes(new Uint8Array(flat.buffer))) : sha256(outcome),
    digest3d: sha256(JSON.stringify(heights)), points: ok ? centerline.length : 0,
    ownWidth: res ? res.TRACK_WIDTH ?? null : null, trials: res ? res.itrials ?? null : null, reloads: state.reloads,
  };
  return { record, polyline: ok ? { seed, centerline, heights } : { seed, centerline: null, heights: null } };
}

/** Entry point used by every engine. `html` is the text of the third-party index.html (decoded as latin1). */
export function runAll(html) {
  const script = extractScript(html);
  const audit = staticMathAudit(script);
  if (audit.mathRandomRaw !== 1) throw new Error(`expected exactly one Math.random in the script, found ${audit.mathRandomRaw}`);
  const before = new Set(Object.getOwnPropertyNames(globalThis));
  const mathCalls = {}, cases = [], polylines = [];
  for (const seed of SEEDS) { const { record, polyline } = runCase(script, seed, mathCalls); cases.push(record); polylines.push(polyline); }
  const newGlobals = Object.getOwnPropertyNames(globalThis).filter(k => !before.has(k));
  const meta = { selfTest: sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    scriptSha256: sha256(script), seedsSha256: SEEDS_SHA256, scriptChars: script.length, newGlobals, staticMath: audit };
  return { meta, cases, mathCalls: Object.fromEntries(Object.entries(mathCalls).sort()), polylines };
}
