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

const SUPPORT_PAGES = [
  { name: 'meet-us', path: '/pages/our-story', terse: false },
  { name: 'mission-values', path: '/pages/mission-values', terse: true },
  { name: 'why-best-hydrate', path: '/pages/why-best-hydrate', expectedPath: '/pages/mission-values', terse: true },
  { name: 'jobs-careers', path: '/pages/jobs-careers', terse: true },
  { name: 'partnerships', path: '/pages/partnerships', terse: true },
  { name: 'research-partnerships', path: '/pages/research-partnerships', terse: true },
  { name: 'retail-distribution', path: '/pages/retail-distribution', terse: true },
  { name: 'humanitarian-partnerships', path: '/pages/humanitarian-partnerships', terse: true },
  { name: 'investor-relations', path: '/pages/investor-relations', terse: true },
  { name: 'investor-overview', path: '/pages/investor-overview', terse: true },
  { name: 'active-living', path: '/pages/active-living', terse: true },
  { name: 'everyday-wellness', path: '/pages/everyday-wellness', terse: true },
  { name: 'travel-hydration', path: '/pages/travel-hydration', terse: true },
  { name: 'work-long-shifts', path: '/pages/work-long-shifts', terse: true },
  { name: 'eco-humanitarian', path: '/pages/eco-humanitarian', terse: true },
  { name: 'research-impact', path: '/pages/research-impact', terse: true },
  { name: 'publications', path: '/pages/publications', terse: true },
  { name: 'research-publications', path: '/pages/research-publications', terse: true },
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
  const hasTrustReviews =
    (await page.locator('#trustreviewsCardsFrame').count()) > 0 ||
    (await page.locator('[id^="rich-text-"]').count()) > 0;

  if (hasTrustReviews) {
    // This prefix is not emitted anywhere by our theme; it is generated by the
    // review app at runtime as a separate sibling widget, especially on mobile.
    if (await page.locator('[id^="rich-text-"]').count()) {
      builder = builder.exclude('[id^="rich-text-"]');
    }

    const appSectionIds = await page
      .locator('#trustreviewsCardsFrame, [id^="rich-text-"]')
      .evaluateAll((elements) =>
        [...new Set(
          elements
            .map((element) => element.closest('[id^="shopify-section-"]')?.id || '')
            .filter(Boolean)
        )]
      )
      .catch(() => []);

    if (appSectionIds.length) {
      for (const sectionId of appSectionIds) builder = builder.exclude(`#${sectionId}`);
    } else {
      builder = builder.exclude('#trustreviewsCardsFrame');
    }
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


async function assertVisualLayout(page, label, testInfo) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
      #trustreviewsCardsFrame,
      [id^="rich-text-"],
      [class*="kl-private-reset-css"] {
        visibility: hidden !important;
      }
    `,
  });

  await smoothScrollToBottom(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);

  const audit = await page.evaluate(() => {
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) !== 0 &&
        rect.width > 2 &&
        rect.height > 2
      );
    };

    const describe = (element) => {
      if (!element) return '[missing]';
      if (element.id) return '#' + element.id;
      const classes = [...element.classList].slice(0, 3).join('.');
      return element.tagName.toLowerCase() + (classes ? '.' + classes : '');
    };

    const viewportWidth = document.documentElement.clientWidth;

    const isThirdPartyUi = (element) =>
      Boolean(
        element.closest(
          '#trustreviewsCardsFrame,[id^="rich-text-"],[class*="kl-private-reset-css"]'
        )
      );

    const isInsideHorizontalClip = (element) => {
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        const overflowX = style.overflowX;
        if (
          ['auto', 'scroll', 'hidden', 'clip'].includes(overflowX) &&
          parent.scrollWidth > parent.clientWidth + 3
        ) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };

    const visibleTextLength = (element) => {
      const clone = element.cloneNode(true);
      clone.querySelectorAll?.('.visually-hidden,[aria-hidden="true"],svg').forEach((node) => node.remove());
      return (clone.textContent || '').replace(/\s+/g, ' ').trim().length;
    };

    const horizontalEscape = [...document.querySelectorAll(
      'h1,h2,h3,button,summary,input,select,textarea,.button,[class*="bhd-"] a,.product__info-wrapper a,.product__info-wrapper button'
    )]
      .filter(isVisible)
      .filter((element) => !element.classList.contains('visually-hidden'))
      .filter((element) => !isThirdPartyUi(element))
      .filter((element) => !isInsideHorizontalClip(element))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.left < -3 || rect.right > viewportWidth + 3)
      .slice(0, 12)
      .map(({ element, rect }) => ({
        element: describe(element),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        viewportWidth,
      }));

    const clippedContent = [...document.querySelectorAll(
      'h1,h2,h3,button,summary,.button,.bhd-hero-v4__button,.bhd-phase__proof span,.bhd-product-story__copy'
    )]
      .filter(isVisible)
      .filter((element) => !element.classList.contains('visually-hidden'))
      .filter((element) => !isThirdPartyUi(element))
      .filter((element) => visibleTextLength(element) > 0)
      .filter((element) =>
        element.scrollWidth > element.clientWidth + 4 ||
        element.scrollHeight > element.clientHeight + 8
      )
      .slice(0, 12)
      .map((element) => ({
        element: describe(element),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));

    const pairs = [
      ['.bhd-hero-v4__copy', '.bhd-hero-v4__visual'],
      ['.bhd-product-story__visual', '.bhd-product-story__copy'],
      ['.product__media-wrapper', '.product__info-wrapper'],
    ];

    const overlaps = [];
    for (const [aSelector, bSelector] of pairs) {
      const a = document.querySelector(aSelector);
      const b = document.querySelector(bSelector);
      if (!a || !b || !isVisible(a) || !isVisible(b)) continue;

      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const overlapWidth = Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
      const overlapHeight = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
      if (overlapWidth > 4 && overlapHeight > 4) {
        overlaps.push({
          a: aSelector,
          b: bSelector,
          overlapWidth: Math.round(overlapWidth),
          overlapHeight: Math.round(overlapHeight),
        });
      }
    }

    const oversizedFixed = [...document.querySelectorAll('*')]
      .filter(isVisible)
      .filter((element) => !isThirdPartyUi(element))
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.position === 'fixed' && style.pointerEvents !== 'none';
      })
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.height > innerHeight * 0.38 || rect.width > innerWidth + 4)
      .slice(0, 8)
      .map(({ element, rect }) => ({
        element: describe(element),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
      }));

    return { horizontalEscape, clippedContent, overlaps, oversizedFixed };
  });

  await testInfo.attach(`visual-layout-${label}.json`, {
    body: Buffer.from(JSON.stringify(audit, null, 2)),
    contentType: 'application/json',
  });

  await page.screenshot({
    path: testInfo.outputPath(`visual-${label}-${testInfo.project.name}.jpg`),
    type: 'jpeg',
    quality: 68,
    fullPage: true,
    animations: 'disabled',
  });

  expect(audit.horizontalEscape, `${label}: no critical content should escape horizontally`).toEqual([]);
  expect(audit.clippedContent, `${label}: critical text/controls should not be clipped`).toEqual([]);
  expect(audit.overlaps, `${label}: critical layout regions should not overlap`).toEqual([]);
  expect(audit.oversizedFixed, `${label}: fixed UI should not obscure the storefront`).toEqual([]);
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
  test(`${target.name} page passes robotic rendering and runtime checks`, async ({ page }, testInfo) => {
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
    await assertVisualLayout(page, target.name, testInfo);

    const productCta = page.locator('a[href*="/products/"]:visible').first();
    await expect(productCta, `${target.name}: visible product CTA/link`).toBeVisible();

    expect(firstPartyFailures, `${target.name}: first-party network failures`).toEqual([]);
    expect(pageErrors, `${target.name}: uncaught JavaScript errors`).toEqual([]);
  });
}

test('support-page matrix stays healthy, terse and routed', async ({ page }) => {
  test.setTimeout(240000);

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

  for (const target of SUPPORT_PAGES) {
    firstPartyFailures.length = 0;
    pageErrors.length = 0;

    const response = await page.goto(withQa(target.path), { waitUntil: 'domcontentloaded' });
    const expectedPath = target.expectedPath || target.path;
    expect(new URL(page.url()).pathname, `${target.name}: unexpected redirect`).toBe(expectedPath);

    await assertPageHealth(page, response, target.name);

    const h1 = page.locator('h1:visible').first();
    await expect(h1, `${target.name}: visible H1`).toBeVisible();
    await expect(h1, `${target.name}: non-empty H1`).not.toHaveText(/^\s*$/);

    const nextAction = page.locator('.bhd-page__brand-actions a:visible').first();
    await expect(nextAction, `${target.name}: visible next-step CTA`).toBeVisible();

    if (target.terse) {
      await expect(
        page.locator('.bhd-page__keypoints:visible'),
        `${target.name}: terse key-points foundation`
      ).toBeVisible();

      expect(
        await page.locator('.bhd-enrichment').count(),
        `${target.name}: generic enrichment must stay suppressed`
      ).toBe(0);
    }

    expect(firstPartyFailures, `${target.name}: first-party network failures`).toEqual([]);
    expect(pageErrors, `${target.name}: uncaught JavaScript errors`).toEqual([]);
  }
});

test('Lemonade product page passes robotic validation', async ({ page }, testInfo) => {
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
  await assertVisualLayout(page, 'product', testInfo);

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
