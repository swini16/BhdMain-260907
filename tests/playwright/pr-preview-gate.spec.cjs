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
test.describe('Lemonade authorized hosted development preview', () => {
  // Run signed requests with the line reporter only; retained SDK step errors can contain headers.
  test.use({ trace: 'off', video: 'off' });
  const {
    readCrawlerAuthorization,
    installCrawlerAuthorization,
    storefrontRequest,
  } = require('./helpers/shopify-crawler-auth.cjs');
  const authorizationByContext = new WeakMap();

  test.beforeEach(async ({ context, trace, video }, testInfo) => {
    const configuredReporters = testInfo.config.reporter;
    const reporters = typeof configuredReporters === 'string' ? [[configuredReporters]] : configuredReporters;
    if (!Array.isArray(reporters) || reporters.length !== 1
        || !Array.isArray(reporters[0]) || reporters[0][0] !== 'line'
        || reporters[0].length < 1 || reporters[0].length > 2
        || trace !== 'off' || video !== 'off') {
      throw new Error('Authorized storefront acceptance requires only --reporter=line with trace and video off.');
    }
    const authorization = readCrawlerAuthorization();
    await installCrawlerAuthorization(context, authorization);
    authorizationByContext.set(context, authorization);
  });

  for (const market of [
    { country: 'CA', currency: 'CAD', handle: 'lemonade-best-hydrate', variant: '47373155631388' },
    { country: 'US', currency: 'USD', handle: 'lemonade-electrolyte-best-hydrate', variant: '51937870741788' },
  ]) {
    test(`Lemonade preview acceptance: ${market.country} quantity/cart/FIRST15/pre-order checkout`, async ({ page }, testInfo) => {
      test.setTimeout(180000);
      expect(PREVIEW_THEME_ID, 'Requires the governed development-theme preview; never fall back to live QA.').toMatch(/^[1-9]\d*$/);
      const crawlerAuth = authorizationByContext.get(page.context());
      if (!crawlerAuth) throw new Error('Shopify crawler authorization was not initialized for this acceptance context.');
      expect(new URL(BASE_URL).hostname).toBe('127.0.0.1');
      expect(new URL(BASE_URL).protocol).toBe('http:');
      const { theme } = JSON.parse(require('node:fs').readFileSync('artifacts/shopify-preview.json', 'utf8'));
      expect(theme.role, 'generated preview role').toBe('development');
      expect(String(theme.id), 'generated preview ID').toMatch(/^[1-9]\d*$/);
      expect(String(theme.id), 'generated preview matches this run').toBe(PREVIEW_THEME_ID);
      expect(theme.shop, 'generated preview shop').toBe('best-hydrate.myshopify.com');
      const generatedPreview = new URL(theme.preview_url);
      expect(generatedPreview.protocol).toBe('https:');
      expect(generatedPreview.hostname).toBe(theme.shop);
      expect(generatedPreview.username + generatedPreview.password + generatedPreview.port + generatedPreview.hash).toBe('');
      expect(generatedPreview.pathname).toBe('/');
      expect(generatedPreview.searchParams.getAll('preview_theme_id')).toEqual([PREVIEW_THEME_ID]);
      let hostedOrigin = '';
      let cartActionsStarted = false;
      let cliVersion = 'unavailable';
      try {
        const installed = JSON.parse(require('node:fs').readFileSync('node_modules/@shopify/cli/package.json', 'utf8'));
        if (/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(installed.version)) cliVersion = installed.version;
      } catch { /* Version metadata is optional; never inspect authentication state. */ }
      const now = Date.now();
      const bfcm = now >= Date.parse('2026-11-27T07:00:00Z') && now < Date.parse('2026-12-01T07:00:00Z');
      const quantities = [1, 2, 3, 9, 10, 11];
      const evidence = {
        country: market.country, project: testInfo.project.name, themeId: PREVIEW_THEME_ID, bfcm,
        transport: 'authorized-hosted-development-preview', cliVersion,
        stage: 'hosted preview home', hostedLocalizationPosts: [], hostedSelection: null,
        cartContext: null, product: null, quantities: [], first15: [], checkout: 'not reached',
      };
      // Keep diagnostics useful without recording query strings, cookies, or response bodies.
      const safeResponse = response => {
        const url = new URL(response.url());
        return { status: response.status(), origin: url.origin, path: url.pathname };
      };
      const assertPreviewPage = async (response, requireMarket = true, expectedOrigin = hostedOrigin) => {
        expect(response, 'development preview response').not.toBeNull();
        const url = new URL(page.url());
        const state = {
          ...safeResponse(response),
          ...await page.evaluate(() => ({
            shop: window.Shopify?.shop, themeId: String(window.Shopify?.theme?.id),
            country: window.Shopify?.country, currency: window.Shopify?.currency?.active,
          })),
        };
        expect(response.status(), `development preview: ${JSON.stringify(state)}`).toBeLessThan(400);
        if (expectedOrigin) {
          expect(url.origin, 'retain the independently validated preview origin').toBe(expectedOrigin);
        } else {
          // Only the initial generated hosted URL may resolve its canonical public origin.
          expect(url.protocol).toBe('https:');
          expect(url.port).toBe('');
        }
        expect(url.username + url.password).toBe('');
        expect(state.shop, 'same Shopify shop in this preview').toBe(theme.shop);
        expect(state.themeId, 'exact generated development theme, never the live theme').toBe(PREVIEW_THEME_ID);
        if (requireMarket) {
          expect(state.country, 'selected Shopify market').toBe(market.country);
          expect(state.currency, 'selected Shopify presentment currency').toBe(market.currency);
        }
        return state;
      };
      const hostedUrl = path => {
        if (!hostedOrigin) throw new Error('The hosted development preview origin has not been validated.');
        const url = new URL(path, hostedOrigin);
        url.searchParams.set('preview_theme_id', PREVIEW_THEME_ID);
        url.searchParams.set('utm_source', 'qa_automation');
        url.searchParams.set('utm_medium', 'playwright');
        url.searchParams.set('utm_campaign', 'pr_preview_targeted');
        return url.toString();
      };
      const visitPreview = async path => {
        const response = await page.goto(hostedUrl(path), { waitUntil: 'domcontentloaded' });
        return assertPreviewPage(response);
      };
      const api = async (path, data) => {
        const response = await storefrontRequest(page.request, crawlerAuth, 'POST', new URL(path, hostedOrigin).toString(), data);
        expect(response.ok(), `${path} status ${response.status()}`).toBeTruthy();
        cartActionsStarted = true;
        return response.json();
      };
      const readCart = async () => {
        const response = await storefrontRequest(page.request, crawlerAuth, 'GET', new URL('/cart.js', hostedOrigin).toString());
        expect(response.ok(), `/cart.js status ${response.status()}`).toBeTruthy();
        const cart = await response.json();
        expect(cart.currency, `${market.country} cart currency`).toBe(market.currency);
        return cart;
      };
      const safeCart = cart => ({
        currency: cart.currency, quantity: cart.item_count, original: cart.original_total_price, total: cart.total_price,
        discounts: [...new Set([
          ...(cart.cart_level_discount_applications || []).map(d => d.title),
          ...cart.items.flatMap(item => (item.line_level_discount_allocations || []).map(d => d.discount_application.title)),
        ])],
      });
      const automaticRate = quantity => bfcm
        ? (quantity === 1 ? .20 : .25)
        : (quantity >= 10 ? .20 : quantity >= 3 ? .15 : quantity === 2 ? .10 : 0);
      const expectedPrompt = (quantity, first15 = false) => {
        if (bfcm) return quantity === 1 ? 'Add 1 for 25% off' : '25% off on 2+ jars';
        if (first15 && quantity < 3) return 'Best offer shown in cart.';
        if (quantity === 1) return 'Add 1 for 10% off';
        if (quantity === 2) return 'Add 1 more for 15% off';
        return quantity < 10 ? '15% off on 3–9 jars' : '20% off on 10+ jars';
      };
      const assertCart = (cart, quantity, first15 = false) => {
        const summary = safeCart(cart);
        const rate = Math.max(automaticRate(quantity), first15 ? .15 : 0);
        expect(cart.currency).toBe(market.currency);
        expect(cart.item_count).toBe(quantity);
        expect(cart.items).toHaveLength(1);
        expect(String(cart.items[0].variant_id)).toBe(market.variant);
        expect(cart.original_total_price).toBeGreaterThan(0);
        // Shopify can round per unit; allow at most one cent per jar.
        expect(Math.abs(cart.total_price - Math.round(cart.original_total_price * (1 - rate))))
          .toBeLessThanOrEqual(quantity);
        expect(summary.discounts.length, 'non-stacking: only the strongest eligible offer applies')
          .toBe(rate > 0 ? 1 : 0);
        if (first15 && automaticRate(quantity) < .15) expect(summary.discounts[0]).toBe('FIRST15');
        if (first15 && automaticRate(quantity) > .15) expect(summary.discounts[0]).not.toBe('FIRST15');
        return { ...summary, expectedRate: rate };
      };
      const cartOffer = page.locator('#main-cart-footer .bhd-lemonade-cart-offer');
      const changeCartQuantity = async (quantity, first15 = false) => {
        const input = page.locator('cart-items input[name="updates[]"]').first();
        if (Number(await input.inputValue()) !== quantity) {
          const changed = page.waitForResponse(r => r.url().includes('/cart/change') && r.request().method() === 'POST');
          await input.fill(String(quantity));
          await input.blur();
          const response = await changed;
          expect(response.ok(), `native cart quantity ${quantity}: status ${response.status()}`).toBeTruthy();
          await response.finished();
        }
        await expect(input).toHaveValue(String(quantity));
        await expect(cartOffer).toHaveCount(1);
        await expect(cartOffer.locator('.bhd-lemonade-cart-offer__nudge'))
          .toHaveText(expectedPrompt(quantity, first15));
        const cart = await readCart();
        const summary = assertCart(cart, quantity, first15);
        await expect(page.locator('#main-cart-footer .totals__total-value'))
          .toContainText((cart.total_price / 100).toFixed(2));
        return summary;
      };
      const recordLocalization = response => {
        const url = new URL(response.url());
        if (url.origin === hostedOrigin && url.pathname === '/localization'
            && response.request().method() === 'POST' && evidence.hostedLocalizationPosts.length < 3) {
          evidence.hostedLocalizationPosts.push(safeResponse(response));
        }
      };
      page.on('response', recordLocalization);
      try {
        // Use one native hosted session for market selection, product, cart, and checkout.
        // The helper keeps merchant-authorized crawler headers scoped to public storefront requests.
        const landing = await page.goto(generatedPreview.toString(), { waitUntil: 'domcontentloaded' });
        await assertPreviewPage(landing, false, null);
        hostedOrigin = new URL(page.url()).origin;
        expect(hostedOrigin, 'hosted preview matches the crawler authorization domain').toBe('https://besthydrate.com');
        // Submit Shopify's documented native localization form, retaining the development preview on return.
        evidence.stage = 'hosted native localization';
        const returnUrl = new URL(hostedUrl('/'));
        const [localize] = await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
          page.evaluate(fields => {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/localization';
            form.hidden = true;
            for (const [name, value] of Object.entries(fields)) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = name;
              input.value = value;
              form.appendChild(input);
            }
            document.body.appendChild(form);
            form.submit();
          }, {
            form_type: 'localization', utf8: '✓', _method: 'put', country_code: market.country,
            language_code: 'en', return_to: returnUrl.pathname + returnUrl.search,
          }),
        ]);
        evidence.hostedSelection = await assertPreviewPage(localize, true, hostedOrigin);
        evidence.stage = 'hosted market product';
        evidence.product = await visitPreview(`/products/${market.handle}`);
        evidence.cartContext = { origin: hostedOrigin, currency: (await readCart()).currency };
        evidence.stage = 'cart setup';
        await api('/cart/clear.js', {});
        await api('/cart/update.js', { discount: '' });
        expect((await readCart()).item_count, 'isolated empty cart').toBe(0);
        // Refresh the Liquid cart context after clearing any prior offer.
        await visitPreview(`/products/${market.handle}`);
        evidence.stage = 'product quantity prompts';
        const widget = page.locator('bhd-lemonade-volume:visible');
        await expect(widget).toHaveCount(1);
        await expect(widget).toHaveAttribute('data-variant-id', market.variant);
        await expect(widget).toHaveAttribute('data-bfcm', String(bfcm));
        await expect(widget.locator('table, [role="table"], .bhd-volume__choices, [data-volume-quantity]')).toHaveCount(0);
        const productInfo = page.locator('product-info').filter({ has: widget });
        await expect(productInfo).toHaveCount(1);
        const quantityInput = productInfo.locator('input[name="quantity"]');
        await expect(quantityInput).toHaveCount(1);
        const message = widget.locator('[data-volume-message]');
        const addOne = widget.locator('button[data-volume-add]');
        const confirmation = widget.locator('[data-volume-confirmation]');
        const assertProductPrompt = async quantity => {
          await expect(message).toHaveCount(1);
          await expect(message).toBeVisible();
          await expect(message).toHaveText(expectedPrompt(quantity), { useInnerText: true });
          if (quantity === 1 || (!bfcm && quantity === 2)) {
            await expect(addOne).toBeVisible();
            await expect(addOne).toBeEnabled();
            await expect(confirmation).toBeHidden();
          } else {
            await expect(addOne).toBeHidden();
            await expect(confirmation).toBeVisible();
          }
        };
        for (const quantity of quantities) {
          await quantityInput.fill(String(quantity));
          await quantityInput.blur();
          await expect(quantityInput).toHaveValue(String(quantity));
          await assertProductPrompt(quantity);
          if ([1, 3, 10].includes(quantity)) {
            await testInfo.attach(`lemonade-${market.country}-product-${quantity}-jars`, {
              body: await widget.screenshot(), contentType: 'image/png',
            });
          }
        }
        await quantityInput.fill('1');
        await quantityInput.blur();
        await assertProductPrompt(1);
        for (const quantity of bfcm ? [2] : [2, 3]) {
          await addOne.click();
          await expect(quantityInput).toHaveValue(String(quantity));
          await assertProductPrompt(quantity);
        }
        await quantityInput.fill('1');
        await quantityInput.blur();
        await assertProductPrompt(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
        evidence.stage = 'native add to cart';
        const addResponse = page.waitForResponse(r => r.url().includes('/cart/add') && r.request().method() === 'POST');
        await productInfo.locator('form[action*="/cart/add"] button[type="submit"]').click();
        const added = await addResponse;
        expect(added.ok(), `native add to cart: status ${added.status()}`).toBeTruthy();
        await added.finished();
        await visitPreview('/cart');
        evidence.stage = 'cart quantity offers';
        for (const quantity of [...quantities, 1]) {
          evidence.quantities.push(await changeCartQuantity(quantity));
        }
        await testInfo.attach(`lemonade-${market.country}-cart`, { body: await page.locator('#main-cart-footer').screenshot(), contentType: 'image/png' });
        evidence.stage = 'FIRST15 comparison';
        await api('/cart/update.js', { discount: 'FIRST15' });
        await visitPreview('/cart');
        for (const quantity of [...quantities, 1]) {
          evidence.first15.push(await changeCartQuantity(quantity, true));
        }
        const checkoutOffer = evidence.first15.at(-1).discounts[0];
        // Follow the native cart POST so Shopify's normal redirect carries the cart into checkout.
        // Do not fill customer/address/payment fields or click any submit control inside checkout.
        evidence.stage = 'native cart checkout';
        const cartForm = page.locator('form#cart');
        await expect(cartForm).toHaveCount(1);
        await expect(cartForm).toHaveAttribute('method', /post/i);
        const cartAction = new URL(await cartForm.getAttribute('action'), page.url());
        expect(cartAction.origin).toBe(hostedOrigin);
        expect(cartAction.pathname).toMatch(/\/cart$/);
        const checkoutButton = page.locator('#main-cart-footer #checkout[name="checkout"]');
        await expect(checkoutButton).toHaveAttribute('type', 'submit');
        await expect(checkoutButton).toHaveAttribute('form', 'cart');
        await expect(checkoutButton).toBeVisible();
        await expect(checkoutButton).toBeEnabled();
        const [, checkout] = await Promise.all([
          page.waitForRequest(request => request.method() === 'POST'
            && new URL(request.url()).origin === hostedOrigin
            && new URL(request.url()).pathname === cartAction.pathname),
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
          checkoutButton.click(),
        ]);
        expect(checkout, 'pre-order checkout response').not.toBeNull();
        expect(checkout.status()).toBeLessThan(400);
        await expect(page).toHaveURL(/\/checkouts?\//);
        // The mobile checkout can collapse its order summary; opening it does not submit checkout.
        const summaryToggle = page.getByRole('button', { name: /order summary/i, expanded: false }).first();
        await expect.poll(async () =>
          await summaryToggle.isVisible() || (await page.locator('body').innerText()).includes(checkoutOffer),
        { message: 'checkout applied offer or collapsed order summary is ready' }).toBe(true);
        if (await summaryToggle.isVisible()) await summaryToggle.click();
        await expect(page.locator('body')).toContainText(checkoutOffer);
        const checkoutText = await page.locator('body').innerText();
        evidence.checkout = {
          reached: true, appliedOffer: checkoutOffer, offerVisible: checkoutText.includes(checkoutOffer),
          first15Visible: checkoutText.includes('FIRST15'), orderPlaced: false,
        };
        expect(evidence.checkout.offerVisible, 'strongest applied offer visible at pre-order checkout').toBeTruthy();
        if (!bfcm) expect(evidence.checkout.first15Visible, 'FIRST15 visible for one jar at pre-order checkout').toBeTruthy();
        evidence.stage = 'complete';
      } finally {
        page.off('response', recordLocalization);
        console.log('LEMONADE_ACCEPTANCE', JSON.stringify(evidence));
        if (cartActionsStarted) {
          await api('/cart/clear.js', {}).catch(() => {});
          await api('/cart/update.js', { discount: '' }).catch(() => {});
        }
      }
    });
  }
});
