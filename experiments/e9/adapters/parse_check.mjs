// Parse-only sanity check (NO validation, NO metrics): every polyline file must be accepted by parsePolylineJson (cli-dist/polyline.js, built by 'npm run build:cli' from src/polyline.ts);
// counts points and whether the file's last point is a bit-identical copy of the first (inputWasClosed in trackFromPolyline).
// Usage: node adapters/parse_check.mjs build
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const { parsePolylineJson } = await import(join(here, '..', '..', '..', 'cli-dist', 'polyline.js'));
const root = join(resolve(process.argv[2] ?? join(here, '..', 'build')), 'polylines');
console.log('source'.padEnd(26), 'files', 'parsed', 'errors', 'min<3pts', 'exact-closing-copy', 'bad-width');
for (const s of readdirSync(root).sort()) {
  const d = join(root, s); if (!statSync(d).isDirectory()) continue;
  let files = 0, ok = 0, err = 0, tiny = 0, copy = 0, badw = 0;
  for (const f of readdirSync(d).filter(f => f.endsWith('.json'))) {
    files++;
    const text = readFileSync(join(d, f), 'utf8');
    try {
      const pts = parsePolylineJson(text); ok++;
      if (pts.length < 3) tiny++;
      const a = pts[0], b = pts[pts.length - 1];
      if (pts.length >= 4 && a.x === b.x && a.z === b.z) copy++;
      const w = JSON.parse(text).width; if (!(Number.isFinite(w) && w > 0)) badw++;
    } catch (e) { err++; }
  }
  console.log(s.padEnd(26), String(files).padStart(5), String(ok).padStart(6), String(err).padStart(6), String(tiny).padStart(8), String(copy).padStart(18), String(badw).padStart(9));
}
