import { expect, test } from '@playwright/test';

const ready = page => expect(page.locator('#status')).toContainText(/Generated|생성 완료/);

test('English is the default; the toggle shows EN pressed', async ({ page }) => {
  await page.goto('/?test=1'); await ready(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.panel-title h1')).toContainText('TrackSeed');
  await expect(page.locator('label[for="cornerPattern"]')).toContainText('Corner pattern');
  await expect(page.locator('#cornerPattern option[value="auto"]')).toHaveText('Auto (original generator)');
  await expect(page.locator('label[for="straight"]')).toHaveText('Straight ratio');
  await expect(page.locator('label[for="width"]')).toHaveText('Track width');
  await expect(page.locator('label[for="seed"]')).toHaveText('RANDOM SEED');
  await expect(page.locator('#camera-label')).toHaveText('Full track');
  await expect(page.locator('#reset')).toHaveText('Reset to defaults');
  await expect(page.locator('#lang-en')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#lang-ko')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#lang-ko')).toHaveText('한국어');
});

test('?lang=ko forces Korean and keeps the original Korean strings', async ({ page }) => {
  await page.goto('/?test=1&lang=ko'); await ready(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.locator('.panel-title h1')).toContainText('TrackSeed');
  await expect(page.locator('label[for="cornerPattern"]')).toContainText('코너 패턴');
  await expect(page.locator('#cornerPattern option[value="auto"]')).toHaveText('Auto · 기존 생성');
  await expect(page.locator('label[for="straight"]')).toHaveText('직선 비율');
  await expect(page.locator('label[for="width"]')).toHaveText('트랙 폭');
  await expect(page.locator('#status')).toContainText('생성 완료');
  await expect(page.locator('#camera-label')).toHaveText('전체 트랙');
  await expect(page.locator('#lang-ko')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/?test=1&lang=en'); await ready(page);
  await expect(page.locator('label[for="straight"]')).toHaveText('Straight ratio');
});

test('toggle switches language in place without regenerating, re-renders dynamic text, preserves inputs', async ({ page }) => {
  await page.goto('/?test=1'); await ready(page);
  await page.locator('#seed').fill('777'); await page.locator('button.generate').click();
  await expect(page.locator('#active-seed')).toHaveText('777');
  const before = await page.evaluate(() => ({ generation: window.__trackseed.generation, samples: window.__trackseed.track.points.length }));
  await page.locator('#lang-ko').click();
  await expect(page.locator('#status')).toContainText('생성 완료');
  await expect(page.locator('#status')).toContainText('Seed 777');
  await expect(page.locator('#pattern-status')).toContainText('기존 생성 방식');
  await expect(page.locator('#validation-counts')).toContainText(/오류 \d+ · 경고 \d+/);
  await expect(page.locator('#coin-complete')).toHaveText('코인 10개를 모두 모았습니다!');
  await expect(page.locator('#chase')).toHaveText(/Drive/);
  await page.locator('#chase').click();
  await expect(page.locator('#camera-label')).toHaveText('차량 추적');
  await page.locator('#lang-en').click();
  await expect(page.locator('#camera-label')).toHaveText('Vehicle chase');
  await expect(page.locator('#orbit-hint')).toContainText('accelerate');
  await expect(page.locator('#status')).toContainText('Generated');
  const after = await page.evaluate(() => ({ generation: window.__trackseed.generation, samples: window.__trackseed.track.points.length }));
  expect(after).toEqual(before);
  await expect(page.locator('#seed')).toHaveValue('777');
});

test('the language choice persists after reload (localStorage), and ?lang overrides it', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await page.locator('#lang-ko').click();
  await expect(page.locator('label[for="width"]')).toHaveText('트랙 폭');
  expect(await page.evaluate(() => localStorage.getItem('trackseed-lang'))).toBe('ko');
  await page.reload(); await ready(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.locator('label[for="width"]')).toHaveText('트랙 폭');
  await expect(page.locator('#lang-ko')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/?lang=en'); await ready(page);
  await expect(page.locator('label[for="width"]')).toHaveText('Track width');
  await page.locator('#lang-en').click();
  await page.goto('/'); await ready(page);
  await expect(page.locator('label[for="width"]')).toHaveText('Track width');
});

test('unavailable localStorage falls back to English and the toggle still works for the page view', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage blocked'); } });
  });
  await page.goto('/'); await ready(page);
  await expect(page.locator('label[for="width"]')).toHaveText('Track width');
  await page.locator('#lang-ko').click();
  await expect(page.locator('label[for="width"]')).toHaveText('트랙 폭');
});
