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

test('full TrustReviews widget is readable on home and product', async ({ page }, testInfo) => {
  test.skip(!PREVIEW_THEME_ID, 'Requires proposed Shopify preview theme; live main is verified after merge.');

  const paths = ['/', '/products/lemonade-best-hydrate'];
  const isMobile = testInfo.project.name === 'mobile-chromium';

  for (const path of paths) {
    await gotoWithTransientRetry(page, withQa(path));

    const host = page.locator('#trustreviewsFrame').first();
    await expect(host, `${path}: full TrustReviews iframe must render`).toBeVisible({ timeout: 20000 });
    await expect(host, `${path}: iframe must allow scrolling as a future-content fallback`).toHaveAttribute('scrolling', 'auto');

    await page.waitForTimeout(2500);

    const hostBox = await host.boundingBox();
    expect(hostBox, `${path}: TrustReviews iframe needs a rendered box`).not.toBeNull();

    const minimumHeight = isMobile ? 1550 : 780;
    expect(
      hostBox.height,
      `${path}: TrustReviews iframe must have enough room for current full reviews`
    ).toBeGreaterThanOrEqual(minimumHeight);

    await expect(
      host,
      `${path}: must embed the full review widget, not the clipped carousel`
    ).toHaveAttribute('src', /reviews\.trustapps\.co\/_w\/[^/]+\/8904882422044/i);

    // The reviews iframe is intentionally lazy-loaded for storefront performance.
    // Scroll it into view before inspecting its cross-origin document.
    await host.scrollIntoViewIfNeeded();

    await expect
      .poll(
        async () => {
          const handle = await host.elementHandle();
          const frame = handle ? await handle.contentFrame() : null;
          return frame?.url() || '';
        },
        {
          timeout: 20000,
          message: `${path}: full TrustReviews iframe should navigate after entering the viewport`,
        }
      )
      .toMatch(/reviews\.trustapps\.co\/_w\/[^/]+\/8904882422044/i);

    const elementHandle = await host.elementHandle();
    const reviewFrame = await elementHandle.contentFrame();
    expect(reviewFrame, `${path}: TrustReviews full widget frame must be accessible to Playwright`).toBeTruthy();

    await reviewFrame.locator('body').waitFor({ state: 'visible', timeout: 15000 });

    const audit = await reviewFrame.locator('body').evaluate((body) => {
      const visible = (el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity || 1) !== 0 &&
          rect.width > 1 &&
          rect.height > 1
        );
      };

      const clipped = [...body.querySelectorAll('*')]
        .filter(visible)
        .map((el) => {
          const style = getComputedStyle(el);
          const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
          return {
            tag: el.tagName,
            text: text.slice(0, 160),
            clientHeight: el.clientHeight,
            scrollHeight: el.scrollHeight,
            clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
            overflowY: style.overflowY,
            overflowX: style.overflowX,
          };
        })
        .filter((x) =>
          x.text.length > 40 &&
          (
            (x.scrollHeight > x.clientHeight + 3 && ['hidden', 'clip'].includes(x.overflowY)) ||
            (x.scrollWidth > x.clientWidth + 3 && ['hidden', 'clip'].includes(x.overflowX))
          )
        )
        .slice(0, 20);

      return {
        text: (body.innerText || '').replace(/\s+/g, ' ').trim(),
        clientHeight: body.clientHeight,
        scrollHeight: body.scrollHeight,
        clientWidth: body.clientWidth,
        scrollWidth: body.scrollWidth,
        clipped,
      };
    });

    expect(audit.text, `${path}: full widget must contain review content`).toMatch(/5 reviews/i);
    expect(audit.text, `${path}: Andy review must be fully available`).toContain('We would highly recommend Best Hydrate.');
    expect(audit.clipped, `${path}: review text must not be clipped`).toEqual([]);
    expect(audit.scrollWidth, `${path}: widget must not overflow horizontally`).toBeLessThanOrEqual(audit.clientWidth + 2);
    expect(
      hostBox.height + 2,
      `${path}: outer iframe must contain the full current widget body without vertical clipping`
    ).toBeGreaterThanOrEqual(audit.scrollHeight);

    await page.screenshot({
      path: testInfo.outputPath(
        `trustreviews-full-${path === '/' ? 'home' : 'product'}-${isMobile ? 'mobile' : 'desktop'}.jpg`
      ),
      type: 'jpeg',
      quality: 72,
      fullPage: true,
      animations: 'disabled',
    });
  }
});
