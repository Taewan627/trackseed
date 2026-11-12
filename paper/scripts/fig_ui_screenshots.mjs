// UI figure capture for the manuscript (Fig. 2). Web UI of TrackSeed v1.2.0 at software commit 0441abe, English, seed 42, default parameters.
// Build and serve a copy of software commit 0441abe (the main software checkout stays untouched):
//   git -C <repo> worktree add /tmp/ts-fig 0441abe && ln -s <repo>/node_modules /tmp/ts-fig/node_modules
//   (cd /tmp/ts-fig && npm run build && npx vite preview --host 127.0.0.1 --port 4173 &)
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node paper/scripts/fig_ui_screenshots.mjs <repo> /tmp/uishots http://127.0.0.1:4173/
//   git -C <repo> worktree remove /tmp/ts-fig --force
// <repo> is any checkout with node_modules/playwright (the script resolves playwright from it).
// Window 860x722 CSS px, device scale factor 3 (2580x2166 px), headless Chromium with software WebGL. The sidebar (`.parameter-scroll`)
// is scrolled to its end so that the Validation panel is visible (sections 01 to 04 lie above the scroll position); nothing is cropped from the capture. The script prints the values that the
// caption relies on and exits non-zero if one differs: header "TrackSeed" and "v1.2.0", lang en, seed 42, the default value of each of the
// thirteen parameters, sidebar title "TrackSeed", validation badge OK with no failed check (ten rows at validator v1.3), sidebar scrolled to its end so that the Validation panel, seed field and buttons are fully visible.
import { createRequire } from 'node:module';
import path from 'node:path';
const swRepo = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
const base = process.argv[4] || 'http://127.0.0.1:4173/';
const require = createRequire(path.join(swRepo, 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 860, height: 722 }, deviceScaleFactor: 3 });
await page.goto(base + '?lang=en', { waitUntil: 'load' });
await page.waitForTimeout(3500);
const info = await page.evaluate(() => {
  const v = id => document.getElementById(id)?.value;
  return {
    panelTitle: document.querySelector('.panel-title h1')?.innerText.replace('↗', '').trim(),
    brand: document.querySelector('.brand strong')?.innerText.trim(), version: document.querySelector('.brand .version')?.innerText.trim(),
    lang: document.documentElement.lang, params: Object.fromEntries(['curves','straight','width','size','height','cornerPattern','autoJoin','cornerCount','cornerStrength','obstacles','density','scene','seed'].map(k => [k, v(k)])),
    badge: document.getElementById('validation-badge').innerText, counts: document.getElementById('validation-counts').innerText,
    checks: document.getElementById('validation-checks').innerText.replace(/\n+/g, ' | '),
  };
});
console.log(JSON.stringify(info, null, 1));
// defaults of src/core.ts (DEFAULTS) at the captured commit
const DEFAULTS = { curves: '6', straight: '0.25', width: '40', size: '2', height: '20', obstacles: '3', density: '10', scene: 'mixed', seed: '42', cornerPattern: 'auto', cornerCount: '1', cornerStrength: '60', autoJoin: 'tangent' };
const problems = [];
if (info.brand !== 'TrackSeed') problems.push('header brand is ' + JSON.stringify(info.brand));
if (info.panelTitle !== 'TrackSeed') problems.push('sidebar title is ' + JSON.stringify(info.panelTitle));
if (info.version !== 'v1.2.0') problems.push('header version is ' + JSON.stringify(info.version));
if (info.lang !== 'en') problems.push('lang is ' + info.lang);
for (const [k, val] of Object.entries(DEFAULTS)) if (String(info.params[k]) !== val) problems.push(`parameter ${k} = ${info.params[k]}, expected ${val}`);
if (!/^OK$/i.test(info.badge.trim())) problems.push('validation badge is ' + JSON.stringify(info.badge));
if (!/^Errors 0\s*·\s*Warnings 0$/.test(info.counts.trim())) problems.push('validation counts: ' + info.counts);
if (/fail/i.test(info.checks) || (info.checks.match(/pass/g) || []).length !== 10) problems.push('validation checks: ' + info.checks);
const clipped = await page.evaluate(() => {
  // sidebar scrolled to its end; the Validation panel (badge, counts, all ten check rows), and the seed field must lie fully inside the visible part of the sidebar,
  // the Generate and Reset buttons (below the scroll area) inside the window. Sections 01 to 04 are above the scroll position and not in the figure.
  const s = document.querySelector('.parameter-scroll'); s.scrollTop = s.scrollHeight;
  const sr = s.getBoundingClientRect();
  const inside = el => { const r = el.getBoundingClientRect(); return r.top >= sr.top - 0.5 && r.bottom <= sr.bottom + 0.5; };
  const checks = [...document.getElementById('validation-checks').children];
  return { scrollTop: s.scrollTop, max: s.scrollHeight - s.clientHeight,
    badgeInside: inside(document.getElementById('validation-badge')), checkRows: checks.length, checksInside: checks.every(inside),
    seedInside: inside(document.getElementById('seed')), buttonsInside: ['.generate', '#reset'].every(q => { const r = document.querySelector(q)?.getBoundingClientRect(); return !!r && r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth; }) };  // the buttons sit below the scroll area, inside the window
});
console.log(JSON.stringify(clipped));
if (!clipped.badgeInside || clipped.checkRows !== 10 || !clipped.checksInside) problems.push('validation panel not fully visible: ' + JSON.stringify(clipped));
if (!clipped.seedInside) problems.push('seed field not fully inside the sidebar viewport');
if (!clipped.buttonsInside) problems.push('Generate / Reset buttons not fully visible');
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(out, 'ui_v120_0441abe_seed42_validation.png') });
await browser.close();
if (problems.length) { console.error('CHECK FAILED:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log('all checks passed');
