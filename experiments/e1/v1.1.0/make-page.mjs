// Inlines both bundles (as text, imported through a Blob URL, so the exact same bytes run) into page.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const b = n => { const s = readFileSync(join(here, 'build', n), 'utf8'); if (/<\/script/i.test(s)) throw new Error('bundle contains </script'); return s; };
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>TrackLab E1 v1.1.0 determinism harness</title></head>
<body>
<p>TrackLab E1 (v1.1.0 addendum): runs 1000 fixed cases for subjects S1 (default join) and S2 (legacy join) in this browser and prints JSON below. No network is used.</p>
<pre id="out">RUNNING</pre>
<script type="text/plain" id="bundle-s1">
${b('s1.mjs')}</script>
<script type="text/plain" id="bundle-s2">
${b('s2.mjs')}</script>
<script type="module">
const load = async id => {
  const url = URL.createObjectURL(new Blob([document.getElementById(id).textContent], { type: 'text/javascript' }));
  return import(url);
};
const out = document.getElementById('out');
try {
  const env = { engine: 'browser', version: navigator.userAgent };
  const s1 = (await load('bundle-s1')).runSubject();
  const s2 = (await load('bundle-s2')).runSubject();
  out.textContent = JSON.stringify({ s1: { ...env, ...s1 }, s2: { ...env, ...s2 } });
} catch (e) { out.textContent = JSON.stringify({ error: String(e && e.stack || e) }); }
</script>
</body></html>
`;
writeFileSync(join(here, 'page.html'), html);
