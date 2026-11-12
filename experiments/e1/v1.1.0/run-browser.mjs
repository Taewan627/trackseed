// Usage: node run-browser.mjs chrome|firefox|webkit -> writes ../results/v1.1.0/<kind>.{s1,s2}.json (derived from ../v1.0.0/run-browser.mjs; webkit added)
// chrome: /usr/bin/google-chrome via playwright-core. firefox, webkit: Playwright builds from PLAYWRIGHT_BROWSERS_PATH
// (installed with `npx playwright install firefox webkit`; the binaries are NOT part of the repo).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const pw = createRequire(join(here, '../../../package.json'))('playwright-core');
const [kind] = process.argv.slice(2);
const browser = kind === 'chrome' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true })
  : kind === 'firefox' ? await pw.firefox.launch()
  : kind === 'webkit' ? await pw.webkit.launch() : (() => { throw new Error('usage: run-browser.mjs chrome|firefox|webkit'); })();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(here, 'page.html')).href, { timeout: 300000 });
  await page.waitForFunction(() => document.getElementById('out').textContent !== 'RUNNING', null, { timeout: 300000 });
  const o = JSON.parse(await page.textContent('#out'));
  if (o.error) throw new Error(o.error);
  mkdirSync(join(here, '..', 'results', 'v1.1.0'), { recursive: true });
  for (const k of ['s1', 's2']) {
    writeFileSync(join(here, '..', 'results', 'v1.1.0', `${kind}.${k}.json`), JSON.stringify({ ...o[k], subject: k, cliVersion: `${kind} ${browser.version()} via playwright-core` }) + '\n');
  }
} finally { await browser.close(); }
