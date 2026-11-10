// Usage: <engine> run.mjs v100|v050   -> prints one JSON object on stdout.
const gen = (typeof process !== 'undefined' && process.argv ? process.argv : Deno.args.length ? ['', '', ...Deno.args] : [])[2];
if (gen !== 'v100' && gen !== 'v050') { console.error('usage: run.mjs v100|v050'); (typeof process !== 'undefined' ? process : Deno).exit(2); }
let engine, version, extra = {};
if (typeof Bun !== 'undefined') { engine = 'bun'; version = Bun.version; extra = { revision: Bun.revision }; }
else if (typeof Deno !== 'undefined') { engine = 'deno'; version = Deno.version.deno; extra = { v8: Deno.version.v8 }; }
else { engine = 'node'; version = process.version; extra = { v8: process.versions.v8 }; }
const mod = await import(new URL(`./build/${gen}.mjs`, import.meta.url).href);
console.log(JSON.stringify({ engine, version, ...extra, subject: gen, ...mod.runSubject() }));
