import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../../src/version.ts';

async function ready(page) {
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('Generated');
}
async function exportFile(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export-json').click()]);
  const path = join(mkdtempSync(join(tmpdir(), 'tlsx-io-')), download.suggestedFilename());
  await download.saveAs(path);
  return { name: download.suggestedFilename(), path, text: readFileSync(path, 'utf8') };
}
async function parseInPage(page, text) {
  return page.evaluate(async text => {
    const { parseTrackDocument } = await import('/src/schema.ts');
    const d = parseTrackDocument(text);
    return { digest: d.integrity.digest, params: d.params };
  }, text);
}
async function setParams(page, values) {
  for (const [key, value] of Object.entries(values)) {
    await page.locator(`#${key === 'seed' ? 'seed' : key + '-value'}`).fill(String(value));
  }
  await page.locator('button.generate').click();
}

test('io: export downloads a parseable document whose digest matches name and diagnostics', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await ready(page);
  const file = await exportFile(page);
  const parsed = await parseInPage(page, file.text);
  expect(file.name).toBe(`tracklab-42-${parsed.digest.slice(0, 8)}.json`);
  expect(parsed.params.seed).toBe(42);
  const live = await page.evaluate(async () => {
    const { serializeTrack } = await import('/src/schema.ts');
    const s = window.__tracklab;
    return { json: serializeTrack(s.track), digest: s.exportDigest };
  });
  expect(file.text).toBe(live.json);
  expect(live.digest).toBe(parsed.digest);
  await expect(page.locator('#io-message')).toContainText('Exported');
  expect(errors).toEqual([]);
});

test('io: importing an exported file into a fresh page reproduces params and digest', async ({ page, browser }) => {
  await ready(page);
  await setParams(page, { curves: 9, width: 70, seed: 777, height: 40 });
  await expect.poll(() => page.evaluate(() => window.__tracklab.track.params.seed)).toBe(777);
  const file = await exportFile(page);
  const original = await parseInPage(page, file.text);
  const fresh = await (await browser.newContext()).newPage();
  await ready(fresh);
  expect(await fresh.evaluate(() => window.__tracklab.track.params.seed)).toBe(42);
  const generation = await fresh.evaluate(() => window.__tracklab.generation);
  await fresh.locator('#import-file').setInputFiles(file.path);
  await expect(fresh.locator('#status')).toContainText('Imported');
  expect(await fresh.evaluate(() => window.__tracklab.generation)).toBeGreaterThan(generation);
  const state = await fresh.evaluate(async () => {
    const { exportTrack } = await import('/src/schema.ts');
    const s = window.__tracklab;
    return { params: s.track.params, digest: exportTrack(s.track).integrity.digest, coins: s.coins.total, speed: s.pose.speed };
  });
  expect(state.params).toEqual(original.params);
  expect(state.digest).toBe(original.digest);
  expect(state.speed).toBe(0);
  await expect(fresh.locator('#seed')).toHaveValue('777');
  await expect(fresh.locator('#curves-value')).toHaveValue('9');
  await expect(fresh.locator('#active-seed')).toHaveText('777');
  await fresh.context().close();
});

test('io: a tampered file shows the error and keeps the previous track', async ({ page }) => {
  await ready(page);
  const file = await exportFile(page);
  const doc = JSON.parse(file.text);
  doc.geometry.points[3].x += 1; // content changed, digest left alone
  const tampered = join(mkdtempSync(join(tmpdir(), 'tlsx-bad-')), 'tampered.json');
  writeFileSync(tampered, JSON.stringify(doc));
  await setParams(page, { seed: 5 });
  await expect.poll(() => page.evaluate(() => window.__tracklab.track.params.seed)).toBe(5);
  const before = await page.evaluate(() => ({ generation: window.__tracklab.generation,
    track: JSON.stringify(window.__tracklab.track) }));
  await page.locator('#import-file').setInputFiles(tampered);
  await expect(page.locator('#status')).toContainText('Import failed');
  await expect(page.locator('#status')).toContainText('digest mismatch');
  await expect(page.locator('#io-message')).toHaveClass(/error/);
  const after = await page.evaluate(() => ({ generation: window.__tracklab.generation,
    track: JSON.stringify(window.__tracklab.track) }));
  expect(after).toEqual(before);
  await expect(page.locator('#seed')).toHaveValue('5');
  // not JSON at all
  const junk = join(mkdtempSync(join(tmpdir(), 'tlsx-junk-')), 'junk.json');
  writeFileSync(junk, 'not json');
  await page.locator('#import-file').setInputFiles(junk);
  await expect(page.locator('#status')).toContainText('invalid JSON');
  expect(await page.evaluate(() => window.__tracklab.generation)).toBe(before.generation);
});

test('io: validation panel is OK for default seed-42 Auto, INVALID with the Legacy join, OK for a pattern track', async ({ page }) => {
  await ready(page);
  await expect(page.locator('#autoJoin')).toHaveValue('tangent');
  await expect(page.locator('#validation-badge')).toHaveText('OK');
  expect((await page.evaluate(() => window.__tracklab.validation)).ok).toBe(true);
  await expect(page.locator('#validation-violations .violation-error')).toHaveCount(0);
  // Legacy (v1.0.0) straight join at the default straight ratio 0.25: the known defect
  await page.locator('#autoJoin').selectOption('legacy');
  await expect.poll(() => page.evaluate(() => window.__tracklab.track.params.autoJoin)).toBe('legacy');
  await expect(page.locator('#validation-badge')).toHaveText('INVALID');
  await expect(page.locator('#validation-checks [data-check="self-intersection"]')).toHaveClass(/check-error/);
  await expect(page.locator('#validation-checks [data-check="edge-fold"]')).toHaveClass(/check-error/);
  await expect(page.locator('#validation-violations .violation-error code').filter({ hasText: /^LOCAL_KINK$/ }).first()).toBeVisible();
  const summary = await page.evaluate(() => window.__tracklab.validation);
  expect(summary.ok).toBe(false);
  expect(summary.errors).toBeGreaterThan(0);
  expect(summary.failedChecks).toEqual(expect.arrayContaining(['self-intersection', 'edge-fold']));
  await page.locator('#autoJoin').selectOption('tangent');
  await expect.poll(() => page.evaluate(() => window.__tracklab.track.params.autoJoin)).toBe('tangent');
  await expect(page.locator('#validation-badge')).toHaveText('OK');
  // a spliced pattern makes the join inert: the control is disabled and shows the canonical legacy value
  await page.locator('#cornerPattern').selectOption('right-angle');
  await page.locator('#cornerCount-value').fill('3');
  await page.locator('#cornerStrength-value').fill('60');
  await expect.poll(() => page.evaluate(() => window.__tracklab.track.params.cornerPattern)).toBe('right-angle');
  await expect(page.locator('#pattern-status')).toContainText('3 / 3 applied');
  await expect(page.locator('#autoJoin')).toBeDisabled();
  await expect(page.locator('#autoJoin')).toHaveValue('legacy');
  await expect(page.locator('#autojoin-hint')).toBeVisible();
  await expect(page.locator('#validation-badge')).toHaveText('OK');
  expect((await page.evaluate(() => window.__tracklab.validation)).ok).toBe(true);
  await expect(page.locator('#validation-violations .violation-error')).toHaveCount(0);
});

test('io: importing a v1.0.0 Auto document keeps the legacy join and re-exports the same digest', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const fixture = fileURLToPath(new URL('../fixtures/v1.0.0-auto-seed42.json', import.meta.url));
  const original = JSON.parse(readFileSync(fixture, 'utf8'));
  expect('autoJoin' in original.params).toBe(false);
  await ready(page);
  await expect(page.locator('#autoJoin')).toHaveValue('tangent');
  await page.locator('#import-file').setInputFiles(fixture);
  await expect(page.locator('#status')).toContainText('Imported');
  await expect(page.locator('#status')).not.toContainText('Import failed');
  await expect(page.locator('#io-message')).not.toHaveClass(/error/);
  await expect(page.locator('#io-message')).toContainText(original.integrity.digest.slice(0, 8));
  await expect(page.locator('#autoJoin')).toHaveValue('legacy');
  expect(await page.evaluate(() => window.__tracklab.track.params.autoJoin)).toBe('legacy');
  const file = await exportFile(page);
  const exported = JSON.parse(file.text);
  expect('autoJoin' in exported.params).toBe(false);
  expect(exported.params).toEqual(original.params);
  // The digest covers the generator stamp, so it differs from the 1.0.0 fixture by design;
  // contentDigest excludes the stamp and must match.
  expect(exported.generator.version).toBe(VERSION);
  expect(exported.integrity.digest).not.toBe(original.integrity.digest);
  expect(exported.integrity.contentDigest).toBe(original.integrity.contentDigest);
  expect(errors).toEqual([]);
});

test('io: keyboard driving still works after import', async ({ page }) => {
  await ready(page);
  const file = await exportFile(page);
  await setParams(page, { seed: 9, height: 0, width: 80, obstacles: 0 });
  await expect.poll(() => page.evaluate(() => window.__tracklab.track.params.seed)).toBe(9);
  await page.locator('#import-file').setInputFiles(file.path);
  await expect(page.locator('#status')).toContainText('Imported');
  expect(await page.evaluate(() => window.__tracklab.track.params.seed)).toBe(42);
  await page.locator('#viewport > canvas').focus();
  const start = await page.evaluate(() => ({ x: window.__tracklab.pose.x, z: window.__tracklab.pose.z }));
  await page.keyboard.down('ArrowUp');
  await expect.poll(() => page.evaluate(() => window.__tracklab.pose.speed)).toBeGreaterThan(5);
  await expect.poll(() => page.evaluate(({ x, z }) => Math.hypot(window.__tracklab.pose.x - x, window.__tracklab.pose.z - z), start)).toBeGreaterThan(5);
  await page.keyboard.up('ArrowUp');
});
