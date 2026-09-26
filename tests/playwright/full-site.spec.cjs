const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe.configure({ retries: 0 });

const BASE_URL = process.env.BASE_URL || 'https://besthydrate.com';
const PREVIEW_THEME_ID = process.env.PREVIEW_THEME_ID || '';
const BASELINE_PREVIEW_THEME_ID = process.env.BASELINE_PREVIEW_THEME_ID || '';
const QA_QUERY = 'utm_source=qa_automation&utm_medium=playwright&utm_campaign=full_site';

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
  'web-pixels@',
];

const CORE_EXTRA_PATHS = [
  '/',
  '/pages/prep',
  '/pages/perform',
  '/pages/recover',
  '/cart',
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
    message.includes('Error completing request. A network failure may have prevented the request from completing') ||
    (
      PREVIEW_THEME_ID &&
      process.env.IGNORE_PREVIEW_BASELINE_JS === '1' &&
      message.includes('ON_CHANGE_DEBOUNCE_TIMER is not defined')
    )
  );
}

function withQa(path, { themeId = PREVIEW_THEME_ID } = {}) {
  const url = new URL(path, BASE_URL);
  const qa = new URLSearchParams(QA_QUERY);
  for (const [key, value] of qa) url.searchParams.set(key, value);
  if (themeId) url.searchParams.set('preview_theme_id', themeId);
  return url.toString();
}

function decodeXml(text) {
  return text
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function sitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeXml(match[1].trim()));
}

async function discoverPublicPaths(request) {
  const sitemapQueue = [new URL('/sitemap.xml', BASE_URL).toString()];
  const seenSitemaps = new Set();
  const publicPaths = new Set();

  while (sitemapQueue.length) {
    const sitemapUrl = sitemapQueue.shift();
    if (!sitemapUrl || seenSitemaps.has(sitemapUrl)) continue;
    seenSitemaps.add(sitemapUrl);

    const response = await request.get(sitemapUrl, {
      failOnStatusCode: false,
      timeout: 20000,
      headers: { 'User-Agent': 'BestHydrate-QA-Playwright/1.0' },
    });

    expect(response.status(), `sitemap must load: ${sitemapUrl}`).toBeLessThan(400);
    const xml = await response.text();

    for (const loc of sitemapLocs(xml)) {
      let url;
      try {
        url = new URL(loc, BASE_URL);
      } catch {
        continue;
      }

      if (url.pathname.endsWith('.xml') || /sitemap/i.test(url.pathname)) {
        if (seenSitemaps.size < 30) sitemapQueue.push(url.toString());
        continue;
      }

      const normalized = url.pathname.replace(/\/+$/, '') || '/';
      if (
        !normalized.startsWith('/account') &&
        !normalized.startsWith('/challenge') &&
        !normalized.startsWith('/checkouts')
      ) {
        publicPaths.add(normalized);
      }
    }
  }

  for (const path of CORE_EXTRA_PATHS) publicPaths.add(path);
  return [...publicPaths].sort();
}

async function scrollForLazyAssets(page) {
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const max = document.documentElement.scrollHeight;
    const step = Math.max(700, Math.floor(window.innerHeight * 0.9));
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await wait(35);
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(80);
}

async function auditPage(browser, path, { themeId = PREVIEW_THEME_ID } = {}) {
  const context = await browser.newContext();

  const page = await context.newPage();
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

  try {
    let response = null;
    const transientStatuses = new Set([429, 500, 502, 503, 504]);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      firstPartyFailures.length = 0;
      pageErrors.length = 0;

      response = await page.goto(withQa(path, { themeId }), {
        waitUntil: 'load',
        timeout: 30000,
      });

      await page.evaluate(async () => {
        if (document.fonts?.ready) await document.fonts.ready;
      }).catch(() => {});
      await page.waitForTimeout(180);

      if (!transientStatuses.has(response?.status() || 0)) break;
      await page.waitForTimeout(attempt * 750);
    }

    let finalPath = new URL(page.url()).pathname;

    // Shopify Markets can serve the wrong-market product handle as a 404 and
    // then our theme immediately routes to the product published in this market.
    // Audit the resolved product destination cleanly so the intentional redirect
    // doesn't leave false 404/ERR_ABORTED evidence behind.
    const marketProductPaths = new Set([
      '/products/lemonade-best-hydrate',
      '/products/lemonade-electrolyte-best-hydrate',
    ]);
    if (
      marketProductPaths.has(path) &&
      marketProductPaths.has(finalPath) &&
      finalPath !== path
    ) {
      firstPartyFailures.length = 0;
      pageErrors.length = 0;
      response = await page.goto(withQa(finalPath, { themeId }), {
        waitUntil: 'load',
        timeout: 30000,
      });

      await page.evaluate(async () => {
        if (document.fonts?.ready) await document.fonts.ready;
      }).catch(() => {});
      await page.waitForTimeout(180);
      finalPath = new URL(page.url()).pathname;
    }

    const status = response?.status() || 0;
    const title = (await page.title()).trim();

    await scrollForLazyAssets(page);

    const brokenImages = await page.locator('img').evaluateAll((images) =>
      images
        .filter((img) => {
          const style = getComputedStyle(img);
          const rect = img.getBoundingClientRect();
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity || 1) !== 0 &&
            rect.width > 1 &&
            rect.height > 1 &&
            img.complete &&
            img.naturalWidth === 0
          );
        })
        .map((img) => img.currentSrc || img.src || img.getAttribute('src') || '[unknown image]')
        .slice(0, 8)
    );

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    let axe = new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('iframe');

    for (const selector of [
      '#PBarNextFrame',
      '#shopify-pc__banner',
      '#trustreviewsCardsFrame',
      '[class*="kl-private-reset-css"]',
    ]) {
      if (await page.locator(selector).count()) axe = axe.exclude(selector);
    }

    const a11y = (await axe.analyze()).violations
      .filter((violation) => ['serious', 'critical'].includes(violation.impact))
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodeCount: violation.nodes.length,
        nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(' > ')),
      }));

    return {
      path,
      finalPath,
      status,
      title,
      firstPartyFailures,
      pageErrors,
      brokenImages,
      horizontalOverflow: Math.max(0, overflow.scrollWidth - overflow.clientWidth),
      a11y,
    };
  } catch (error) {
    return {
      path,
      status: 0,
      title: '',
      fatal: error.message,
      firstPartyFailures,
      pageErrors,
      brokenImages: [],
      horizontalOverflow: 0,
      a11y: [],
    };
  } finally {
    await context.close();
  }
}


function normalizeUrlish(value) {
  return String(value || '')
    .replace(/([?&])preview_theme_id=[^&\s]+/g, '$1')
    .replace(/[?&]$/, '')
    .replace('https://best-hydrate.myshopify.com', 'https://besthydrate.com');
}

function defectSet(result) {
  const set = new Set();

  if (result.fatal) set.add(`fatal:${result.fatal}`);
  if (result.status >= 400 || result.status === 0) set.add(`status:${result.status}`);
  if (!result.title) set.add('title:empty');

  for (const item of result.firstPartyFailures || []) {
    set.add(`network:${normalizeUrlish(item)}`);
  }

  for (const item of result.pageErrors || []) {
    set.add(`js:${item}`);
  }

  for (const item of result.brokenImages || []) {
    set.add(`image:${normalizeUrlish(item)}`);
  }

  if ((result.horizontalOverflow || 0) > 4) {
    set.add(`overflow:${result.horizontalOverflow}`);
  }

  return set;
}

function a11yCountMap(result) {
  const counts = new Map();
  for (const violation of result.a11y || []) {
    const key = `${violation.id}:${violation.impact}`;
    const count = Number(violation.nodeCount || violation.nodes?.length || 1);
    counts.set(key, (counts.get(key) || 0) + count);
  }
  return counts;
}

function compareAgainstBaseline(preview, baseline) {
  const previewDefects = defectSet(preview);
  const baselineDefects = defectSet(baseline);
  const regressions = [];

  for (const defect of previewDefects) {
    if (defect.startsWith('overflow:')) continue;
    if (!baselineDefects.has(defect)) regressions.push(defect);
  }

  // Axe selectors can drift between otherwise identical rendered themes due to
  // dynamic Shopify/app markup. Compare accessibility severity/rule node counts
  // instead of exact CSS selectors. Deep key-page tests remain selector-exact.
  const previewA11y = a11yCountMap(preview);
  const baselineA11y = a11yCountMap(baseline);
  for (const [key, count] of previewA11y) {
    const baselineCount = baselineA11y.get(key) || 0;
    if (count > baselineCount) {
      regressions.push(`a11y:${key}:nodes:${count} (baseline ${baselineCount})`);
    }
  }

  const previewOverflow = preview.horizontalOverflow || 0;
  const baselineOverflow = baseline.horizontalOverflow || 0;
  if (previewOverflow > Math.max(4, baselineOverflow + 4)) {
    regressions.push(`overflow:${previewOverflow} (baseline ${baselineOverflow})`);
  }

  return {
    path: preview.path,
    preview,
    baseline,
    regressions,
    baselineOnly: [...baselineDefects],
  };
}

test('full public storefront passes robotic QA', async ({ browser, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Full-site crawl runs once per PR.');
  test.setTimeout(15 * 60 * 1000);

  const paths = await discoverPublicPaths(request);
  expect(paths.length, 'sitemap should expose public storefront routes').toBeGreaterThan(0);

  const results = [];
  const concurrency = Math.max(1, Math.min(6, Number(process.env.FULL_SITE_CONCURRENCY || 6)));
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= paths.length) return;
      results[index] = await auditPage(browser, paths[index]);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const previewFailures = results.filter((result) =>
    result.fatal ||
    result.status >= 400 ||
    result.status === 0 ||
    !result.title ||
    result.firstPartyFailures.length ||
    result.pageErrors.length ||
    result.brokenImages.length ||
    result.horizontalOverflow > 4 ||
    result.a11y.length
  );

  // Regression-aware PR gate:
  // re-audit only failing proposed-preview pages against a rendered preview
  // of the PR base commit, then block only defects that are new or worse.
  const comparisons = [];
  if (PREVIEW_THEME_ID && BASELINE_PREVIEW_THEME_ID && previewFailures.length) {
    let baselineCursor = 0;
    const baselineWorkers = Math.max(1, Math.min(6, Number(process.env.FULL_SITE_BASELINE_CONCURRENCY || 8)));

    async function baselineWorker() {
      while (true) {
        const index = baselineCursor++;
        if (index >= previewFailures.length) return;
        const preview = previewFailures[index];
        const baseline = await auditPage(browser, preview.path, { themeId: BASELINE_PREVIEW_THEME_ID });
        comparisons[index] = compareAgainstBaseline(preview, baseline);
      }
    }

    await Promise.all(Array.from({ length: baselineWorkers }, () => baselineWorker()));
  }

  const regressions = PREVIEW_THEME_ID && BASELINE_PREVIEW_THEME_ID
    ? comparisons.filter((item) => item.regressions.length)
    : [];

  // On the live storefront this test is a baseline inventory, not a hard
  // full-site blocker. Critical live smoke/commerce checks remain blocking.
  // PR previews are the hard regression gate.
  const knownBaselinePages = PREVIEW_THEME_ID && BASELINE_PREVIEW_THEME_ID
    ? comparisons.filter((item) => !item.regressions.length).map((item) => item.path)
    : previewFailures.map((item) => item.path);

  const summary = {
    discoveredPages: paths.length,
    previewPassingPages: results.length - previewFailures.length,
    previewFailingPages: previewFailures.length,
    regressionPages: regressions.length,
    knownBaselinePages: knownBaselinePages.length,
    mode: PREVIEW_THEME_ID ? 'preview-regression-gate' : 'live-baseline-inventory',
    regressions,
    knownBaselinePaths: knownBaselinePages,
  };

  await testInfo.attach('full-site-qa.json', {
    body: Buffer.from(JSON.stringify(summary, null, 2)),
    contentType: 'application/json',
  });

  console.log(
    `Full-site QA: ${paths.length} routes, ${previewFailures.length} preview defects, ` +
    `${knownBaselinePages.length} known-baseline pages, ${regressions.length} regression pages.`
  );

  expect(regressions, `new/worsened full-site regressions across ${paths.length} public routes`).toEqual([]);
});
