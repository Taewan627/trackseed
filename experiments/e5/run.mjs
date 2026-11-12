// Usage: <engine> run.mjs <label>   (Node, Deno with --allow-read --allow-write, Bun)
// Writes results/<label>.json (digests, meta) and out/<label>.polylines.json (gitignored).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const label = (typeof process !== 'undefined' && process.argv ? process.argv : [])[2];
if (!label) { console.error('usage: run.mjs <label>'); process.exit(2); }
let engine, version, extra = {};
if (typeof Bun !== 'undefined') { engine = 'bun'; version = Bun.version; extra = { revision: Bun.revision }; }
else if (typeof Deno !== 'undefined') { engine = 'deno'; version = Deno.version.deno; extra = { v8: Deno.version.v8 }; }
else { engine = 'node'; version = process.version; extra = { v8: process.versions.v8 }; }
const here = new URL('.', import.meta.url);
const mod = await import(new URL('build/e5.mjs', here).href);
const html = readFileSync(new URL('build/third_party/index.html', here), 'latin1');
const { polylines, ...rest } = mod.runAll(html);
// Optional E5_SCRATCH=<dir>: write results/ and out/ under <dir> instead of the repository (used for verification re-runs).
const dest = process.env.E5_SCRATCH ? new URL(`file://${process.env.E5_SCRATCH.replace(/\/?$/, '/')}`) : here;
mkdirSync(new URL('results/', dest), { recursive: true }); mkdirSync(new URL('out/', dest), { recursive: true });
writeFileSync(new URL(`results/${label}.json`, dest), JSON.stringify({ env: { engine, version, ...extra }, ...rest }) + '\n');
writeFileSync(new URL(`out/${label}.polylines.json`, dest), JSON.stringify(polylines) + '\n');
