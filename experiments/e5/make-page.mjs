// Inlines the bundle (imported through a Blob URL, so the same bytes run) and the third-party html text (as a JSON string) into page.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const bundle = readFileSync(join(here, 'build', 'e5.mjs'), 'utf8');
if (/<\/script/i.test(bundle)) throw new Error('bundle contains </script');
const html3p = readFileSync(join(here, 'build', 'third_party', 'index.html'), 'latin1');
const json = JSON.stringify(html3p).replace(/</g, '\\u003c');
writeFileSync(join(here, 'build', 'page.html'), `<!doctype html>
<html><head><meta charset="utf-8"><title>TrackLab E5 harness</title></head>
<body><pre id="out">RUNNING</pre>
<script type="text/plain" id="bundle">
${bundle}</script>
<script type="module">
const out = document.getElementById('out');
try {
  const url = URL.createObjectURL(new Blob([document.getElementById('bundle').textContent], { type: 'text/javascript' }));
  const mod = await import(url);
  const html = ${json};
  const r = mod.runAll(html);
  out.textContent = JSON.stringify({ env: { engine: 'browser', version: navigator.userAgent }, ...r });
} catch (e) { out.textContent = JSON.stringify({ error: String(e && e.stack || e) }); }
</script>
</body></html>
`);
