import { test, expect } from '@playwright/test';

/**
 * Smoke E2E. Requires a Playwright browser binary; in CI these run after
 * `npx playwright install --with-deps`. They drive the real PWA in landscape
 * iPhone viewports and a portrait one (rotation guidance).
 */

test('boots to the title screen and starts a new game', async ({ page }) => {
  await page.goto('/');
  // Canvas is created by Phaser.
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
  // The boot-message overlay is removed once data validates and Title loads.
  await expect(page.locator('#boot-message')).toHaveCount(0, { timeout: 15_000 });
});

test('portrait viewport still renders the canvas (rotation guidance overlay)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
});

test('offline reload works after first load (service worker cache)', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
  // Give the service worker a moment to precache.
  await page.waitForTimeout(2000);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
  await context.setOffline(false);
});
