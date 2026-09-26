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

    await checkout.click();

    await page.waitForURL(
      (url) =>
        /\/checkouts?\//i.test(url.pathname) ||
        /checkout/i.test(url.hostname) ||
        /checkout/i.test(url.pathname),
      { timeout: 45000, waitUntil: 'domcontentloaded' }
    );

    expect(page.url()).toMatch(/checkout/i);
  });
});
