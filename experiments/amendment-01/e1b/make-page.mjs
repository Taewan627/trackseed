import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const s = readFileSync(join(here, 'build', 'e1b.mjs'), 'utf8');
if (/<\/script/i.test(s)) throw new Error('bundle contains </script');
writeFileSync(join(here, 'build', 'page.html'), `<!doctype html>
<html><head><meta charset="utf-8"><title>TrackLab E1b</title></head><body><pre id="out">RUNNING</pre>
<script type="text/plain" id="bundle">
${s}</script>
<script type="module">
const out = document.getElementById('out');
try {
  const url = URL.createObjectURL(new Blob([document.getElementById('bundle').textContent], { type: 'text/javascript' }));
  const r = (await import(url)).runE1b();
  out.textContent = JSON.stringify({ engine: 'browser', version: navigator.userAgent, ...r });
} catch (e) { out.textContent = JSON.stringify({ error: String(e && e.stack || e) }); }
</script></body></html>
`);
