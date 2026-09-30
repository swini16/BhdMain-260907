const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://besthydrate.com';

test.describe('TrustReviews live plugin integrity', () => {
  test('long review text is not clipped on desktop or mobile', async ({ page }, testInfo) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const host = page.locator('#trustreviewsCardsFrame');
    await expect(host).toBeVisible({ timeout: 20000 });

    const frame = page.frames().find(
      (candidate) => candidate !== page.mainFrame() && /reviews\.trustapps\.co\/_carousel\//i.test(candidate.url())
    );
    expect(frame, 'TrustReviews carousel frame should exist').toBeTruthy();

    const texts = await frame.locator('p.line-clamp-5').evaluateAll((nodes) =>
      nodes.map((el) => {
        const style = getComputedStyle(el);
        return {
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          overflowY: style.overflowY,
          overflowX: style.overflowX,
          height: style.height,
          maxHeight: style.maxHeight,
          lineClamp: style.webkitLineClamp,
          display: style.display,
        };
      })
    );

    expect(texts.length, 'TrustReviews should expose review text cards').toBeGreaterThan(0);

    const clipped = texts.filter(
      (x) => x.scrollHeight > x.clientHeight + 2 || x.scrollWidth > x.clientWidth + 2
    );
    console.log('TRUSTREVIEWS_TEXT_METRICS', JSON.stringify({
      project: testInfo.project.name,
      clipped,
      sample: texts.slice(0, 5),
    }));
    expect(clipped, 'No TrustReviews review text may be vertically or horizontally clipped').toEqual([]);

    const bodyMetrics = await frame.locator('body').evaluate((body) => ({
      clientHeight: body.clientHeight,
      scrollHeight: body.scrollHeight,
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
    }));
    const hostBox = await host.boundingBox();

    console.log('TRUSTREVIEWS_FRAME_METRICS', JSON.stringify({
      project: testInfo.project.name,
      hostBox,
      bodyMetrics,
    }));

    expect(hostBox.height + 2, 'Outer iframe must be at least as tall as rendered widget body').toBeGreaterThanOrEqual(bodyMetrics.scrollHeight);
    expect(hostBox.width + 2, 'Outer iframe must be at least as wide as widget viewport').toBeGreaterThanOrEqual(bodyMetrics.clientWidth);
  });
});


test('TrustReviews full review widget route is readable', async ({ page }, testInfo) => {
  const url = 'https://reviews.trustapps.co/_w/938e7cb7-8c69-47b7-976e-3082273b3445/8904882422044?lang=&orderBy=popular&shopCustomer=';
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  expect(response && response.status(), 'Full TrustReviews widget route must load').toBeLessThan(400);
  await page.waitForTimeout(3500);

  const report = await page.evaluate(() => {
    const visible = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 1 && r.height > 1;
    };

    const clipped = [...document.querySelectorAll('body *')]
      .filter(visible)
      .map((el) => {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        const s = getComputedStyle(el);
        return {
          tag: el.tagName,
          cls: typeof el.className === 'string' ? el.className : '',
          text: text.slice(0, 180),
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          overflowY: s.overflowY,
          overflowX: s.overflowX,
        };
      })
      .filter((x) =>
        x.text.length > 40 &&
        (
          (x.scrollHeight > x.clientHeight + 3 && ['hidden','clip'].includes(x.overflowY)) ||
          (x.scrollWidth > x.clientWidth + 3 && ['hidden','clip'].includes(x.overflowX))
        )
      )
      .slice(0, 30);

    const body = document.body;
    return {
      bodyText: (body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 5000),
      clientWidth: body.clientWidth,
      scrollWidth: body.scrollWidth,
      clientHeight: body.clientHeight,
      scrollHeight: body.scrollHeight,
      clipped,
    };
  });

  console.log('TRUSTREVIEWS_FULL_WIDGET_AUDIT', JSON.stringify({
    project: testInfo.project.name,
    report,
  }));

  expect(report.scrollWidth, 'Full widget must not horizontally overflow its viewport').toBeLessThanOrEqual(report.clientWidth + 2);
  expect(report.bodyText, 'Full widget should include Best Hydrate review content').toMatch(/Best Hydrate|electrolytes|hydrate/i);
  expect(report.clipped, 'Full widget should not hide readable review text').toEqual([]);
});
