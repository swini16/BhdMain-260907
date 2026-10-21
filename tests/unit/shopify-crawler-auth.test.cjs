'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  readCrawlerAuthorization, installCrawlerAuthorization, storefrontRequest,
} = require('../playwright/helpers/shopify-crawler-auth.cjs');

// Deliberately non-working fixture values; no real signature is stored in this repository.
const INPUT = 'fixture-input-only';
const SIGNATURE = 'fixture-signature-only';
const env = () => ({ SHOPIFY_CRAWLER_SIGNATURE_INPUT: INPUT, SHOPIFY_CRAWLER_SIGNATURE: SIGNATURE });
const auth = () => readCrawlerAuthorization(env());
const allowedPaths = ['/', '/localization', '/products/lemonade-best-hydrate', '/products/lemonade-electrolyte-best-hydrate', '/cart', '/cart.js', '/cart/add', '/cart/change', '/cart/add.js', '/cart/change.js', '/cart/clear.js', '/cart/update.js'];
const disallowedUrls = [
  'http://besthydrate.com/cart', 'https://www.besthydrate.com/cart',
  'https://besthydrate.com.evil.example/cart', 'https://best-hydrate.myshopify.com/cart',
  'https://besthydrate.com:444/cart', 'https://user:password@besthydrate.com/cart',
  'https://besthydrate.com@evil.example/cart', 'https://evil.example/cart',
  'https://besthydrate.com/account', 'https://besthydrate.com/account/login',
  'https://besthydrate.com/checkout', 'https://besthydrate.com/checkouts/cn/example',
  'https://besthydrate.com/analytics', 'https://besthydrate.com/api/collect',
  'https://besthydrate.com/products/unrelated', 'https://besthydrate.com/cart.json',
  'https://besthydrate.com/cart/clear', 'https://besthydrate.com/cart/update', 'https://besthydrate.com/cart.js/extra',
  'https://besthydrate.com/%63art.js', 'https://besthydrate.com/cart#fragment',
  '/cart', 'not a URL',
];

function noLeak(error) {
  const details = `${error.message}\n${error.stack}`;
  assert.equal(error.cause, undefined);
  assert.doesNotMatch(details, /fixture-input-only|fixture-signature-only|SDK PRIVATE CALL LOG/);
  return true;
}

async function browserHandler(authorization = auth()) {
  let handler;
  const calls = [];
  await installCrawlerAuthorization({
    async route(pattern, callback) { calls.push(pattern); handler = callback; },
  }, authorization);
  assert.deepEqual(calls, ['**/*']);
  return handler;
}

function routeFor(url, headers = {}, response = { status: () => 200 }, method = 'GET') {
  const calls = { fetch: [], fulfill: [], fallback: [], abort: [] };
  return {
    calls,
    request: () => ({ url: () => url, method: () => method, allHeaders: async () => headers }),
    fetch: async options => { calls.fetch.push(options); return response; },
    fulfill: async options => { calls.fulfill.push(options); },
    fallback: async (...args) => { calls.fallback.push(args); },
    abort: async error => { calls.abort.push(error); },
    continue: () => { throw new Error('Header-carrying route.continue must never be used'); },
  };
}

test('authorization requires both environment values and fixes the agent value', () => {
  for (const input of [{}, { SHOPIFY_CRAWLER_SIGNATURE_INPUT: INPUT }, { SHOPIFY_CRAWLER_SIGNATURE: SIGNATURE }, { ...env(), SHOPIFY_CRAWLER_SIGNATURE: '' }]) {
    assert.throws(() => readCrawlerAuthorization(input), error => {
      noLeak(error);
      assert.match(error.message, /missing/);
      assert.match(error.message, /SHOPIFY_CRAWLER_SIGNATURE_INPUT/);
      assert.match(error.message, /SHOPIFY_CRAWLER_SIGNATURE/);
      return true;
    });
  }
  const result = readCrawlerAuthorization({ ...env(), SHOPIFY_CRAWLER_SIGNATURE_AGENT: 'ignored' });
  assert.deepEqual(result.headers, { 'Signature-Input': INPUT, Signature: SIGNATURE, 'Signature-Agent': '"https://shopify.com"' });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.headers), true);
});

test('control characters, non-ASCII, whitespace-only, excessive and non-string credentials are rejected without echo', () => {
  for (const value of ['x\r\ninjected: yes', 'x\n', 'x\t', '\x00x', 'x\x1f', 'x\x7f', 'é', '   ', 'x'.repeat(4097), 1, null, {}, []]) {
    for (const key of ['SHOPIFY_CRAWLER_SIGNATURE_INPUT', 'SHOPIFY_CRAWLER_SIGNATURE']) {
      assert.throws(() => readCrawlerAuthorization({ ...env(), [key]: value }), error => noLeak(error) && /invalid/.test(error.message));
    }
  }
  assert.equal(readCrawlerAuthorization({ ...env(), SHOPIFY_CRAWLER_SIGNATURE: 'x'.repeat(4096) }).headers.Signature.length, 4096);
  assert.throws(() => readCrawlerAuthorization({ get SHOPIFY_CRAWLER_SIGNATURE_INPUT() { throw new Error(`SDK PRIVATE CALL LOG ${SIGNATURE}`); } }), noLeak);
});

test('browser signs only the exact HTTPS origin and allowlisted paths, preserving real response and cookies', async () => {
  const handler = await browserHandler();
  for (const path of allowedPaths) {
    const response = { status: () => 200, marker: path };
    const originalHeaders = { cookie: 'public-browser-fixture=1', accept: 'text/html', signature: 'stale', 'sIgNaTuRe-AgEnT': 'stale' };
    const route = routeFor(`https://besthydrate.com${path}?preview_theme_id=123`, originalHeaders, response);
    await handler(route);
    assert.equal(route.calls.fetch.length, 1);
    const options = route.calls.fetch[0];
    assert.equal(options.maxRedirects, 0);
    assert.deepEqual(options.headers, { cookie: 'public-browser-fixture=1', accept: 'text/html', ...auth().headers });
    assert.equal(originalHeaders.signature, 'stale', 'do not mutate the original browser request');
    assert.deepEqual(route.calls.fulfill, [{ response }]);
    assert.equal(route.calls.fallback.length, 0);
  }
});

test('noneligible browser requests fall back untouched, retaining previous analytics routes', async () => {
  const handler = await browserHandler();
  for (const url of disallowedUrls) {
    const route = routeFor(url, { cookie: 'existing=1' });
    await handler(route);
    assert.deepEqual(route.calls.fallback, [[]], url);
    assert.equal(route.calls.fetch.length, 0, url);
    assert.equal(route.calls.fulfill.length, 0, url);
  }
});

test('browser method allowlist signs only GET, HEAD and POST, including native extensionless cart POSTs', async () => {
  const handler = await browserHandler();
  for (const method of ['GET', 'HEAD', 'POST']) {
    const route = routeFor('https://besthydrate.com/cart', {}, undefined, method);
    await handler(route);
    assert.equal(route.calls.fetch.length, 1);
  }
  for (const path of ['/cart/add', '/cart/change']) {
    const route = routeFor(`https://besthydrate.com${path}`, {}, undefined, 'POST');
    await handler(route);
    assert.equal(route.calls.fetch.length, 1);
  }
  for (const method of ['DELETE', 'PUT', 'OPTIONS', 'CONNECT', '']) {
    const route = routeFor('https://besthydrate.com/cart', {}, undefined, method);
    await handler(route);
    assert.deepEqual(route.calls.fallback, [[]]);
    assert.equal(route.calls.fetch.length, 0);
  }
});

test('real redirects are fulfilled without following them or signing checkout/cross-origin hops', async () => {
  const handler = await browserHandler();
  for (const location of ['https://besthydrate.com/checkouts/cn/example', 'https://evil.example/collect']) {
    const response = { status: () => 307, headers: () => ({ location, 'set-cookie': 'public-preference=CA; Secure' }) };
    const initial = routeFor('https://besthydrate.com/cart', { cookie: 'existing=1' }, response);
    await handler(initial);
    assert.equal(initial.calls.fetch[0].maxRedirects, 0);
    assert.equal(initial.calls.fulfill[0].response, response);
    assert.deepEqual(Object.keys(initial.calls.fulfill[0]), ['response']);
    const redirected = routeFor(location, { cookie: 'browser-owned=1' });
    await handler(redirected);
    assert.deepEqual(redirected.calls.fallback, [[]]);
    assert.equal(redirected.calls.fetch.length, 0);
  }
});

test('browser failures are sanitized and aborted, with no SDK call log or error cause retained', async () => {
  const handler = await browserHandler();
  for (const failingMethod of ['fetch', 'fulfill', 'fallback']) {
    const route = routeFor(failingMethod === 'fallback' ? 'https://evil.example/' : 'https://besthydrate.com/cart');
    route[failingMethod] = async () => { throw new Error(`SDK PRIVATE CALL LOG ${INPUT} ${SIGNATURE}`); };
    await assert.rejects(handler(route), noLeak);
    assert.deepEqual(route.calls.abort, ['failed']);
  }
  await assert.rejects(installCrawlerAuthorization({ route: async () => { throw new Error(`SDK PRIVATE CALL LOG ${SIGNATURE}`); } }, auth()), noLeak);
});

test('API requests return the original response, never follow redirects, and send only fixed signature headers', async () => {
  const calls = [];
  const response = { ok: () => false, status: () => 302, url: () => 'https://besthydrate.com/cart', json: async () => ({ real: true }) };
  const context = { fetch: async (url, options) => { calls.push({ url, options }); return response; } };
  for (const path of allowedPaths) {
    assert.equal(await storefrontRequest(context, auth(), 'get', `https://besthydrate.com${path}`), response);
  }
  const data = { quantity: 2 };
  assert.equal(await storefrontRequest(context, auth(), 'POST', 'https://besthydrate.com/cart/change.js', data), response);
  for (const call of calls) {
    assert.equal(call.options.maxRedirects, 0);
    assert.deepEqual(call.options.headers, auth().headers);
    assert.equal(Object.keys(call.options.headers).some(key => /cookie|authorization/i.test(key)), false);
  }
  assert.equal(calls.at(-1).options.data, data);
  assert.equal(calls.at(-1).options.method, 'POST');
  assert.equal('data' in calls[0].options, false);
});

test('API rejects all unauthorized destinations and methods before invoking the request context', async () => {
  let calls = 0;
  const context = { fetch: async () => { calls++; } };
  for (const url of disallowedUrls) await assert.rejects(storefrontRequest(context, auth(), 'GET', url), noLeak);
  for (const method of ['DELETE', 'PUT', 'GET\r\nX: y', '', null]) await assert.rejects(storefrontRequest(context, auth(), method, 'https://besthydrate.com/cart'), noLeak);
  assert.equal(calls, 0);
});

test('API SDK errors and invalid auth objects cannot leak or forward extra headers', async () => {
  await assert.rejects(storefrontRequest({ fetch: async () => { throw new Error(`SDK PRIVATE CALL LOG ${INPUT} ${SIGNATURE}`); } }, auth(), 'GET', 'https://besthydrate.com/cart.js'), noLeak);
  let calls = 0;
  const context = { fetch: async (_url, options) => { calls++; assert.deepEqual(options.headers, auth().headers); return { json: async () => ({}) }; } };
  await assert.rejects(storefrontRequest(context, null, 'GET', 'https://besthydrate.com/cart.js'), noLeak);
  assert.equal(calls, 0);
  await storefrontRequest(context, { headers: { ...auth().headers, 'Signature-Agent': 'untrusted', Authorization: 'must-not-be-forwarded', Cookie: 'must-not-be-forwarded' } }, 'GET', 'https://besthydrate.com/cart.js');
  assert.equal(calls, 1);
});

test('JSON decoding preserves real response data and identity but never echoes a failing body or SDK log', async () => {
  const data = { currency: 'CAD', item_count: 0 };
  const response = { ok: () => true, status: () => 200, json: async () => data };
  const wrapped = await storefrontRequest({ fetch: async () => response }, auth(), 'GET', 'https://besthydrate.com/cart.js');
  assert.equal(wrapped, response);
  assert.equal(wrapped.ok(), true);
  assert.equal(wrapped.status(), 200);
  assert.equal(await wrapped.json(), data);
  const invalid = { json: async () => { throw new SyntaxError(`SDK PRIVATE CALL LOG <html>${SIGNATURE}</html>`); } };
  const failed = await storefrontRequest({ fetch: async () => invalid }, auth(), 'GET', 'https://besthydrate.com/cart.js');
  await assert.rejects(failed.json(), noLeak);
});
