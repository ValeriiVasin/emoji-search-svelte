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

  test('should copy emoji into clipboard', async ({ page }) => {
    await expect(page.locator('.flash')).toBeHidden();

    await page.getByText('💩', { exact: true }).click();

    await expect(page.locator('.flash')).toBeVisible();
    await expect(page.locator('.flash')).toHaveText('💩 copied');
    await expect(page.locator('.flash')).toBeHidden();
  });
});
