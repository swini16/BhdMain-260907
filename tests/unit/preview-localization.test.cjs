const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  localizePreview, preparePreviewMarket, previewTarget, safeUrl, visitPreview,
} = require('../playwright/helpers/preview-localization.cjs');

const BASE_URL = 'http://127.0.0.1:9292';
const THEME_ID = '123456789';
const OPTIONS = { baseURL: BASE_URL, themeId: THEME_ID, country: 'CA', currency: 'CAD' };

// Every HTTP/browser surface below is an in-memory fixture. No Playwright,
// browser, provider, cookie jar, or network connection is created by this suite.
function makeResponse(spec, requestedUrl) {
  const headers = { 'content-type': 'text/html; charset=utf-8', ...spec.headers };
  if (spec.location !== undefined) headers.location = spec.location;
  const entries = Object.entries(headers).map(([name, value]) => ({ name, value }));
  for (const value of spec.setCookies || []) entries.push({ name: 'Set-Cookie', value });
  return {
    status: () => spec.status ?? 200,
    ok: () => (spec.status ?? 200) >= 200 && (spec.status ?? 200) < 300,
    url: () => spec.url || requestedUrl,
    headers: async () => ({ ...headers }),
    headersArray: async () => entries.map(entry => ({ ...entry })),
  };
}

function makeRequest(script = [], events = []) {
  const calls = [];
  const responses = [];
  const request = {
    calls, responses,
    async post(url, options) {
      assert.equal(this, request, 'use the existing request context');
      return dispatch('POST', url, options);
    },
    async get(url, options) {
      assert.equal(this, request, 'use the existing request context');
      return dispatch('GET', url, options);
    },
  };
  async function dispatch(method, url, options) {
    const index = calls.length;
    calls.push({ method, url, options });
    events.push(`${method} ${new URL(url).pathname}`);
    assert.ok(index < script.length, 'unexpected additional HTTP request');
    const spec = script[index];
    if (spec.error) throw spec.error;
    const response = makeResponse(spec, url);
    response.disposeCount = 0;
    response.dispose = async () => { response.disposeCount++; };
    response.json = async () => spec.body || {};
    responses.push(response);
    return response;
  }
  return request;
}

function makePage({ visits = [{}], request = makeRequest(), cookies = [] } = {}) {
  const gotoCalls = [];
  const cookieCalls = [];
  const contextRoutes = [];
  let currentUrl = 'about:blank';
  let currentVisit;
  let lastResponse;
  let evaluateCalls = 0;
  let clearCookieCalls = 0;
  const context = {
    async cookies(url) {
      cookieCalls.push(url);
      return cookies.map(cookie => ({ ...cookie }));
    },
    async clearCookies() { clearCookieCalls++; },
    async route(pattern, handler) { contextRoutes.push({ pattern, handler }); },
  };
  const page = {
    request, gotoCalls, cookieCalls,
    context: () => context,
    url: () => currentUrl,
    get lastResponse() { return lastResponse; },
    get evaluateCalls() { return evaluateCalls; },
    get clearCookieCalls() { return clearCookieCalls; },
    async goto(url, options) {
      const index = gotoCalls.length;
      gotoCalls.push({ url, options });
      assert.ok(index < visits.length, 'unexpected additional browser navigation');
      currentVisit = visits[index];
      if (currentVisit.error) throw currentVisit.error;
      currentUrl = currentVisit.finalUrl || url;
      if (currentVisit.response === null) return null;
      // A browser response exposes its actual Request redirect chain. There is
      // deliberately no invented route callback for each HTTP redirect hop.
      let previousRequest = null;
      for (const hop of currentVisit.hops || [currentVisit]) {
        const hopUrl = new URL(hop.url || url, url).href;
        const previous = previousRequest;
        const response = makeResponse({ ...hop, url: hopUrl }, hopUrl);
        const browserRequest = {
          url: () => hopUrl,
          method: () => hop.method || 'GET',
          redirectedFrom: () => previous,
          response: async () => response,
        };
        response.request = () => browserRequest;
        previousRequest = browserRequest;
        lastResponse = response;
        if (!currentVisit.finalUrl) currentUrl = hopUrl;
      }
      return lastResponse;
    },
    async evaluate(callback) {
      evaluateCalls++;
      const rendered = {
        themeId: THEME_ID, country: 'CA', currency: 'CAD', ...currentVisit.rendered,
      };
      const value = vm.runInNewContext(`(${callback.toString()})()`, {
        window: { Shopify: {
          theme: { id: rendered.themeId }, country: rendered.country,
          currency: { active: rendered.currency },
        } },
      });
      // Playwright serializes evaluate results back into the caller's realm.
      return JSON.parse(JSON.stringify(value));
    },
  };
  return page;
}

async function rejectionOf(promise, pattern) {
  let caught;
  await assert.rejects(promise, error => {
    caught = error;
    if (pattern) assert.match(error.message, pattern);
    return true;
  });
  return caught;
}

function assertRedacted(value, secrets) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  for (const secret of secrets) assert.ok(!serialized.includes(secret), `must redact ${secret}`);
}

test('localization submits the canonical Shopify form through the supplied request context', async t => {
  for (const country of ['CA', 'US']) {
    await t.test(country, async () => {
      const evidence = {};
      const request = makeRequest([{ status: 204 }]);
      await localizePreview(request, { ...OPTIONS, country, evidence });
      assert.equal(request.calls.length, 1);
      const call = request.calls[0];
      const target = new URL(call.url);
      assert.equal(call.method, 'POST');
      assert.equal(target.origin, BASE_URL);
      assert.equal(target.pathname, '/localization');
      assert.deepEqual(target.searchParams.getAll('preview_theme_id'), [THEME_ID]);
      const { return_to: returnTo, ...form } = call.options.form;
      assert.deepEqual(form, {
        form_type: 'localization', utf8: '✓', _method: 'put',
        country_code: country, language_code: 'en',
      });
      const home = new URL(returnTo, BASE_URL);
      assert.equal(home.origin, BASE_URL);
      assert.equal(home.pathname, '/');
      assert.deepEqual(Object.fromEntries(home.searchParams), {
        preview_theme_id: THEME_ID, utm_source: 'qa_automation',
        utm_medium: 'playwright', utm_campaign: 'pr_preview_targeted',
      });
      assert.equal(call.options.maxRedirects, 0);
      assert.equal(call.options.failOnStatusCode, false);
      assert.equal(call.options.timeout, 15000);
      assert.equal(evidence.request.methodOverride, 'put');
      assert.equal(evidence.request.country, country);
      assert.deepEqual(evidence.responses.map(item => item.status), [204]);
      assert.equal(request.responses[0].disposeCount, 1);
    });
  }
});

test('POST redirects preserve their original status and become GETs for 301, 302, and 303', async t => {
  for (const status of [301, 302, 303]) {
    await t.test(String(status), async () => {
      const evidence = {};
      const request = makeRequest([
        { status, location: '/?preview_theme_id=' + THEME_ID }, { status: 200 },
      ]);
      await localizePreview(request, { ...OPTIONS, evidence });
      assert.deepEqual(request.calls.map(call => call.method), ['POST', 'GET']);
      assert.equal(request.calls[1].options.form, undefined, 'do not replay the localization form');
      assert.deepEqual(evidence.responses.map(item => item.status), [status, 200]);
      assert.deepEqual(evidence.responses.map(item => item.method), ['POST', 'GET']);
      assert.ok(request.responses.every(response => response.disposeCount === 1));
    });
  }
});

test('a final 404 cannot conceal an original 302 or 303 localization response', async t => {
  for (const status of [302, 303]) {
    await t.test(String(status), async () => {
      const evidence = {};
      const request = makeRequest([{ status, location: '/missing' }, { status: 404 }]);
      await assert.rejects(localizePreview(request, { ...OPTIONS, evidence }), /Localization HTTP failure/);
      assert.deepEqual(evidence.responses.map(item => item.status), [status, 404]);
      assert.equal(evidence.responses[0].url.path, '/localization');
      assert.equal(request.calls.length, 2);
      assert.ok(request.responses.every(response => response.disposeCount === 1));
    });
  }
});

test('same-origin relative and absolute Locations are followed exactly as supplied', async () => {
  const evidence = {};
  const absolute = BASE_URL + '/?preview_theme_id=' + THEME_ID + '&market=ca';
  const request = makeRequest([
    { status: 302, location: '/ca/?market=canada' },
    { status: 303, location: absolute }, { status: 200 },
  ]);
  await localizePreview(request, { ...OPTIONS, evidence });
  assert.deepEqual(request.calls.slice(1).map(call => call.url), [BASE_URL + '/ca/?market=canada', absolute]);
  assert.deepEqual(evidence.responses.map(item => item.status), [302, 303, 200]);
  assert.ok(request.calls.every(call => call.options.maxRedirects === 0));
  assert.equal(new URL(request.calls[1].url).searchParams.has('preview_theme_id'), false,
    'do not silently rewrite a server Location that omits the preview ID');
});

test('initial HTTP client/server failures stop before any redirect follow-up', async t => {
  for (const status of [400, 401, 404, 422, 429, 500, 503]) {
    await t.test(String(status), async () => {
      const evidence = {};
      const request = makeRequest([{ status, location: '/' }]);
      await assert.rejects(localizePreview(request, { ...OPTIONS, evidence }), /Localization HTTP failure/);
      assert.equal(request.calls.length, 1);
      assert.deepEqual(evidence.responses.map(item => item.status), [status]);
      assert.equal(request.responses[0].disposeCount, 1);
    });
  }
});

test('redirects without Location fail with their original response evidence', async t => {
  for (const status of [302, 303]) {
    await t.test(String(status), async () => {
      const evidence = {};
      const request = makeRequest([{ status }]);
      await assert.rejects(localizePreview(request, { ...OPTIONS, evidence }), /no Location/);
      assert.equal(request.calls.length, 1);
      assert.equal(evidence.responses[0].status, status);
      assert.equal(evidence.responses[0].location, null);
    });
  }
});

test('redirect loops stop after at most five follow-up requests', async () => {
  const evidence = {};
  const request = makeRequest(Array.from({ length: 8 }, () => ({ status: 302, location: '/' })));
  await assert.rejects(localizePreview(request, { ...OPTIONS, evidence }), /redirect limit exceeded/);
  assert.equal(request.calls.length, 6);
  assert.equal(evidence.responses.length, 6);
  assert.deepEqual(request.calls.map(call => call.method), ['POST', 'GET', 'GET', 'GET', 'GET', 'GET']);
  assert.ok(request.responses.every(response => response.disposeCount === 1));
});

test('unsafe origin or theme redirects are rejected before a follow-up request', async t => {
  const cases = {
    'external storefront': 'https://besthydrate.com/?preview_theme_id=' + THEME_ID,
    'different hostname': 'http://localhost:9292/',
    'different port': 'http://127.0.0.1:9393/',
    'different protocol': 'https://127.0.0.1:9292/',
    'protocol-relative external URL': '//outside.example/',
    'URL credentials': 'http://USER_SECRET:PASSWORD_SECRET@127.0.0.1:9292/',
    'different theme': '/?preview_theme_id=987654321',
    'duplicate same theme': '/?preview_theme_id=' + THEME_ID + '&preview_theme_id=' + THEME_ID,
    'duplicate conflicting themes': '/?preview_theme_id=' + THEME_ID + '&preview_theme_id=987654321',
  };
  for (const [name, location] of Object.entries(cases)) {
    await t.test(name, async () => {
      const evidence = {};
      const request = makeRequest([{ status: 302, location }]);
      const error = await rejectionOf(localizePreview(request, { ...OPTIONS, evidence }), /left the renderer|ambiguous theme/);
      assert.equal(request.calls.length, 1, 'unsafe Location must never be fetched');
      assert.equal(evidence.responses.length, 1);
      assert.equal(request.responses[0].disposeCount, 1);
      assertRedacted(error.message, ['USER_SECRET', 'PASSWORD_SECRET']);
    });
  }
});

test('307 and 308 never replay the localization POST', async t => {
  for (const status of [307, 308]) {
    await t.test(String(status), async () => {
      const evidence = {};
      const request = makeRequest([{ status, location: '/' }]);
      await assert.rejects(localizePreview(request, { ...OPTIONS, evidence }), /unexpected POST replay/);
      assert.equal(request.calls.length, 1);
      assert.equal(evidence.responses[0].status, status);
    });
  }
});

test('a later unsafe Location is rejected after retaining the earlier allowed redirect', async () => {
  const evidence = {};
  const request = makeRequest([
    { status: 302, location: '/ca/' },
    { status: 303, location: 'https://outside.example/?token=QUERY_SECRET' },
  ]);
  const error = await rejectionOf(localizePreview(request, { ...OPTIONS, evidence }), /left the renderer/);
  assert.deepEqual(request.calls.map(call => call.method), ['POST', 'GET']);
  assert.ok(request.calls.every(call => new URL(call.url).origin === BASE_URL));
  assert.deepEqual(evidence.responses.map(item => item.status), [302, 303]);
  assertRedacted([error.message, evidence], ['QUERY_SECRET']);
});

test('307 and 308 can continue an already converted GET without resending the form', async () => {
  const evidence = {};
  const request = makeRequest([
    { status: 303, location: '/ca/' }, { status: 307, location: '/' },
    { status: 308, location: '/ca/' }, { status: 200 },
  ]);
  await localizePreview(request, { ...OPTIONS, evidence });
  assert.deepEqual(request.calls.map(call => call.method), ['POST', 'GET', 'GET', 'GET']);
  assert.ok(request.calls.slice(1).every(call => call.options.form === undefined));
});

test('HTTP diagnostics retain status and cookie names while redacting URL and cookie values', async () => {
  const evidence = {};
  const secrets = ['USER_SECRET', 'PASSWORD_SECRET', 'PATH_SECRET', 'QUERY_SECRET', 'COOKIE_SECRET', 'LOCATION_SECRET'];
  const request = makeRequest([{
    status: 404,
    url: 'http://USER_SECRET:PASSWORD_SECRET@127.0.0.1:9292/private/PATH_SECRET?token=QUERY_SECRET&preview_theme_id=' + THEME_ID,
    location: '/private/LOCATION_SECRET?token=QUERY_SECRET',
    setCookies: ['shopify_session=COOKIE_SECRET; Path=/; HttpOnly', 'localization=COOKIE_SECRET; Path=/', 'shopify_session=COOKIE_SECRET; Secure'],
  }]);
  const error = await rejectionOf(localizePreview(request, { ...OPTIONS, evidence }), /Localization HTTP failure/);
  assertRedacted(evidence, secrets);
  assertRedacted(error.message, secrets);
  assert.equal(evidence.responses[0].status, 404);
  assert.deepEqual(evidence.responses[0].setCookieNames, ['localization', 'shopify_session']);
  assert.equal(evidence.responses[0].url.path, '[redacted]');
  assert.equal(evidence.responses[0].url.previewThemeId, THEME_ID);
  assert.deepEqual(evidence.responses[0].url.queryKeys, ['preview_theme_id', 'token']);
  assert.equal(evidence.responses[0].contentType, 'text/html');
});

test('invalid Location errors do not echo the unparseable URL', async () => {
  const evidence = {};
  const request = makeRequest([{ status: 302, location: 'http://[INVALID_LOCATION_SECRET' }]);
  const error = await rejectionOf(localizePreview(request, { ...OPTIONS, evidence }), /Invalid localization Location/);
  assert.equal(request.calls.length, 1);
  assert.equal(evidence.responses[0].status, 302);
  assert.deepEqual(evidence.responses[0].location, { invalidUrl: true });
  assertRedacted([error.message, evidence], ['INVALID_LOCATION_SECRET']);
});

test('transport exceptions preserve earlier responses and redact private error details', async t => {
  for (const [name, message, kind] of [
    ['timeout', 'Timed out at http://127.0.0.1:9292/private/PATH_SECRET?token=QUERY_SECRET Cookie: COOKIE_SECRET', 'timeout'],
    ['failure', 'socket closed with Cookie: COOKIE_SECRET and token=QUERY_SECRET', 'request failed'],
  ]) {
    await t.test(name, async () => {
      const evidence = {};
      const request = makeRequest([{ status: 303, location: '/?token=QUERY_SECRET' }, { error: new Error(message) }]);
      const error = await rejectionOf(localizePreview(request, { ...OPTIONS, evidence }), /Localization transport failure/);
      assert.deepEqual(evidence.responses.map(item => item.status), [303]);
      assert.equal(evidence.transportFailure.method, 'GET');
      assert.equal(evidence.transportFailure.kind, kind);
      assert.equal(request.calls.length, 2);
      assertRedacted([error.message, evidence], ['PATH_SECRET', 'QUERY_SECRET', 'COOKIE_SECRET']);
    });
  }
});

test('preview targets reject an unapproved renderer, missing theme, or ambiguous requested theme', () => {
  for (const baseURL of ['https://besthydrate.com', 'http://localhost:9292', 'file:///tmp/preview']) {
    assert.throws(() => previewTarget('/', baseURL, THEME_ID), /loopback renderer/);
  }
  for (const themeId of ['', '0', '-1', '123abc']) {
    assert.throws(() => previewTarget('/', BASE_URL, themeId), /explicit development theme ID/);
  }
  assert.throws(() => previewTarget('/?preview_theme_id=' + THEME_ID + '&preview_theme_id=' + THEME_ID, BASE_URL, THEME_ID), /ambiguous theme/);
  assert.deepEqual(safeUrl('http://[INVALID_SECRET', BASE_URL), { invalidUrl: true });
});

test('a preview visit verifies rendered theme, country, and currency and strips cookie values', async () => {
  const evidence = {};
  const page = makePage({ cookies: [
    { name: 'localization', value: 'COOKIE_SECRET', domain: '127.0.0.1', path: '/private/PATH_SECRET', secure: false, httpOnly: true, sameSite: 'Lax' },
  ] });
  const response = await visitPreview(page, '/products/lemonade-best-hydrate', { ...OPTIONS, evidence });
  assert.equal(response, page.lastResponse);
  assert.deepEqual(evidence.visits[0].context, { themeId: THEME_ID, country: 'CA', currency: 'CAD' });
  assert.equal(evidence.visits[0].cookies[0].name, 'localization');
  assert.equal(evidence.visits[0].cookies[0].path, '[redacted]');
  assert.equal(evidence.visits[0].cookies[0].value, undefined);
  assertRedacted(evidence, ['COOKIE_SECRET', 'PATH_SECRET']);
  assert.deepEqual(page.cookieCalls, [BASE_URL]);
  assert.equal(page.evaluateCalls, 1);
  assert.equal(new URL(page.gotoCalls[0].url).searchParams.get('preview_theme_id'), THEME_ID);
});

test('correct URL parameters cannot override a mismatched rendered theme or market', async t => {
  for (const [field, value] of [['themeId', '987654321'], ['country', 'US'], ['currency', 'USD']]) {
    await t.test(field, async () => {
      const evidence = {};
      const page = makePage({ visits: [{ rendered: { [field]: value } }] });
      await assert.rejects(visitPreview(page, '/', { ...OPTIONS, evidence }), /theme\/market verification failed/);
      assert.equal(new URL(page.gotoCalls[0].url).searchParams.get('preview_theme_id'), THEME_ID);
      assert.equal(evidence.visits[0].context[field], value);
      assert.equal(evidence.visits[0].status, 200);
      assert.equal(page.request.calls.length, 0);
    });
  }
});

test('initial theme verification permits an unspecified market before localization', async () => {
  const evidence = {};
  const page = makePage({ visits: [{ rendered: { country: 'US', currency: 'USD' } }] });
  await visitPreview(page, '/', { baseURL: BASE_URL, themeId: THEME_ID, evidence });
  assert.equal(evidence.visits[0].context.themeId, THEME_ID);
  assert.equal(evidence.visits[0].context.country, 'US');
});

test('browser HTTP redirect evidence is recorded even when the final document fails', async () => {
  const evidence = {};
  const page = makePage({ visits: [{ hops: [
    { status: 302, location: '/products/missing?token=QUERY_SECRET', setCookies: ['preview=COOKIE_SECRET; Path=/'] },
    { status: 404, url: '/products/missing?token=QUERY_SECRET' },
  ] }] });
  await assert.rejects(visitPreview(page, '/', { ...OPTIONS, evidence }), /Preview document failed/);
  assert.deepEqual(evidence.visits[0].responses.map(item => item.status), [302, 404]);
  assert.equal(evidence.visits[0].status, 404);
  assert.deepEqual(evidence.visits[0].responses[0].setCookieNames, ['preview']);
  assert.equal(page.evaluateCalls, 0);
  assertRedacted(evidence, ['QUERY_SECRET', 'COOKIE_SECRET']);
});

test('browser redirects outside preview scope are recorded and rejected after navigation', async t => {
  const external = 'https://outside.example/?token=QUERY_SECRET';
  const local = BASE_URL + '/?preview_theme_id=' + THEME_ID;
  const cases = {
    'external final URL': [
      { status: 302, location: external }, { status: 200, url: external },
    ],
    'external intermediate hop returning to loopback': [
      { status: 302, location: external }, { status: 302, url: external, location: local },
      { status: 200, url: local },
    ],
    'different theme after HTTP redirect': [
      { status: 302, location: '/?preview_theme_id=987654321' },
      { status: 200, url: '/?preview_theme_id=987654321' },
    ],
    'duplicate theme after HTTP redirect': [
      { status: 302, location: '/?preview_theme_id=' + THEME_ID + '&preview_theme_id=' + THEME_ID },
      { status: 200, url: '/?preview_theme_id=' + THEME_ID + '&preview_theme_id=' + THEME_ID },
    ],
  };
  for (const [name, hops] of Object.entries(cases)) {
    await t.test(name, async () => {
      const evidence = {};
      const page = makePage({ visits: [{ hops }] });
      const error = await rejectionOf(visitPreview(page, '/', { ...OPTIONS, evidence }), /left the renderer|ambiguous theme/);
      assert.equal(page.gotoCalls.length, 1, 'the fixture follows its HTTP chain inside one goto');
      assert.deepEqual(evidence.visits[0].responses.map(item => item.status), hops.map(hop => hop.status));
      assert.equal(evidence.visits[0].finalUrl.origin, new URL(hops.at(-1).url, BASE_URL).origin);
      assert.equal(page.evaluateCalls, 0, 'escaped navigation cannot be accepted as a verified page');
      assert.equal(page.request.calls.length, 0);
      assertRedacted([error.message, evidence], ['QUERY_SECRET']);
    });
  }
});

test('an external final URL without a redirect callback or chain is still rejected', async () => {
  const evidence = {};
  const page = makePage({ visits: [{ finalUrl: 'https://outside.example/private/PATH_SECRET?token=QUERY_SECRET' }] });
  const error = await rejectionOf(visitPreview(page, '/', { ...OPTIONS, evidence }), /left the renderer/);
  assert.equal(evidence.visits[0].finalUrl.origin, 'https://outside.example');
  assert.equal(evidence.visits[0].responses.length, 1);
  assert.equal(page.evaluateCalls, 0);
  assertRedacted([error.message, evidence], ['PATH_SECRET', 'QUERY_SECRET']);
});

test('an invalid requested page is rejected before browser navigation', async () => {
  const page = makePage();
  await assert.rejects(visitPreview(page, 'https://outside.example/', { ...OPTIONS, evidence: {} }), /left the renderer/);
  assert.equal(page.gotoCalls.length, 0);
});

test('null document responses and navigation failures retain bounded diagnostics', async t => {
  await t.test('no document response', async () => {
    const evidence = {};
    const page = makePage({ visits: [{ response: null }] });
    await assert.rejects(visitPreview(page, '/', { ...OPTIONS, evidence }), /Preview document failed/);
    assert.equal(evidence.visits[0].status, null);
    assert.deepEqual(evidence.visits[0].responses, []);
    assert.equal(page.evaluateCalls, 0);
  });
  for (const [name, message, kind] of [
    ['timeout', 'Timeout at /private/PATH_SECRET?token=QUERY_SECRET Cookie: COOKIE_SECRET', 'timeout'],
    ['navigation error', 'net::ERR_FAILED /private/PATH_SECRET?token=QUERY_SECRET Cookie: COOKIE_SECRET', 'navigation failed'],
  ]) {
    await t.test(name, async () => {
      const evidence = {};
      const page = makePage({ visits: [{ error: new Error(message) }] });
      const error = await rejectionOf(visitPreview(page, '/', { ...OPTIONS, evidence }), /Preview navigation failed/);
      assert.equal(evidence.visits[0].transportFailure, kind);
      assert.equal(page.evaluateCalls, 0);
      assertRedacted([error.message, evidence], ['PATH_SECRET', 'QUERY_SECRET', 'COOKIE_SECRET']);
    });
  }
});

test('preparePreviewMarket keeps page.request and returns a visit that verifies the selected market', async () => {
  const evidence = {};
  const request = makeRequest([{ status: 303, location: '/' }, { status: 200 }]);
  const page = makePage({ request, visits: [
    { rendered: { country: 'CA', currency: 'CAD' } },
    { rendered: { country: 'US', currency: 'USD' } },
    { rendered: { country: 'US', currency: 'USD' } },
  ], cookies: [{ name: 'localization', value: 'COOKIE_SECRET', domain: '127.0.0.1', path: '/' }] });
  const visit = await preparePreviewMarket(page, { ...OPTIONS, country: 'US', currency: 'USD', evidence });
  assert.equal(page.request, request);
  assert.deepEqual(request.calls.map(call => call.method), ['POST', 'GET']);
  assert.equal(request.calls[0].options.form.country_code, 'US');
  assert.equal(evidence.verified, true);
  assert.equal(evidence.phase, 'ready for cart');
  assert.equal(evidence.visits.length, 2);
  assert.equal(evidence.cookiesAfterLocalization[0].name, 'localization');
  assertRedacted(evidence, ['COOKIE_SECRET']);
  await visit('/products/lemonade-electrolyte-best-hydrate');
  assert.equal(evidence.visits.length, 3);
  assert.equal(evidence.visits[2].context.country, 'US');
  assert.equal(evidence.visits[2].context.currency, 'USD');
  assert.equal(request.calls.length, 2, 'returning/using a verified visit does not mutate a cart');
});

test('preparePreviewMarket preserves the failing phase and all earlier evidence', async t => {
  const cases = [
    {
      name: 'initial rendered theme mismatch', visits: [{ rendered: { themeId: '987654321' } }], script: [],
      phase: 'initial preview', statuses: undefined, visitCount: 1, error: /verification failed/,
    },
    {
      name: 'localization HTTP failure', visits: [{}], script: [{ status: 404 }],
      phase: 'localization response', statuses: [404], visitCount: 1, error: /Localization HTTP failure/,
    },
    {
      name: 'localized rendered currency mismatch', visits: [{}, { rendered: { currency: 'USD' } }],
      script: [{ status: 302, location: '/' }, { status: 200 }],
      phase: 'localized preview', statuses: [302, 200], visitCount: 2, error: /verification failed/,
    },
  ];
  for (const fixture of cases) {
    await t.test(fixture.name, async () => {
      const evidence = {};
      const request = makeRequest(fixture.script);
      const page = makePage({ request, visits: fixture.visits });
      await assert.rejects(preparePreviewMarket(page, { ...OPTIONS, evidence }), fixture.error);
      assert.equal(evidence.verified, false);
      assert.equal(evidence.phase, fixture.phase);
      assert.equal(evidence.visits.length, fixture.visitCount);
      assert.equal(page.gotoCalls.length, fixture.visitCount);
      assert.deepEqual(evidence.responses?.map(item => item.status), fixture.statuses);
      assert.equal(request.calls.length, fixture.script.length);
      assert.equal(request.calls.some(call => new URL(call.url).pathname.startsWith('/cart')), false);
    });
  }
});

// Register and invoke the real candidate spec's acceptance callbacks, replacing
// only the Playwright runner. The production helper above remains in use.
function loadAcceptanceSpec() {
  const registered = [];
  const beforeEach = [];
  const logs = [];
  const playwrightTest = (name, callback) => { registered.push({ name, callback }); };
  playwrightTest.beforeEach = callback => { beforeEach.push(callback); };
  playwrightTest.setTimeout = () => {};
  playwrightTest.skip = condition => assert.equal(condition, false, 'fixture has an explicit development theme');
  const expect = actual => ({
    toBe: expected => assert.equal(actual, expected),
    toBeTruthy: () => assert.ok(actual),
  });
  const filename = path.join(__dirname, '../playwright/pr-preview-gate.spec.cjs');
  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    require(name) {
      if (name === '@playwright/test') return { test: playwrightTest, expect };
      if (name === './helpers/preview-localization.cjs') return { preparePreviewMarket };
      throw new Error('Unexpected dependency in isolated acceptance spec: ' + name);
    },
    process: { env: { BASE_URL, PREVIEW_THEME_ID: THEME_ID, PREVIEW_PATHS: '/' } },
    console: { log: (...args) => { logs.push(args); } },
    URL, Buffer,
  }, { filename });
  const acceptance = registered.filter(item => item.name.startsWith('Lemonade preview acceptance:'));
  assert.equal(acceptance.length, 2, 'register both country acceptance callbacks');
  return { beforeEach, logs, acceptance };
}

test('the real acceptance callback attaches failure evidence without any cart setup or cleanup', async t => {
  const cases = [
    {
      name: 'localization HTTP failure', visits: [{}], script: [{ status: 404 }],
      phase: 'localization response', error: /Localization HTTP failure/,
    },
    {
      name: 'localized market mismatch', visits: [{}, { rendered: { country: 'US', currency: 'USD' } }],
      script: [{ status: 303, location: '/' }, { status: 200 }],
      phase: 'localized preview', error: /verification failed/,
    },
    {
      name: 'browser escaped renderer', visits: [{ hops: [
        { status: 302, location: 'https://outside.example/' }, { status: 200, url: 'https://outside.example/' },
      ] }], script: [], phase: 'initial preview', error: /left the renderer/,
    },
  ];
  for (const fixture of cases) {
    await t.test(fixture.name, async () => {
      const runner = loadAcceptanceSpec();
      const request = makeRequest(fixture.script);
      const page = makePage({ request, visits: fixture.visits });
      const attachments = [];
      for (const hook of runner.beforeEach) await hook({ context: page.context() });
      const callback = runner.acceptance.find(item => item.name.startsWith('Lemonade preview acceptance: CA ')).callback;
      await assert.rejects(callback({ page }, {
        project: { name: 'offline-fixture' },
        async attach(name, attachment) { attachments.push({ name, ...attachment }); },
      }), fixture.error);
      assert.equal(page.clearCookieCalls, 1);
      assert.equal(request.calls.length, fixture.script.length);
      assert.deepEqual(request.calls.filter(call => new URL(call.url).pathname.startsWith('/cart')), [],
        'no cart write, including cleanup, is permitted before market verification');
      assert.equal(attachments.length, 1);
      assert.equal(attachments[0].name, 'lemonade-CA-localization');
      assert.equal(attachments[0].contentType, 'application/json');
      const attached = JSON.parse(attachments[0].body.toString());
      assert.equal(attached.verified, false);
      assert.equal(attached.phase, fixture.phase);
      assert.ok(attached.visits.length > 0);
      if (fixture.script.length) assert.equal(attached.responses.length, fixture.script.length);
      if (fixture.phase === 'initial preview') assert.deepEqual(attached.visits[0].responses.map(item => item.status), [302, 200]);
      const logged = JSON.parse(runner.logs.find(item => item[0] === 'LEMONADE_ACCEPTANCE')[1]);
      assert.deepEqual(logged.localization, attached);
      assert.equal(logged.checkout, 'not reached');
      assert.deepEqual(logged.quantities, []);
    });
  }
});

test('after verification, evidence is attached before cleanup and cleanup survives attachment failure', async () => {
  const events = [];
  const request = makeRequest([
    { status: 303, location: '/' }, { status: 200 },
    { status: 500 }, { status: 200, body: {} }, { status: 200, body: {} },
  ], events);
  const page = makePage({ request, visits: [{}, {}] });
  const runner = loadAcceptanceSpec();
  const callback = runner.acceptance.find(item => item.name.startsWith('Lemonade preview acceptance: CA ')).callback;
  let attached;
  await assert.rejects(callback({ page }, {
    project: { name: 'offline-fixture' },
    async attach(name, attachment) {
      events.push('attach ' + name);
      attached = JSON.parse(attachment.body.toString());
      throw new Error('attachment unavailable');
    },
  }), /attachment unavailable/);
  assert.equal(attached.verified, true);
  assert.equal(attached.phase, 'ready for cart');
  assert.deepEqual(events, [
    'POST /localization', 'GET /', 'POST /cart/clear.js',
    'attach lemonade-CA-localization', 'POST /cart/clear.js', 'POST /cart/update.js',
  ]);
});
