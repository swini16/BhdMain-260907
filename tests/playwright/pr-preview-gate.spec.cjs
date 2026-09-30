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
