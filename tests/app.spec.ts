import { expect, test } from '@playwright/test';
import catalog from '../src/lib/data/catalog.json' with { type: 'json' };

test.describe('emoji search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('searchbox')).toBeFocused();
  });

  test('keeps the first screen small and filters immediately', async ({
    page,
  }) => {
    await expect(
      page.getByRole('navigation', { name: 'Emoji categories' }),
    ).toHaveCount(0);
    expect(await page.locator('[data-emoji]').count()).toBeGreaterThan(0);
    expect(await page.locator('[data-emoji]').count()).toBeLessThan(200);
    await page.getByRole('searchbox').fill('poo');
    await expect(page).toHaveURL('/?q=poo');
    await expect(page.locator('[data-emoji="💩"]')).toBeVisible();
    await expect(page.locator('[data-emoji="😀"]')).toHaveCount(0);
    expect(await page.locator('[data-emoji]').count()).toBeLessThanOrEqual(72);
  });

  test('replaces typing history and restores category with Back, Forward and refresh', async ({
    page,
  }) => {
    await page.getByRole('searchbox').fill('smile');
    await expect(page).toHaveURL('/?q=smile');
    await page.getByRole('link', { name: 'Browse categories' }).click();
    await page.getByRole('link', { name: 'People', exact: true }).click();
    await expect(page).toHaveURL(/group=People/);
    await page.goBack();
    await expect(page).toHaveURL('/?q=smile&browse=1');
    await page.reload();
    await expect(page.getByRole('searchbox')).toHaveValue('smile');
    await page.goForward();
    await expect(page).toHaveURL(/group=People/);
    await expect(page.getByRole('searchbox')).toHaveValue('smile');
    await page.getByRole('searchbox').focus();
    await page
      .getByRole('searchbox')
      .evaluate((input) =>
        input.setSelectionRange(input.value.length, input.value.length),
      );
    await page.getByRole('searchbox').pressSequentially('s');
    await expect(page).toHaveURL(/q=smiles/);
    await page.goBack();
    await expect(page).toHaveURL('/?q=smile&browse=1');
  });

  test('copies the actual emoji and reports clipboard errors honestly', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('searchbox').fill('poo');
    await page.locator('[data-emoji="💩"]').click();
    await expect(page.getByRole('status')).toContainText('💩 copied');
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe('💩');
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, 'writeText', {
        value: () => Promise.reject(new Error('denied')),
      });
    });
    await page.locator('[data-emoji="💩"]').click();
    await expect(page.getByRole('status')).toContainText('Copy unavailable');
  });

  test('restores shared searches and includes Unicode 18 additions', async ({
    page,
  }) => {
    await page.goto('/?q=cracking%20face');
    await expect(page.getByRole('searchbox')).toHaveValue('cracking face');
    await expect(
      page.getByRole('button', { name: /Copy cracking face/ }),
    ).toBeVisible();
    await page.getByRole('searchbox').fill('');
    await page.getByRole('searchbox').pressSequentially('cracking face');
    await expect(
      page.getByRole('button', { name: /Copy cracking face/ }),
    ).toBeVisible();
    await page.goto('/?q=poo');
    await expect(page.locator('[data-emoji="💩"]')).toBeVisible();
  });

  test('progressively scrolls to the last emoji with bounded DOM and restores shared position', async ({
    page,
  }) => {
    const results = page.getByRole('region', { name: 'Emoji results' });
    await expect(
      page.getByRole('navigation', { name: 'Results pages' }),
    ).toHaveCount(0);
    await expect
      .poll(() => results.evaluate((el) => el.scrollHeight))
      .toBeGreaterThan(10000);
    await results.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const last = catalog.at(-1)[0];
    await expect(page.locator('[data-emoji]').last()).toHaveAttribute(
      'data-emoji',
      last,
    );
    await expect
      .poll(() => new URL(page.url()).searchParams.get('at'))
      .not.toBeNull();
    expect(await page.locator('[data-emoji]').count()).toBeLessThan(200);
    const shared = page.url();
    await page.reload();
    await expect(page.locator('[data-emoji]').last()).toHaveAttribute(
      'data-emoji',
      last,
    );
    await expect(page).toHaveURL(shared);
    await results.evaluate((el) => {
      el.scrollTop = 0;
    });
    await expect(page.locator('[data-emoji]').first()).toHaveAttribute(
      'data-emoji',
      '😀',
    );
    await expect(page).toHaveURL('/');
    await results.evaluate((el) => {
      el.scrollTop = 2000;
    });
    await expect
      .poll(() => new URL(page.url()).searchParams.has('at'))
      .toBe(true);
    await page.getByRole('searchbox').fill('poo');
    await expect(page).toHaveURL('/?q=poo');
    await expect(page.locator('[data-emoji="💩"]')).toBeVisible();
    await expect.poll(() => results.evaluate((el) => el.scrollTop)).toBe(0);
  });

  test('adapts to mobile, system theme, empty results and clearing', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.getByRole('link', { name: 'Browse categories' }).click();
    const categories = page.getByRole('navigation', {
      name: 'Emoji categories',
    });
    expect(
      await categories.evaluate((nav) => nav.scrollWidth <= nav.clientWidth),
    ).toBe(true);
    expect(
      await categories.getByRole('link').evaluateAll((links) =>
        links.every((link) => {
          const box = link.getBoundingClientRect();
          const hit = document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          );
          return (
            box.x >= 0 && box.right <= innerWidth && hit?.closest('a') === link
          );
        }),
      ),
    ).toBe(true);

    expect((await page.getByRole('searchbox').boundingBox()).y).toBeLessThan(
      24,
    );
    expect(
      (await page.locator('[data-emoji]').first().boundingBox()).y,
    ).toBeLessThan(200);
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(232, 234, 237)');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(32, 33, 36)');
    await page.getByRole('searchbox').fill('no_such_emoji_123456789');
    await expect(page.locator('.no-result')).toBeVisible();
    await expect(page.locator('[data-emoji]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page).toHaveURL('/?browse=1');
    await expect(page.locator('[data-emoji="😀"]')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    const resultBox = await page
      .getByRole('region', { name: 'Emoji results' })
      .boundingBox();
    expect(resultBox.y + resultBox.height).toBeLessThanOrEqual(740);
    await page.getByRole('link', { name: 'Hide categories' }).click();
    await expect(
      page.getByRole('navigation', { name: 'Emoji categories' }),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 400 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight,
        ),
      )
      .toBe(true);
    const shortResults = await page
      .getByRole('region', { name: 'Emoji results' })
      .boundingBox();
    expect(shortResults.y + shortResults.height).toBeLessThanOrEqual(400);
    expect(await page.locator('[data-emoji]').count()).toBeLessThan(100);
    const size = await page.locator('[data-emoji]').first().boundingBox();
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
  });
});

test('renders a useful first screen before JavaScript or the catalog loads', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Emoji Search',
  );
  await expect(page.locator('[data-emoji]')).toHaveCount(72);
  expect(requests.some((url) => url.includes('catalog'))).toBe(false);
  await context.close();
});
