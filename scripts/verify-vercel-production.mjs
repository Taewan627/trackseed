import { chromium, request } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { generateTrack, project } from '../.test-build/src/core.js';
import { generateCoins } from '../.test-build/src/coins.js';
import { spawnVehicle, updateVehicle, NO_INPUT } from '../.test-build/src/vehicle.js';

const url = process.env.TRACKSEED_VERIFY_URL;
const secret = process.env.TRACKSEED_VERIFY_AUTH;
assert.ok(url?.startsWith('https://') && secret, 'Authenticated HTTPS verification requires URL and a temporary credential.');
const origin = new URL(url).origin;
assert.ok(new URL(origin).hostname.endsWith('.vercel.app'), 'Expected a Vercel deployment.');
const directory = 'test-results/vercel-production';
mkdirSync(directory, { recursive: true });
const report = { url: origin, checks: {}, screenshots: [], errors: [], unexpectedOrigins: [] };
const save = () => writeFileSync('tmp/vercel-production-verification.json', JSON.stringify(report, null, 2));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let browser, api;
try {
  const anonymous = await request.newContext();
  const denied = await anonymous.get(origin, { maxRedirects: 0 });
  report.anonymousStatus = denied.status();
  assert.ok([401, 403, 302, 303, 307, 308].includes(denied.status()), 'Unauthenticated deployment must be protected.');
  if (denied.status() < 400) assert.match(denied.headers().location ?? '', /vercel\.com/);
  await anonymous.dispose(); report.checks.anonymousAccessDenied = true;

  api = await request.newContext({ extraHTTPHeaders: { 'x-vercel-protection-bypass': secret } });
  const manifest = JSON.parse(readFileSync('tmp/vercel-production-audit.json', 'utf8')).manifest;
  for (const file of manifest.filter(f => f.path.startsWith('static/'))) {
    const path = file.path.slice('static/'.length);
    const response = await api.get(`${origin}/${path}`, { maxRedirects: 0 });
    assert.equal(response.status(), 200, `Asset failed: ${path}`);
    assert.equal(sha(await response.body()), file.sha256, `Hosted bytes differ: ${path}`);
  }
  report.checks.hostedArtifactHashesMatch = true;
  const html = await api.get(origin, { maxRedirects: 0 });
  assert.equal(html.status(), 200); assert.match(html.headers()['x-robots-tag'] ?? '', /noindex/);
  report.checks.authenticatedHttpsResponse = true;

  browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message.replaceAll(secret, '[redacted]')));
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).origin !== origin) {
      report.unexpectedOrigins.push(new URL(route.request().url()).origin); await route.abort(); return;
    }
    await route.continue({ headers: { ...route.request().headers(), 'x-vercel-protection-bypass': secret } });
  });
  // Install the clock before application startup so performance.now and RAF
  // share one origin; the application retains its normal fixed-step integration.
  const time = new Date();
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto(origin, { waitUntil: 'load' });
  assert.match(await page.locator('#status').innerText(), /생성 완료/);
  assert.equal(await page.evaluate(() => '__trackseed' in window), false);
  assert.equal(await page.locator('#coin-count').innerText(), '0 / 10');
  const screenshot = async name => {
    await page.clock.fastForward(100);
    const path = `${directory}/${name}.png`;
    await page.screenshot({ path, animations: 'allow' }); report.screenshots.push(path);
  };
  await screenshot('initial'); report.checks.trackAndWebglRendered = true;
  const oldMap = await page.locator('#minimap').evaluate(c => c.toDataURL());

  const edit = async values => {
    await page.locator('#parameters').evaluate((form, values) => {
      for (const [key, value] of Object.entries(values)) {
        const element = form.querySelector(`#${key === 'cornerPattern' || key === 'seed' || key === 'scene' ? key : key + '-value'}`);
        element.value = String(value);
        element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      }
    }, values);
    await page.clock.fastForward(200);
    assert.match(await page.locator('#status').innerText(), /생성 완료/);
  };
  // Real range-key input verifies the input event and debounced automatic update.
  await page.locator('#width').focus(); await page.keyboard.press('End');
  assert.equal(await page.locator('#width-value').inputValue(), '80');
  await page.clock.fastForward(200);
  assert.match(await page.locator('#scene-description').innerText(), /80u wide/);
  assert.notEqual(await page.locator('#minimap').evaluate(c => c.toDataURL()), oldMap);
  report.checks.liveSliderAndMinimap = true;
  await page.locator('#viewport > canvas').focus(); await page.keyboard.press('c');
  assert.equal(await page.locator('#chase').getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('c');
  assert.equal(await page.locator('#overview').getAttribute('aria-pressed'), 'true');
  report.checks.cameraModes = true;

  for (const kind of ['right-angle', 'hairpin', 's-curve']) {
    const before = await page.locator('#minimap').evaluate(c => c.toDataURL());
    await edit({ cornerPattern: kind, cornerCount: 2, cornerStrength: 60 });
    const text = await page.locator('#pattern-status').innerText();
    assert.match(text, /2 \/ 2개 적용/); assert.match(text, /검사 통과/);
    assert.equal(await page.locator('#pattern-warning').isVisible(), false);
    assert.notEqual(await page.locator('#minimap').evaluate(c => c.toDataURL()), before);
    assert.equal(await page.locator('#coin-count').innerText(), '0 / 10');
    await page.locator('#cornerPattern').scrollIntoViewIfNeeded();
    await screenshot(kind); report.checks[kind] = text;
  }

  const params = { seed: 42, height: 0, width: 80, density: 0, obstacles: 0, curves: 6,
    straight: 0.25, size: 2, cornerPattern: 'auto', cornerCount: 0, cornerStrength: 60 };
  await edit(params); await page.locator('button.generate').click();
  await page.clock.fastForward(200);
  const track = generateTrack(params), coin = generateCoins(track)[0], model = spawnVehicle(track);
  const start = { ...model }, mapBeforeDrive = await page.locator('#minimap').evaluate(c => c.toDataURL());
  await page.locator('#chase').click(); await page.locator('#viewport > canvas').focus();
  let held = new Set(), maxHudSpeed = 0, frames = 0, count = 0;
  const keys = async controls => {
    const next = new Set(Object.entries({ ArrowUp: controls.throttle, ArrowDown: controls.reverse,
      ArrowLeft: controls.left, ArrowRight: controls.right, Space: controls.brake }).filter(([, v]) => v).map(([k]) => k));
    for (const key of held) if (!next.has(key)) await page.keyboard.up(key);
    for (const key of next) if (!held.has(key)) await page.keyboard.down(key);
    held = next;
  };
  for (; frames < 800; frames++) {
    const hit = project(track, model.x, model.z);
    let target = coin;
    if (Math.hypot(model.x - coin.x, model.z - coin.z) > 65) {
      let left = 30, previous = hit;
      for (let k = 1; k < 25; k++) {
        target = track.points[(hit.index + k) % (track.points.length - 1)];
        left -= Math.hypot(target.x - previous.x, target.z - previous.z);
        if (left <= 0) break; previous = target;
      }
    }
    const heading = Math.atan2(target.x - model.x, target.z - model.z);
    const error = Math.atan2(Math.sin(heading - model.heading), Math.cos(heading - model.heading));
    const controls = { ...NO_INPUT, throttle: model.speed < 34, brake: model.speed > 43,
      left: error > 0.035, right: error < -0.035 };
    await keys(controls); await page.clock.fastForward(100);
    updateVehicle(model, controls, track, 0.05);
    if (frames % 5 === 0) {
      const speed = Number(await page.locator('#speed').innerText());
      maxHudSpeed = Math.max(maxHudSpeed, speed);
      count = Number((await page.locator('#coin-count').innerText()).split('/')[0].trim());
      if (count > 0) break;
    }
  }
  await keys(NO_INPUT); await page.keyboard.down('Space');
  for (let i = 0; i < 6; i++) await page.clock.fastForward(100);
  await page.keyboard.up('Space');
  report.drive = { frames, collected: count, maxHudSpeed, modelDistance: Math.hypot(model.x - start.x, model.z - start.z) };
  assert.ok(maxHudSpeed > 15 && report.drive.modelDistance > 40, 'Real arrow-key driving did not progress.');
  assert.ok(count >= 1, 'Real keyboard driving did not collect a coin.');
  assert.notEqual(await page.locator('#minimap').evaluate(c => c.toDataURL()), mapBeforeDrive);
  report.checks.directKeyboardDriving = true; report.checks.coinCollection = true;
  report.checks.movingMinimapMarker = true;
  await screenshot('driving-coin-collected');
  await page.locator('button.generate').click(); await page.clock.fastForward(200);
  assert.equal(await page.locator('#coin-count').innerText(), '0 / 10');
  assert.equal(Number(await page.locator('#speed').innerText()), 0);
  report.checks.manualRegenerationResetsCoins = true;
  assert.deepEqual(report.errors, []); assert.deepEqual(report.unexpectedOrigins, []);
  report.status = 'passed'; save();
  console.log(JSON.stringify({ status: report.status, url: origin, checks: report.checks, drive: report.drive }, null, 2));
} catch (error) {
  report.status = 'failed'; report.failure = String(error?.message ?? error).replaceAll(secret, '[redacted]'); save();
  console.error(report.failure); process.exitCode = 1;
} finally {
  await browser?.close(); await api?.dispose();
}
