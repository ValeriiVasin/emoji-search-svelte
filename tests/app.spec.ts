import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import catalog from '../src/lib/data/catalog.json' with { type: 'json' };

declare global {
  interface Window {
    setKeyboardViewport: (
      height: number,
      top: number,
      event: 'resize' | 'scroll',
    ) => void;
  }
}

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
    await page.getByRole('link', { name: 'Categories', exact: true }).click();
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
    await expect(page.getByRole('searchbox')).toBeFocused();
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, 'writeText', {
        value: () => Promise.reject(new Error('denied')),
      });
    });
    await page.locator('[data-emoji="💩"]').click();
    await expect(page.getByRole('status')).toContainText('Copy unavailable');
    await expect(page.getByRole('searchbox')).toBeFocused();
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
    await page.getByRole('link', { name: 'Categories', exact: true }).click();
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

    await expect(page.getByRole('searchbox')).toHaveCount(0);
    const launcher = await page
      .getByRole('button', { name: 'Open search' })
      .boundingBox();
    expect(launcher.y).toBeLessThan(24);
    expect(
      (await page.locator('[data-emoji]').first().boundingBox()).y,
    ).toBeLessThan(200);
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(232, 234, 237)');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(32, 33, 36)');
    await page.getByRole('button', { name: 'Open search' }).click();
    await expect(page.getByRole('searchbox')).toBeFocused();
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
    await page.getByRole('link', { name: 'Categories', exact: true }).click();
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
    await expect
      .poll(async () => {
        const box = await page
          .getByRole('region', { name: 'Emoji results' })
          .boundingBox();
        return box.y + box.height;
      })
      .toBeLessThanOrEqual(400);
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

test('fills the first viewport even while the full catalog is delayed', async ({
  page,
}) => {
  const manifest = JSON.parse(
    await readFile(
      new URL(
        '../.svelte-kit/output/client/.vite/manifest.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const catalogFile = manifest['src/lib/data/catalog.json'].file;
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(`**/${catalogFile}`, async (route) => {
    await pending;
    await route.continue();
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('searchbox')).toBeFocused();
    await expect
      .poll(() =>
        page
          .getByRole('region', { name: 'Emoji results' })
          .evaluate((results) => {
            const bottom = Math.max(
              ...[...results.querySelectorAll('[data-emoji]')].map(
                (el) => el.getBoundingClientRect().bottom,
              ),
            );
            return Math.max(0, results.getBoundingClientRect().bottom - bottom);
          }),
      )
      .toBeLessThan(64);
  } finally {
    release();
  }
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: 'Emoji results' })
        .evaluate((el) => el.scrollHeight),
    )
    .toBeGreaterThan(10000);
});

test('mobile search opens only on a tap and keeps its query after collapsing', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/');
    const launcher = page.getByRole('button', {
      name: 'Open search',
      exact: true,
    });
    await expect(launcher).toBeVisible();
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement.tagName)).not.toBe(
      'INPUT',
    );
    await launcher.tap();
    const input = page.getByRole('searchbox');
    await expect(input).toBeFocused();
    await input.evaluate((el) => {
      el.dataset.blurs = '0';
      el.addEventListener('blur', () => {
        el.dataset.blurs = String(Number(el.dataset.blurs) + 1);
      });
    });
    await page.locator('.byline').tap();
    await expect(input).toBeFocused();
    await page.getByRole('link', { name: 'Categories', exact: true }).tap();
    await expect(
      page.getByRole('navigation', { name: 'Emoji categories' }),
    ).toBeVisible();
    await expect(input).toBeFocused();
    await page.getByRole('link', { name: 'Nature', exact: true }).tap();
    await expect(
      page.getByRole('link', { name: 'Nature', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(input).toBeFocused();
    await page.getByRole('link', { name: 'Categories', exact: true }).tap();
    await expect(
      page.getByRole('navigation', { name: 'Emoji categories' }),
    ).toHaveCount(0);
    await input.fill('poo');
    await expect(page.locator('[data-emoji="💩"]')).toBeVisible();
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('[data-emoji="💩"]').tap();
    await expect(page.getByRole('status')).toContainText('💩 copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      '💩',
    );
    await expect(input).toBeFocused();
    await page.keyboard.type('p');
    await expect(input).toHaveValue('poop');
    await page.keyboard.press('Backspace');
    await expect(input).toHaveValue('poo');
    await page.locator('.results').tap({ position: { x: 180, y: 180 } });
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute('data-blurs', '0');
    await page.getByRole('button', { name: 'Close search', exact: true }).tap();
    await expect(input).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Edit search: poo', exact: true }),
    ).toHaveCount(0);
    await expect(page).toHaveURL('http://127.0.0.1:4173/?q=poo');
    await launcher.tap();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('poo');
    await input.press('Escape');
    await expect(input).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await launcher.tap();
    await expect(input).toBeFocused();
    await page.setViewportSize({ width: 320, height: 400 });
    await expect
      .poll(() => input.boundingBox().then((box) => box.y + box.height))
      .toBeLessThanOrEqual(400);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.getByRole('button', { name: 'Close search', exact: true }).tap();
    await expect(launcher).toBeVisible();
    await expect(input).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('keeps mobile top search stable after blur and repeated viewport panning', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(() => {
    const viewport = new EventTarget();
    Object.assign(viewport, {
      height: 700,
      width: 390,
      offsetTop: 0,
      offsetLeft: 0,
      scale: 1,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: viewport,
    });
    window.setKeyboardViewport = (height, top, event) => {
      Object.assign(viewport, { height, offsetTop: top });
      viewport.dispatchEvent(new Event(event));
    };
  });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/');
    await page.getByRole('button', { name: 'Open search', exact: true }).tap();
    const input = page.getByRole('searchbox');
    await input.fill('home');
    await page.locator('.byline').tap();
    await expect(input).toBeFocused();
    await page.locator('[data-emoji]').first().tap();
    await expect(page.getByRole('status')).toContainText(
      /copied|Copy unavailable/,
    );
    await expect(input).toBeFocused();
    for (const top of [170, 90, 0]) {
      await input.evaluate((el) => el.blur());
      await page.evaluate(() => window.setKeyboardViewport(700, 0, 'resize'));
      await input.tap();
      await expect(input).toBeFocused();
      await page.evaluate(() => window.setKeyboardViewport(340, 0, 'resize'));
      await expect
        .poll(() =>
          page
            .locator('.shell')
            .evaluate((el) => el.getBoundingClientRect().height),
        )
        .toBe(340);
      const firstEmoji = page.locator('[data-emoji]').first();
      const beforeCopy = await firstEmoji.boundingBox();
      await firstEmoji.tap();
      const status = page.getByRole('status');
      await expect(status).toContainText(/copied|Copy unavailable/);
      // Pan after the real tap: the simulated offset is not a native WebKit viewport.
      await page.evaluate(
        (value) => window.setKeyboardViewport(340, value, 'scroll'),
        top,
      );
      await expect
        .poll(async () => {
          const box = await page.locator('.search-wrap').boundingBox();
          return Math.abs(box.y - top - 12);
        })
        .toBeLessThan(2);
      await expect(input).toHaveValue('home');
      const notice = await status.boundingBox();
      expect(notice.y).toBeGreaterThanOrEqual(top + 64);
      expect(notice.y + notice.height).toBeLessThanOrEqual(beforeCopy.y + top);
      expect(notice.x).toBeGreaterThanOrEqual(0);
      expect(notice.x + notice.width).toBeLessThanOrEqual(390);
      expect(notice.height).toBeLessThanOrEqual(28);
      expect((await firstEmoji.boundingBox()).y).toBe(beforeCopy.y + top);
      await expect(input).toBeFocused();
      await expect
        .poll(() =>
          page
            .locator('.shell')
            .evaluate((el) => el.getBoundingClientRect().top),
        )
        .toBe(top);
      expect(
        await page.evaluate(() => document.scrollingElement.scrollTop),
      ).toBe(0);
    }
    await page.getByRole('button', { name: 'Close search', exact: true }).tap();
    await page.evaluate(() => window.setKeyboardViewport(700, 0, 'resize'));
    await expect(
      page.getByRole('button', { name: 'Open search', exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.locator('.shell').evaluate((el) => el.getBoundingClientRect().top),
      )
      .toBe(0);
  } finally {
    await context.close();
  }
});

test('enables mobile actions only after hydration connects their handlers', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/_app/immutable/entry/*.js', async (route) => {
    await pending;
    await route.continue();
  });
  try {
    await page.goto('http://127.0.0.1:4173/', {
      waitUntil: 'domcontentloaded',
    });
    const launcher = page.getByRole('button', {
      name: 'Open search',
      exact: true,
    });
    await expect(launcher).toBeVisible();
    await expect(launcher).toBeDisabled();
    await expect(page.locator('[data-emoji]').first()).toBeDisabled();
    release();
    await expect(launcher).toBeEnabled();
    await expect(page.locator('[data-emoji]').first()).toBeEnabled();
    await launcher.tap();
    await expect(page.getByRole('searchbox')).toBeFocused();
  } finally {
    release();
    await context.close();
  }
});

test('mobile home mark resets filters and scroll without opening the keyboard', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 600 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const params = new URLSearchParams({
    q: 'face',
    group: 'Smileys & Emotion',
    browse: '1',
    at: '12',
  });
  await page.goto(`/?${params}`);
  const home = page.getByRole('link', {
    name: 'Find your emoji — show all emoji',
  });
  await expect(home).toBeVisible();
  const homeBox = await home.boundingBox();
  const launcherBox = await page
    .getByRole('button', { name: 'Open search' })
    .boundingBox();
  expect(homeBox.x + homeBox.width).toBeLessThanOrEqual(launcherBox.x);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const waves = page.locator('.emoji-finder-waves');
  const firstTransform = await waves.evaluate(
    (el) => getComputedStyle(el).transform,
  );
  await expect
    .poll(() => waves.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(firstTransform);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() =>
      waves.evaluate((el) =>
        el
          .getAnimations()
          .some((animation) => animation.playState === 'running'),
      ),
    )
    .toBe(false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(home).toHaveAttribute('href', '/');
  await expect
    .poll(() => page.locator('.results').evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await home.tap();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('navigation', { name: 'Emoji categories' }),
  ).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect
    .poll(() => page.locator('.results').evaluate((el) => el.scrollTop))
    .toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/q=face/);
  expect(new URL(page.url()).searchParams.get('group')).toBe(
    'Smileys & Emotion',
  );
  await expect
    .poll(() => page.locator('.results').evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Open search' }).tap();
  await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(page.getByRole('searchbox')).toHaveValue('face');
  await expect(home).toHaveCount(0);
  await expect
    .poll(() =>
      waves.evaluate((el) =>
        el
          .getAnimations()
          .some((animation) => animation.playState === 'running'),
      ),
    )
    .toBe(false);
  await page.getByRole('button', { name: 'Close search' }).tap();
  await expect(home).toBeVisible();
  await context.close();
});
