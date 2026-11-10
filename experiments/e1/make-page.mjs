// Inlines both bundles (as text, imported through a Blob URL, so the exact same bytes run) into page.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const b = n => { const s = readFileSync(join(here, 'build', n), 'utf8'); if (/<\/script/i.test(s)) throw new Error('bundle contains </script'); return s; };
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>TrackLab E1 determinism harness</title></head>
<body>
<p>TrackLab E1: runs 1000 fixed cases for v0.5 and legacy v0.4 in this browser and prints JSON below. No network is used.</p>
<pre id="out">RUNNING</pre>
<script type="text/plain" id="bundle-v05">
${b('v05.mjs')}</script>
<script type="text/plain" id="bundle-legacy">
${b('legacy.mjs')}</script>
<script type="module">
const load = async id => {
  const url = URL.createObjectURL(new Blob([document.getElementById(id).textContent], { type: 'text/javascript' }));
  return import(url);
};
const out = document.getElementById('out');
try {
  const env = { engine: 'browser', version: navigator.userAgent };
  const v05 = (await load('bundle-v05')).run05();
  const legacy = (await load('bundle-legacy')).runLegacy();
  out.textContent = JSON.stringify({ v05: { ...env, ...v05 }, legacy: { ...env, ...legacy } });
} catch (e) { out.textContent = JSON.stringify({ error: String(e && e.stack || e) }); }
</script>
</body></html>
`;
writeFileSync(join(here, 'page.html'), html);
