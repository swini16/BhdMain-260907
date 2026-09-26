const { test, expect } = require('@playwright/test');

const PRODUCT_PATHS = [
  process.env.PRODUCT_PATH || '/products/lemonade-best-hydrate',
  process.env.PRODUCT_PATH_FALLBACK || '/products/lemonade-electrolyte-best-hydrate',
];
const QA_QUERY = 'utm_source=qa_automation&utm_medium=playwright&utm_campaign=storefront_smoke';

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
    await page.goto(`${path}?${QA_QUERY}`, { waitUntil: 'domcontentloaded' });

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
  await test.step('Load live product page', async () => {
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
      const response = await fetch('/cart.js', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`cart.js returned ${response.status}`);
      return response.json();
    });

    expect(cart.item_count).toBeGreaterThan(0);
    expect(
      cart.items.some((item) =>
        String(item.product_title || item.title || '').toLowerCase().includes('lemonade electrolyte powder')
      )
    ).toBeTruthy();
  });

  await test.step('Open Shopify checkout without placing an order', async () => {
    await page.goto(`/cart?${QA_QUERY}`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/Lemonade Electrolyte Powder/i).first()).toBeVisible();

    const checkout = page.locator('button[name="checkout"], input[name="checkout"]').first();
    await expect(checkout).toBeVisible();
    await expect(checkout).toBeEnabled();

    await checkout.click();

    await page.waitForURL(
      (url) =>
        /\/checkouts?\//i.test(url.pathname) ||
        /checkout/i.test(url.hostname) ||
        /checkout/i.test(url.pathname),
      { timeout: 20000 }
    );

    expect(page.url()).toMatch(/checkout/i);
  });
});
