// Usage: node run-browser.mjs chrome|firefox <outfile-label>  -> writes results/<label>.{v05,legacy}.json
// chrome: /usr/bin/google-chrome via playwright-core (CLI --dump-dom hung on every page in this sandbox, see PROTOCOL deviations in the report).
// firefox: Playwright Firefox (installed once with `npx -y playwright@1.64.1 install firefox`; binary is NOT part of the repo).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const pw = createRequire(join(here, '../../package.json'))('playwright-core');
const [kind] = process.argv.slice(2);
const browser = kind === 'chrome' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true })
  : kind === 'firefox' ? await pw.firefox.launch() : (() => { throw new Error('usage: run-browser.mjs chrome|firefox'); })();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(here, 'page.html')).href);
  await page.waitForFunction(() => document.getElementById('out').textContent !== 'RUNNING', null, { timeout: 300000 });
  const o = JSON.parse(await page.textContent('#out'));
  if (o.error) throw new Error(o.error);
  mkdirSync(join(here, 'results'), { recursive: true });
  for (const k of ['v05', 'legacy']) {
    writeFileSync(join(here, 'results', `${kind}.${k}.json`), JSON.stringify({ ...o[k], subject: k, cliVersion: `${kind} ${browser.version()} via playwright-core` }) + '\n');
  }
} finally { await browser.close(); }
