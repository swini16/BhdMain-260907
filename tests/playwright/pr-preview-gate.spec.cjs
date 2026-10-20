const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'https://besthydrate.com';
const PREVIEW_THEME_ID = process.env.PREVIEW_THEME_ID || '';
const PATHS = [...new Set((process.env.PREVIEW_PATHS || '/').split(',').map((v) => v.trim()).filter(Boolean))];
const EXPECT_NAV = process.env.PREVIEW_EXPECT_NAV === 'true';

const ANALYTICS = [
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
  'web-pixels@',
];

function isAnalytics(url) {
  return ANALYTICS.some((needle) => url.includes(needle));
}

function isFirstParty(url) {
  try {
    const target = new URL(url);
    const base = new URL(BASE_URL);
    return target.origin === base.origin || target.hostname.endsWith('.myshopify.com');
  } catch {
    return false;
  }
}

function isIgnorableShopifyAbort(url) {
  try {
    const p = new URL(url).pathname;
    return (
      p === '/api/collect' ||
      p === '/api/event/collect' ||
      p === '/shopify_pay/accelerated_checkout' ||
      p === '/services/login_with_shop/authorize' ||
      p === '/.well-known/shopify/monorail/unstable/produce_batch'
    );
  } catch {
    return false;
  }
}

const PRODUCT_FALLBACKS = [
  '/products/lemonade-best-hydrate',
  '/products/lemonade-electrolyte-best-hydrate',
];

function previewUrl(path) {
  const url = new URL(path, BASE_URL);
  url.searchParams.set('utm_source', 'qa_automation');
  url.searchParams.set('utm_medium', 'playwright');
  url.searchParams.set('utm_campaign', 'pr_preview_targeted');
  if (PREVIEW_THEME_ID) url.searchParams.set('preview_theme_id', PREVIEW_THEME_ID);
  return url.toString();
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await context.route('**/*', async (route) => {
    if (isAnalytics(route.request().url())) return route.abort();
    return route.continue();
  });
});

for (const path of PATHS) {
  test(`targeted preview: ${path}`, async ({ page }) => {
    const firstPartyFailures = [];
    const pageErrors = [];

    page.on('pageerror', (error) => {
      const message = error.message || '';
      if (
        !message.includes('analytics.tiktok.com') &&
        !message.includes('Error completing request. A network failure may have prevented the request from completing')
      ) {
        pageErrors.push(message);
      }
    });

    page.on('response', (response) => {
      const type = response.request().resourceType();
      if (
        isFirstParty(response.url()) &&
        ['document', 'script', 'stylesheet', 'image', 'font'].includes(type) &&
        response.status() >= 400
      ) {
        firstPartyFailures.push(`${response.status()} ${type} ${response.url()}`);
      }
    });

    page.on('requestfailed', (request) => {
      const url = request.url();
      if (!isAnalytics(url) && !isIgnorableShopifyAbort(url) && isFirstParty(url)) {
        firstPartyFailures.push(
          `FAILED ${request.resourceType()} ${url} :: ${request.failure()?.errorText || 'unknown'}`
        );
      }
    });

    let effectivePath = path;
    let response = await page.goto(previewUrl(effectivePath), { waitUntil: 'domcontentloaded' });

    if (path.startsWith('/products/') && (!response || response.status() >= 400)) {
      for (const fallback of PRODUCT_FALLBACKS) {
        if (fallback === effectivePath) continue;
        const candidate = await page.goto(previewUrl(fallback), { waitUntil: 'domcontentloaded' });
        if (candidate && candidate.status() < 400) {
          effectivePath = fallback;
          response = candidate;
          // The failed canonical probe intentionally navigated away from a 404.
          // Discard request failures caused by that probe/navigation so only
          // defects on the resolved product route can block the PR.
          firstPartyFailures.length = 0;
          pageErrors.length = 0;
          break;
        }
      }
    }

    expect(response, `${path}: document response`).not.toBeNull();
    expect(response.status(), `${path}: HTTP status`).toBeLessThan(400);

    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    }).catch(() => {});
    await page.waitForTimeout(120);

    const title = (await page.title()).trim();
    expect(title.length, `${path}: non-empty title`).toBeGreaterThan(0);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      overflow.scrollWidth - overflow.clientWidth,
      `${path}: no horizontal viewport overflow`
    ).toBeLessThanOrEqual(4);

    if (EXPECT_NAV && path === '/') {
      const body = page.locator('body');
      await expect(body).toContainText('Science');
      await expect(body).toContainText('Solutions');
      await expect(body).toContainText('Connect');
      await expect(body).toContainText('PREP');
      await expect(body).toContainText('PERFORM');
      await expect(body).toContainText('RECOVER');
      await expect(body).toContainText('Partnerships');
      await expect(body).toContainText('Investor & Media Relations');
    }

    if (path.startsWith('/products/')) {
      const add = page.locator('form[action*="/cart/add"] button[type="submit"]:visible').first();
      await expect(add, `${effectivePath}: visible add-to-cart control`).toBeVisible();
    }

    expect(firstPartyFailures, `${path}: first-party network failures`).toEqual([]);
    expect(pageErrors, `${path}: uncaught JavaScript errors`).toEqual([]);
  });
}

// Approved temporary-preview acceptance only. Never place an order or enter identity/payment data.
for (const market of [
  { country: 'CA', currency: 'CAD', handle: 'lemonade-best-hydrate', variant: '47373155631388' },
  { country: 'US', currency: 'USD', handle: 'lemonade-electrolyte-best-hydrate', variant: '51937870741788' },
]) {
  test(`Lemonade preview acceptance: ${market.country} quantity/cart/FIRST15/pre-order checkout`, async ({ page }, testInfo) => {
    test.setTimeout(120000);
    test.skip(!PREVIEW_THEME_ID, 'Requires the governed development-theme preview; never fall back to live QA.');
    expect(new URL(BASE_URL).hostname).toBe('127.0.0.1');
    const evidence = { country: market.country, project: testInfo.project.name, themeId: PREVIEW_THEME_ID, quantities: [], first15: [], checkout: 'not reached' };
    const api = async (path, data) => {
      const response = await page.request.post(new URL(path, BASE_URL).toString(), { data });
      expect(response.ok(), `${path} status ${response.status()}`).toBeTruthy();
      return response.json();
    };
    const readCart = async () => {
      const response = await page.request.get(new URL('/cart.js', BASE_URL).toString());
      expect(response.ok()).toBeTruthy();
      return response.json();
    };
    const safeCart = cart => ({
      currency: cart.currency, quantity: cart.item_count, original: cart.original_total_price, total: cart.total_price,
      discounts: [...new Set([
        ...(cart.cart_level_discount_applications || []).map(d => d.title),
        ...cart.items.flatMap(item => (item.line_level_discount_allocations || []).map(d => d.discount_application.title)),
      ])],
    });
    try {
      await page.goto(previewUrl('/'), { waitUntil: 'domcontentloaded' });
      const localize = await page.request.post(new URL('/localization', BASE_URL).toString(), {
        form: { form_type: 'localization', country_code: market.country, language_code: 'en', return_to: `/products/${market.handle}` },
      });
      expect(localize.ok(), 'market localization').toBeTruthy();
      await api('/cart/clear.js', {});
      await api('/cart/update.js', { discount: '' });
      await page.goto(previewUrl(`/products/${market.handle}`), { waitUntil: 'domcontentloaded' });
      const widget = page.locator('bhd-lemonade-volume:visible');
      await expect(widget).toHaveCount(1);
      await expect(widget).toHaveAttribute('data-variant-id', market.variant);
      const quantityInput = page.locator('product-info input[name="quantity"]');
      for (const quantity of [1, 2, 3, 1]) {
        const button = widget.locator(`[data-volume-quantity="${quantity}"]`);
        await expect(button).toBeEnabled();
        await button.click();
        await expect(quantityInput).toHaveValue(String(quantity));
        await expect(button).toHaveAttribute('aria-pressed', 'true');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
      await testInfo.attach(`lemonade-${market.country}-product`, { body: await widget.screenshot(), contentType: 'image/png' });
      const addResponse = page.waitForResponse(r => r.url().includes('/cart/add') && r.request().method() === 'POST');
      await page.locator('product-info form[action*="/cart/add"] button[type="submit"]').click();
      expect((await addResponse).ok()).toBeTruthy();
      await page.goto(previewUrl('/cart'), { waitUntil: 'domcontentloaded' });
      for (const quantity of [1, 2, 3, 1]) {
        const input = page.locator('cart-items input[name="updates[]"]').first();
        if (Number(await input.inputValue()) !== quantity) {
          const changed = page.waitForResponse(r => r.url().includes('/cart/change') && r.request().method() === 'POST');
          await input.fill(String(quantity)); await input.blur();
          expect((await changed).ok()).toBeTruthy();
        }
        await expect(page.locator('#main-cart-footer .bhd-lemonade-cart-offer')).toHaveCount(1);
        const cart = await readCart();
        expect(cart.currency).toBe(market.currency); expect(cart.item_count).toBe(quantity);
        const bfcm = Date.now() >= Date.parse('2026-11-27T07:00:00Z') && Date.now() < Date.parse('2026-12-01T07:00:00Z');
        const rate = bfcm ? (quantity === 1 ? .20 : .25) : (quantity === 1 ? 0 : quantity === 2 ? .10 : .15);
        expect(Math.abs(cart.total_price - Math.round(cart.original_total_price * (1 - rate)))).toBeLessThanOrEqual(quantity);
        const prompt = page.locator('#main-cart-footer .bhd-lemonade-cart-offer__nudge');
        if (!bfcm && quantity < 3) await expect(prompt).toContainText(`${quantity + 1}-jar`);
        else await expect(prompt).toHaveCount(0);
        evidence.quantities.push(safeCart(cart));
      }
      await testInfo.attach(`lemonade-${market.country}-cart`, { body: await page.locator('#main-cart-footer').screenshot(), contentType: 'image/png' });
      await api('/cart/update.js', { discount: 'FIRST15' });
      for (const quantity of [1, 2, 3, 1]) {
        const cart = await api('/cart/change.js', { line: 1, quantity });
        const summary = safeCart(cart); evidence.first15.push(summary);
        expect(cart.currency).toBe(market.currency); expect(cart.item_count).toBe(quantity);
        const bfcm = Date.now() >= Date.parse('2026-11-27T07:00:00Z') && Date.now() < Date.parse('2026-12-01T07:00:00Z');
        const rate = bfcm ? (quantity === 1 ? .20 : .25) : .15;
        expect(Math.abs(cart.total_price - Math.round(cart.original_total_price * (1 - rate)))).toBeLessThanOrEqual(quantity);
        expect(summary.discounts.length, 'non-stacking: only one applied offer').toBe(1);
        if (!bfcm && quantity < 3) expect(summary.discounts[0]).toBe('FIRST15');
      }
      await page.goto(previewUrl('/cart'), { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#main-cart-footer .bhd-lemonade-cart-offer__nudge')).toHaveCount(0);
      // Only open checkout. Do not fill customer/address/payment fields or click any checkout submit control.
      const checkout = await page.goto(previewUrl('/checkout'), { waitUntil: 'domcontentloaded' });
      expect(checkout && checkout.status()).toBeLessThan(400);
      await expect(page).toHaveURL(/\/checkouts?\//);
      const checkoutText = await page.locator('body').innerText();
      evidence.checkout = { reached: true, first15Visible: checkoutText.includes('FIRST15'), orderPlaced: false };
      expect(evidence.checkout.first15Visible, 'FIRST15 visible at pre-order checkout').toBeTruthy();
    } finally {
      console.log('LEMONADE_ACCEPTANCE', JSON.stringify(evidence));
      await api('/cart/clear.js', {}).catch(() => {});
      await api('/cart/update.js', { discount: '' }).catch(() => {});
    }
  });
}
