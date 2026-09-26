const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const BASE_URL = process.env.BASE_URL || 'https://besthydrate.com';
const QA_QUERY = 'utm_source=qa_automation&utm_medium=playwright&utm_campaign=robotic_validation';

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

const KEY_PAGES = [
  { name: 'home', path: '/' },
  { name: 'prep', path: '/pages/prep' },
  { name: 'perform', path: '/pages/perform' },
  { name: 'recover', path: '/pages/recover' },
];

const PRODUCT_PATHS = [
  process.env.PRODUCT_PATH || '/products/lemonade-best-hydrate',
  process.env.PRODUCT_PATH_FALLBACK || '/products/lemonade-electrolyte-best-hydrate',
];

function isAnalyticsUrl(url) {
  return ANALYTICS_ENDPOINTS.some((endpoint) => url.includes(endpoint));
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
    const pathname = new URL(url).pathname;
    return (
      pathname === '/api/collect' ||
      pathname === '/api/event/collect' ||
      pathname === '/shopify_pay/accelerated_checkout'
    );
  } catch {
    return false;
  }
}

function isIgnorableQaPageError(message) {
  return (
    message.includes('analytics.tiktok.com') ||
    message.includes('Error completing request. A network failure may have prevented the request from completing')
  );
}

function withQa(path) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${QA_QUERY}`;
}

async function smoothScrollToBottom(page) {
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const step = Math.max(500, Math.floor(window.innerHeight * 0.8));

    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await delay(60);
    }

    window.scrollTo(0, document.documentElement.scrollHeight);
    await delay(150);
  });
}

async function openAvailableProduct(page) {
  for (const path of [...new Set(PRODUCT_PATHS.filter(Boolean))]) {
    const response = await page.goto(withQa(path), { waitUntil: 'domcontentloaded' });

    if (
      response &&
      response.status() < 400 &&
      (await page
        .getByRole('heading', { level: 1, name: /Lemonade Electrolyte Powder/i })
        .isVisible({ timeout: 2500 })
        .catch(() => false))
    ) {
      return path;
    }
  }

  throw new Error(`No live Lemonade product route found. Tried: ${PRODUCT_PATHS.join(', ')}`);
}

async function assertAccessibility(page, label) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);

  // TrustReviews injects third-party markup outside theme control. Exclude only
  // its containing Shopify section, wherever the app renders, while leaving the
  // rest of the page fully blocking on serious/critical accessibility defects.
  const trustReviewsSectionId = await page
    .locator('#trustreviewsCardsFrame')
    .evaluate((element) => element.closest('[id^="shopify-section-"]')?.id || '')
    .catch(() => '');

  if (trustReviewsSectionId) {
    builder = builder.exclude(`#${trustReviewsSectionId}`);
  } else if (await page.locator('#trustreviewsCardsFrame').count()) {
    builder = builder.exclude('#trustreviewsCardsFrame');
  }

  const scan = await builder.analyze();

  const serious = scan.violations
    .filter((violation) => ['serious', 'critical'].includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.slice(0, 4).map((node) => node.target.join(' > ')),
    }));

  expect(serious, `${label}: serious/critical accessibility violations`).toEqual([]);
}

async function assertPageHealth(page, response, label) {
  expect(response, `${label}: navigation returned no response`).not.toBeNull();
  expect(response.status(), `${label}: document HTTP status`).toBeLessThan(400);

  const title = (await page.title()).trim();
  expect(title.length, `${label}: page title should not be empty`).toBeGreaterThan(0);

  await smoothScrollToBottom(page);

  const brokenImages = await page.locator('img').evaluateAll((images) =>
    images
      .filter((img) => {
        const style = window.getComputedStyle(img);
        const rect = img.getBoundingClientRect();
        const rendered =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity || 1) !== 0 &&
          rect.width > 1 &&
          rect.height > 1;

        return rendered && img.complete && img.naturalWidth === 0;
      })
      .map((img) => img.currentSrc || img.src || img.getAttribute('src') || '[unknown image]')
      .slice(0, 12)
  );

  expect(brokenImages, `${label}: rendered images must load`).toEqual([]);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(
    overflow.scrollWidth - overflow.clientWidth,
    `${label}: page must not horizontally overflow the viewport (${overflow.scrollWidth}px vs ${overflow.clientWidth}px)`
  ).toBeLessThanOrEqual(4);
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();

  // Block analytics so robotic validation never looks like customer behavior.
  await context.route('**/*', async (route) => {
    if (isAnalyticsUrl(route.request().url())) {
      await route.abort();
      return;
    }
    await route.continue();
  });
});

for (const target of KEY_PAGES) {
  test(`${target.name} page passes robotic rendering and runtime checks`, async ({ page }) => {
    const firstPartyFailures = [];
    const pageErrors = [];

    page.on('pageerror', (error) => {
      if (!isIgnorableQaPageError(error.message)) pageErrors.push(error.message);
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
      if (!isAnalyticsUrl(url) && !isIgnorableShopifyAbort(url) && isFirstParty(url)) {
        firstPartyFailures.push(
          `FAILED ${request.resourceType()} ${url} :: ${request.failure()?.errorText || 'unknown'}`
        );
      }
    });

    const response = await page.goto(withQa(target.path), { waitUntil: 'domcontentloaded' });

    const expectedPath = target.path === '/' ? '/' : target.path;
    expect(new URL(page.url()).pathname, `${target.name}: unexpected redirect`).toBe(expectedPath);

    await assertPageHealth(page, response, target.name);
    await assertAccessibility(page, target.name);

    const productCta = page.locator('a[href*="/products/"]:visible').first();
    await expect(productCta, `${target.name}: visible product CTA/link`).toBeVisible();

    expect(firstPartyFailures, `${target.name}: first-party network failures`).toEqual([]);
    expect(pageErrors, `${target.name}: uncaught JavaScript errors`).toEqual([]);
  });
}

test('Lemonade product page passes robotic validation', async ({ page }) => {
  const firstPartyFailures = [];
  const pageErrors = [];

  page.on('pageerror', (error) => {
      if (!isIgnorableQaPageError(error.message)) pageErrors.push(error.message);
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
    if (!isAnalyticsUrl(url) && !isIgnorableShopifyAbort(url) && isFirstParty(url)) {
      firstPartyFailures.push(
        `FAILED ${request.resourceType()} ${url} :: ${request.failure()?.errorText || 'unknown'}`
      );
    }
  });

  const productPath = await openAvailableProduct(page);
  const response = await page.goto(withQa(productPath), { waitUntil: 'domcontentloaded' });

  await assertPageHealth(page, response, 'product');
  await assertAccessibility(page, 'product');

  const addToCart = page.locator('form[action*="/cart/add"] button[name="add"]:visible').first();
  await expect(addToCart, 'product: Add to Cart must be visible').toBeVisible();
  await expect(addToCart, 'product: Add to Cart must be enabled').toBeEnabled();

  expect(firstPartyFailures, 'product: first-party network failures').toEqual([]);
  expect(pageErrors, 'product: uncaught JavaScript errors').toEqual([]);
});

test('critical internal links from key pages do not return 4xx/5xx', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Link crawl only needs one browser project.');

  const discovered = new Set();

  for (const target of KEY_PAGES) {
    await page.goto(withQa(target.path), { waitUntil: 'domcontentloaded' });

    const links = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors
        .map((a) => a.getAttribute('href'))
        .filter(Boolean)
        .filter((href) => href.startsWith('/'))
    );

    for (const href of links) {
      const clean = href.split('#')[0];
      if (
        clean &&
        !clean.startsWith('/cart') &&
        !clean.startsWith('/checkout') &&
        !clean.startsWith('/account') &&
        !clean.startsWith('/challenge')
      ) {
        discovered.add(clean);
      }
    }
  }

  const failures = [];

  for (const href of [...discovered].slice(0, 80)) {
    const response = await request.get(new URL(href, BASE_URL).toString(), {
      failOnStatusCode: false,
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'BestHydrate-QA-Playwright/1.0',
      },
    });

    if (response.status() >= 400) {
      failures.push(`${response.status()} ${href}`);
    }
  }

  expect(discovered.size, 'critical link crawl should discover internal links').toBeGreaterThan(0);
  expect(failures, 'critical internal links returning HTTP errors').toEqual([]);
});
