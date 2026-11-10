// Usage: node run-browser.mjs chrome|firefox  -> writes out/<kind>.json
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const pw = createRequire(join(here, '../../../package.json'))('playwright-core');
const [kind] = process.argv.slice(2);
const browser = kind === 'chrome' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true })
  : kind === 'firefox' ? await pw.firefox.launch() : (() => { throw new Error('usage: run-browser.mjs chrome|firefox'); })();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(here, 'build', 'page.html')).href);
  await page.waitForFunction(() => document.getElementById('out').textContent !== 'RUNNING', null, { timeout: 300000 });
  const o = JSON.parse(await page.textContent('#out'));
  if (o.error) throw new Error(o.error);
  mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(join(here, 'out', `${kind}.json`), JSON.stringify({ ...o, cliVersion: `${kind} ${browser.version()} via playwright-core` }) + '\n');
} finally { await browser.close(); }
