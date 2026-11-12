// Usage: node run-browser.mjs chrome|firefox  -> results/<kind>.json, out/<kind>.polylines.json
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
  // 'load' waits for the synchronous 1000-case module script; the default 30 s timeout failed for Firefox in the first attempt (see SUMMARY deviations).
  await page.goto(pathToFileURL(join(here, 'build', 'page.html')).href, { waitUntil: 'commit', timeout: 900000 });
  await page.waitForFunction(() => document.getElementById('out').textContent !== 'RUNNING', null, { timeout: 900000 });
  const o = JSON.parse(await page.textContent('#out'));
  if (o.error) throw new Error(o.error);
  const { polylines, env, ...rest } = o;
  mkdirSync(join(here, 'results'), { recursive: true }); mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(join(here, 'results', `${kind}.json`), JSON.stringify({ env: { ...env, cliVersion: `${kind} ${browser.version()} via playwright-core` }, ...rest }) + '\n');
  writeFileSync(join(here, 'out', `${kind}.polylines.json`), JSON.stringify(polylines) + '\n');
} finally { await browser.close(); }
