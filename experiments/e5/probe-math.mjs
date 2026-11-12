// Post-hoc diagnostic (NOT pre-registered): which Math function differs between engines?
// Usage: <engine> probe-math.mjs   -> prints one JSON line {engine, version, functions: {name: sha256 of the IEEE-754 bits of 200000 results}}
import { sha256Bytes } from '../../cli-dist/sha256.js';
function mulberry32(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r = mulberry32(20261112), N = 200000;
const ang = Array.from({ length: N }, () => (r() - 0.5) * 8 * Math.PI);   // radians, as in rotations
const unit = Array.from({ length: N }, () => r() * 2 - 1);                // acos domain
const xs = Array.from({ length: N }, () => (r() - 0.5) * 600), ys = Array.from({ length: N }, () => (r() - 0.5) * 600);
const cases = { sin: () => ang.map(Math.sin), cos: () => ang.map(Math.cos), acos: () => unit.map(Math.acos),
  atan2: () => xs.map((x, i) => Math.atan2(ys[i], x)), hypot: () => xs.map((x, i) => Math.hypot(x, ys[i])), sqrt: () => xs.map(x => Math.sqrt(Math.abs(x))) };
const hex = b => Array.from(b, v => v.toString(16).padStart(2, '0')).join('');
const functions = {};
for (const [name, f] of Object.entries(cases)) functions[name] = hex(sha256Bytes(new Uint8Array(Float64Array.from(f()).buffer)));
let engine, version;
if (typeof Bun !== 'undefined') { engine = 'bun'; version = Bun.version; } else if (typeof Deno !== 'undefined') { engine = 'deno'; version = Deno.version.deno; } else { engine = 'node'; version = process.version; }
console.log(JSON.stringify({ engine, version, functions }));
