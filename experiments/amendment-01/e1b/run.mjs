// Usage: <engine> run.mjs   -> one JSON object on stdout.
let engine, version, extra = {};
if (typeof Bun !== 'undefined') { engine = 'bun'; version = Bun.version; extra = { revision: Bun.revision }; }
else if (typeof Deno !== 'undefined') { engine = 'deno'; version = Deno.version.deno; extra = { v8: Deno.version.v8 }; }
else { engine = 'node'; version = process.version; extra = { v8: process.versions.v8 }; }
const mod = await import(new URL('./build/e1b.mjs', import.meta.url).href);
console.log(JSON.stringify({ engine, version, ...extra, ...mod.runE1b() }));
