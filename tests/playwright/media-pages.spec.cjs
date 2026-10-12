const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const origin = process.env.BASE_URL || 'https://besthydrate.com';
const publicCheck = process.env.MEDIA_PUBLIC_CHECK === '1';
const fixtures = process.env.MEDIA_PREVIEW_FIXTURES === '1';
const themeId = process.env.PREVIEW_THEME_ID || (publicCheck ? process.env.EXPECTED_LIVE_THEME_ID : '');
const routes = ['/', '/pages/folio-hydration-feature', '/pages/cbc-edmonton-am', '/pages/press'];
const sourceFiles = ['sections/bhd-publication-ribbon.liquid', 'snippets/bhd-page-breadcrumbs.liquid', 'snippets/bhd-page-dispatch.liquid', 'snippets/bhd-page-media-alliance.liquid', 'snippets/bhd-page-press.liquid', 'sections/main-page.liquid', 'snippets/bhd-page-header.liquid', 'templates/page.json', 'templates/index.json', 'layout/theme.liquid'];
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const urlFor = (route) => {
  const kind = route.endsWith('folio-hydration-feature') ? 'folio' : route.endsWith('cbc-edmonton-am') ? 'cbc' : '';
  const url = new URL(fixtures && kind ? `/pages/press?view=qa-media-${kind}` : route, origin);
  if (!publicCheck) url.searchParams.set('preview_theme_id', themeId);
  url.searchParams.set('utm_source', 'qa_automation');
  url.searchParams.set('utm_medium', 'playwright');
  url.searchParams.set('utm_campaign', 'ehp_media_review');
  return url.href;
};

test.use({ launchOptions: { chromiumSandbox: true } });
test.describe('Proposed media pages', () => {
  test.skip(!themeId, 'Requires an isolated Shopify development theme; never substitutes live storefront.');
  for (const route of routes) {
    test(`media review ${route}`, async ({ page, context }, info) => {
      const slug = route === '/' ? 'home' : route.split('/').pop();
      const dir = path.join('artifacts/media-review', info.project.name, slug);
      fs.mkdirSync(dir, { recursive: true });
      const networkErrors = [];
      const jsErrors = [];
      const assets = [];
      const pending = [];
      page.on('pageerror', error => jsErrors.push(error.message));
      await context.route('**/*', r => {
        const request = r.request();
        if (!/google-analytics|googletagmanager|amplitude|facebook\.com\/tr|analytics\.tiktok|klaviyo|monorail|analytics\.shopify/.test(request.url())) return r.continue();
        const script = request.resourceType() === 'script' || /\.js(?:[?#]|$)/.test(request.url());
        return r.fulfill(script ? { status: 200, contentType: 'application/javascript', body: '' } : { status: 204, body: '' });
      });
      page.on('response', response => {
        const request = response.request();
        const url = response.url();
        const type = request.resourceType();
        if (['image', 'stylesheet', 'font', 'document', 'script'].includes(type) && (new URL(url).origin === new URL(origin).origin || new URL(url).hostname === 'cdn.shopify.com')) {
          if (response.status() >= 400) networkErrors.push(`${response.status()} ${url}`);
          if (['image', 'stylesheet', 'font'].includes(type) && response.ok()) {
            pending.push(response.body().then(bytes => assets.push({ url, type, sha256: sha(bytes), bytes: bytes.length })).catch(error => assets.push({ url, error: error.message })));
          }
        }
      });
      const response = await page.goto(urlFor(route), { waitUntil: 'domcontentloaded' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].filter(img => img.loading !== 'lazy').map(img => img.decode().catch(() => {})));
      });
      // Capture the actual Shopify response even when an unpublished route returns 404.
      const shot = await page.screenshot({ path: path.join(dir, 'page.png'), fullPage: true });
      const html = await page.content();
      fs.writeFileSync(path.join(dir, 'rendered.html'), html);
      await Promise.all(pending);
      const manifest = {
        capturedAt: new Date().toISOString(), mode: fixtures ? "isolated-context-fixture" : publicCheck ? "public-route" : "preview-route", route, finalUrl: page.url(), status: response?.status(),
        themeId, commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        viewport: page.viewportSize(), screenshotSha256: sha(shot), renderedHtmlSha256: sha(html),
        source: Object.fromEntries(sourceFiles.map(file => [file, sha(fs.readFileSync(file))])), assets, networkErrors, jsErrors,
      };
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      expect(response?.status(), 'Selected fixture or real public route must return success').toBeLessThan(400);
      expect(await page.evaluate(() => String(window.Shopify?.theme?.id || '')), 'Renderer must serve the proposed development theme').toBe(String(themeId));
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
      if (route === '/') {
        const ribbon = page.locator('.bhd-publication-ribbon');
        await expect(ribbon).toBeVisible();
        await expect(ribbon.getByRole('link', { name: 'U of Alberta’s Folio', exact: true })).toHaveAttribute('href', '/pages/folio-hydration-feature');
        await expect(ribbon.getByRole('link', { name: 'Listen to our CBC interview', exact: true })).toHaveAttribute('href', 'https://www.cbc.ca/listen/live-radio/1-17-edmonton-am/clip/16242570-a-sports-drink-help-crohns-disease');
        await expect(ribbon).not.toContainText('Coming to CBC');
        await ribbon.screenshot({ path: path.join(dir, 'banner.png') });
      } else if (route === '/pages/press') {
        const cards = page.locator('.bhd-page__cards-section').filter({ has: page.getByRole('heading', { name: 'Best Hydrate in the news', exact: true }) });
        await expect(cards.locator('a[href="/pages/folio-hydration-feature"]')).toBeVisible();
        await expect(cards.locator('a[href="/pages/cbc-edmonton-am"]')).toBeVisible();
      } else {
        const cbc = route.endsWith('cbc-edmonton-am');
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(cbc ? 'Best Hydrate and CBC Edmonton AM' : 'Best Hydrate in U of Alberta’s Folio');
        const crumbs = page.locator('.bhd-breadcrumbs');
        await expect(crumbs.locator('a[href="/pages/press"]')).toBeVisible();
        await expect(crumbs).toContainText(cbc ? 'CBC Edmonton AM' : 'U of Alberta’s Folio');
        await expect(page.getByRole('heading', { name: 'Hydrate for YOUR Best Day!', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Help shape what comes next.', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Buy Now', exact: true })).toHaveAttribute('href', /\/products\/lemonade-(?:electrolyte-)?best-hydrate/);
        await expect(page.getByRole('link', { name: 'Explore Partnerships', exact: true })).toHaveAttribute('href', '/pages/partnerships');
        const hero = page.locator('.bhd-page-hero__media img');
        await expect(hero).toHaveAttribute('alt', 'Best Hydrate Lemonade electrolyte powder jar');
        expect(await hero.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
        if (cbc) {
          await expect(page.getByRole('link', { name: 'Listen to our CBC interview', exact: true })).toHaveAttribute('href', 'https://www.cbc.ca/listen/live-radio/1-17-edmonton-am/clip/16242570-a-sports-drink-help-crohns-disease');
          await expect(page.locator('.bhd-page')).not.toContainText(/scheduled to join|Scheduled for Monday|An interview replay has not yet been verified|not an interview replay/);
        }
        if (!cbc) {
          await expect(page.getByRole('heading', { name: 'U of A researcher lends expertise to boost the science of oral hydration', exact: true })).toBeVisible();
          await expect(page.locator('.bhd-page q')).toHaveText('Our goal is to bring more science to this topic');
          await expect(page.locator('.bhd-page')).toContainText('Dr. Spencer Proctor, quoted in U of Alberta’s Folio, October 8, 2026.');
        }
        // Exercise breadcrumb navigation inside the same development preview.
        await crumbs.locator('a[href="/pages/press"]').click();
        await expect(page.getByRole('heading', { name: 'Best Hydrate in the news', exact: true })).toBeVisible();
        await expect(page.locator(`.bhd-page__cards-section a[href="${route}"]`)).toBeVisible();
      }
      expect(networkErrors).toEqual([]);
      expect(jsErrors).toEqual([]);
    });
  }
});
