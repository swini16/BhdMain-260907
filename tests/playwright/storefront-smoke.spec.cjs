const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://besthydrate.com';
const PREVIEW_THEME_ID = process.env.PREVIEW_THEME_ID || '';

const PRODUCT_PATHS = [
  process.env.PRODUCT_PATH || '/products/lemonade-best-hydrate',
  process.env.PRODUCT_PATH_FALLBACK || '/products/lemonade-electrolyte-best-hydrate',
];
const QA_QUERY = 'utm_source=qa_automation&utm_medium=playwright&utm_campaign=storefront_smoke';

function withQa(path) {
  const url = new URL(path, BASE_URL);
  const qa = new URLSearchParams(QA_QUERY);
  for (const [key, value] of qa) url.searchParams.set(key, value);
  if (PREVIEW_THEME_ID) url.searchParams.set('preview_theme_id', PREVIEW_THEME_ID);
  return url.toString();
}

async function gotoWithTransientRetry(page, url, options = {}) {
  const transient = new Set([429, 500, 502, 503, 504]);
  let response = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      ...options,
    }).catch(() => null);

    const status = response?.status() || 0;
    if (response && !transient.has(status)) return response;
    if (attempt < 3) await page.waitForTimeout(500 * attempt);
  }

  return response;
}

const ANALYTICS_ENDPOINTS = [
  'api2.amplitude.com',
  'api.eu.amplitude.com',
  'www.google-analytics.com',
  'region1.google-analytics.com',
  'www.facebook.com/tr',
  'a.klaviyo.com',
  'events-api.klaviyo.com',
  'monorail-edge.shopifysvc.com',
  'analytics.shopify.com',
  'analytics.tiktok.com',
  'business-api.tiktok.com',
  'bat.bing.com',
];

async function openAvailableLemonadeProduct(page) {
  const uniquePaths = [...new Set(PRODUCT_PATHS.filter(Boolean))];

  for (const path of uniquePaths) {
    await gotoWithTransientRetry(page, withQa(path));

    const heading = page.getByRole('heading', {
      level: 1,
      name: /Lemonade Electrolyte Powder/i,
    });

    if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
      return path;
    }
  }

  throw new Error(
    `No Lemonade product page was available in this runner's Shopify market. Tried: ${uniquePaths.join(', ')}. Final URL: ${page.url()}`
  );
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();

  // Exercise the real storefront path without polluting customer analytics.
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (ANALYTICS_ENDPOINTS.some((endpoint) => url.includes(endpoint))) {
      await route.abort();
      return;
    }
    await route.continue();
  });
});

test('Lemonade product can add to cart and open checkout', async ({ page }) => {
  await test.step('Load storefront product page', async () => {
    await openAvailableLemonadeProduct(page);
    await expect(
      page.getByRole('heading', { level: 1, name: /Lemonade Electrolyte Powder/i })
    ).toBeVisible();
  });

  await test.step('Add product to cart', async () => {
    const addToCart = page.locator('form[action*="/cart/add"] button[name="add"]').first();

    await expect(addToCart).toBeVisible();
    await expect(addToCart).toBeEnabled();

    const addResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/cart/add') &&
        response.status() >= 200 &&
        response.status() < 400,
      { timeout: 15000 }
    );

    await addToCart.click();
    const addResponse = await addResponsePromise;
    expect(addResponse.ok()).toBeTruthy();

    const cart = await page.evaluate(async () => {
      const transient = new Set([429, 500, 502, 503, 504]);

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const response = await fetch('/cart.js', {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (response.ok) return response.json();
        if (!transient.has(response.status) || attempt === 3) {
          throw new Error(`cart.js returned ${response.status}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }

      throw new Error('cart.js retry loop exhausted');
    });

    expect(cart.item_count).toBeGreaterThan(0);
    expect(
      cart.items.some((item) =>
        String(item.product_title || item.title || '').toLowerCase().includes('lemonade electrolyte powder')
      )
    ).toBeTruthy();
  });

  await test.step('Open Shopify checkout without placing an order', async () => {
    await gotoWithTransientRetry(page, withQa('/cart'));

    await expect(page.locator('a.cart-item__name:visible').filter({ hasText: /Lemonade Electrolyte Powder/i }).first()).toBeVisible();

    const checkout = page.locator('button[name="checkout"]:visible, input[name="checkout"]:visible').first();
    await expect(checkout).toBeVisible();
    await expect(checkout).toBeEnabled();

    await Promise.all([
      page.waitForURL(
        (url) =>
          /\/checkouts?\//i.test(url.pathname) ||
          /checkout/i.test(url.hostname) ||
          /checkout/i.test(url.pathname),
        { timeout: 45000, waitUntil: 'domcontentloaded' }
      ),
      checkout.click(),
    ]);

    expect(page.url()).toMatch(/checkout/i);
  });
});

test('native reviews are responsive and never clip text', async ({ page }, testInfo) => {
  test.skip(
    process.env.GITHUB_EVENT_NAME === 'pull_request' && !PREVIEW_THEME_ID,
    'PR live smoke does not contain unmerged theme changes; preview gate runs this contract against the proposed theme.'
  );

  const paths = ['/', '/products/lemonade-best-hydrate'];
  const isMobile = testInfo.project.name === 'mobile-chromium';

  for (const path of paths) {
    await gotoWithTransientRetry(page, withQa(path));

    const root = page.locator('[data-bhd-native-reviews]').first();
    await expect(root, `${path}: native review section must render`).toBeVisible({ timeout: 15000 });

    const cards = root.locator('[data-bhd-review-card]');
    await expect(cards, `${path}: five review cards must render`).toHaveCount(5);

    const audit = await root.evaluate((section) => {
      const cards = [...section.querySelectorAll('[data-bhd-review-card]')];
      const textNodes = [...section.querySelectorAll('[data-bhd-review-text]')];
      const rootRect = section.getBoundingClientRect();

      return {
        viewportWidth: document.documentElement.clientWidth,
        pageScrollWidth: document.documentElement.scrollWidth,
        root: { left: rootRect.left, right: rootRect.right, width: rootRect.width },
        cards: cards.map((card) => {
          const r = card.getBoundingClientRect();
          return {
            x: Math.round(r.x),
            y: Math.round(r.y),
            width: Math.round(r.width),
            height: Math.round(r.height),
          };
        }),
        clippedText: textNodes
          .map((el) => ({
            text: (el.textContent || '').trim().slice(0, 120),
            clientHeight: el.clientHeight,
            scrollHeight: el.scrollHeight,
            clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
            overflowY: getComputedStyle(el).overflowY,
            overflowX: getComputedStyle(el).overflowX,
          }))
          .filter((x) => x.scrollHeight > x.clientHeight + 2 || x.scrollWidth > x.clientWidth + 2),
      };
    });

    expect(audit.pageScrollWidth, `${path}: reviews must not cause horizontal page overflow`)
      .toBeLessThanOrEqual(audit.viewportWidth + 2);
    expect(audit.root.right, `${path}: review section must fit viewport`)
      .toBeLessThanOrEqual(audit.viewportWidth + 2);
    expect(audit.root.left, `${path}: review section must not escape left edge`).toBeGreaterThanOrEqual(-2);
    expect(audit.clippedText, `${path}: no review text may be clipped`).toEqual([]);

    if (isMobile) {
      const xs = audit.cards.map((card) => card.x);
      expect(Math.max(...xs) - Math.min(...xs), `${path}: mobile cards must form one clean column`).toBeLessThanOrEqual(3);
      for (let idx = 1; idx < audit.cards.length; idx += 1) {
        expect(
          audit.cards[idx].y,
          `${path}: mobile review cards must stack vertically without overlap`
        ).toBeGreaterThan(audit.cards[idx - 1].y);
      }
    } else {
      expect(
        Math.abs(audit.cards[0].y - audit.cards[1].y),
        `${path}: desktop first row must align`
      ).toBeLessThanOrEqual(3);
      expect(
        Math.abs(audit.cards[0].x - audit.cards[1].x),
        `${path}: desktop first row must use two columns`
      ).toBeGreaterThan(50);
      expect(
        audit.cards[4].width,
        `${path}: final odd review must stay card-sized, not stretch across the page`
      ).toBeLessThan(audit.viewportWidth * 0.7);
    }

    await expect(root).toContainText('We would highly recommend Best Hydrate.');
    const summaryText = await root.locator('.bhd-native-reviews__summary').innerText();
    expect(summaryText).toMatch(/reviews?/i);
    await expect(page.locator('#trustreviewsCardsFrame, #trustreviewsFrame')).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath(
        `native-reviews-${path === '/' ? 'home' : 'product'}-${isMobile ? 'mobile' : 'desktop'}.jpg`
      ),
      type: 'jpeg',
      quality: 72,
      fullPage: true,
      animations: 'disabled',
    });
  }
});
