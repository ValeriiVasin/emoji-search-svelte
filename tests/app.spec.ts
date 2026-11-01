import { expect, test } from '@playwright/test';

test.describe('emoji app', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('searchbox')).toBeFocused();
  });

  test('search box is focused after the page load', async ({ page }) => {
    await expect(page.getByRole('searchbox')).toBeFocused();
  });

  test('should filter emojis', async ({ page }) => {
    await page.getByRole('searchbox').fill('poo');

    await expect(page).toHaveURL('/?q=poo');
    await expect(page.locator('[data-emoji="💩"]')).toBeVisible();
    await expect(page.locator('[data-emoji="😀"]')).toBeHidden();
  });

  test('should keep search state through navigation and refresh', async ({ page }) => {
    await page.getByRole('searchbox').fill('poo');
    await page.getByRole('searchbox').fill('smile');

    await page.goBack();
    await expect(page.getByRole('searchbox')).toHaveValue('poo');

    await page.reload();
    await expect(page.getByRole('searchbox')).toHaveValue('poo');
  });

  test('should copy emoji into clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await expect(page.locator('.flash')).toBeHidden();

    await page.getByText('💩', { exact: true }).click();

    await expect(page.locator('.flash')).toBeVisible();
    await expect(page.locator('.flash')).toHaveText('💩 copied');
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('💩');
    await expect(page.locator('.flash')).toBeHidden();
  });

  test('should restore a shared query URL', async ({ page }) => {
    await page.goto('/?q=poo');
    await expect(page.getByRole('searchbox')).toHaveValue('poo');
    await expect(page.locator('[data-emoji="💩"]')).toBeVisible();
    await expect(page.locator('[data-emoji="😀"]')).toBeHidden();
  });

  test('should show empty results and restore emojis when cleared', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('searchbox').fill('no_such_emoji_123456789');
    await expect(page.locator('.no-result')).toBeVisible();
    await expect(page.locator('[data-emoji]:visible')).toHaveCount(0);
    await page.getByRole('searchbox').fill('');
    await expect(page).toHaveURL('/');
    await expect(page.locator('.no-result')).toBeHidden();
    await expect(page.locator('[data-emoji="😀"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
