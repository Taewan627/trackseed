// Inlines both bundles (as text, imported through a Blob URL, so the exact same bytes run) into page.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const b = n => { const s = readFileSync(join(here, 'build', n), 'utf8'); if (/<\/script/i.test(s)) throw new Error('bundle contains </script'); return s; };
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>TrackLab E1 v1.0.0 determinism harness</title></head>
<body>
<p>TrackLab E1 (v1.0.0 addendum): runs 1000 fixed cases for v1.0.0 and v0.5.0 in this browser and prints JSON below. No network is used.</p>
<pre id="out">RUNNING</pre>
<script type="text/plain" id="bundle-v100">
${b('v100.mjs')}</script>
<script type="text/plain" id="bundle-v050">
${b('v050.mjs')}</script>
<script type="module">
const load = async id => {
  const url = URL.createObjectURL(new Blob([document.getElementById(id).textContent], { type: 'text/javascript' }));
  return import(url);
};
const out = document.getElementById('out');
try {
  const env = { engine: 'browser', version: navigator.userAgent };
  const v100 = (await load('bundle-v100')).runSubject();
  const v050 = (await load('bundle-v050')).runSubject();
  out.textContent = JSON.stringify({ v100: { ...env, ...v100 }, v050: { ...env, ...v050 } });
} catch (e) { out.textContent = JSON.stringify({ error: String(e && e.stack || e) }); }
</script>
</body></html>
`;
writeFileSync(join(here, 'page.html'), html);
