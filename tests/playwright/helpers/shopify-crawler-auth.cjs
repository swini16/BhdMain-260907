'use strict';

// Run only in the isolated authorized suite: built-in line reporter, trace/video off.
// Playwright can retain nested SDK step errors before these outer sanitized catches.
const STOREFRONT_ORIGIN = 'https://besthydrate.com';
const SIGNATURE_AGENT = '"https://shopify.com"';
const MAX_HEADER_LENGTH = 4096;
const ALLOWED_PATHS = new Set([
  '/',
  '/localization',
  '/products/lemonade-best-hydrate',
  '/products/lemonade-electrolyte-best-hydrate',
  '/cart',
  '/cart.js',
  // Native theme code uses the documented routes.cart_add_url/cart_change_url values.
  '/cart/add',
  '/cart/change',
  '/cart/add.js',
  '/cart/change.js',
  '/cart/clear.js',
  '/cart/update.js',
]);
const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST']);
const SIGNATURE_HEADER_NAMES = new Set(['signature-input', 'signature', 'signature-agent']);
const MISSING_AUTH = 'Shopify crawler authorization is missing; SHOPIFY_CRAWLER_SIGNATURE_INPUT and SHOPIFY_CRAWLER_SIGNATURE are required.';
const INVALID_AUTH = 'Shopify crawler authorization is invalid; bounded printable ASCII signature headers are required.';
const REQUEST_FAILED = 'Shopify authorized storefront request failed.';

function credential(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= MAX_HEADER_LENGTH
    && value.trim().length > 0
    && /^[\x20-\x7E]+$/.test(value);
}

function signatureHeaders(input, signature) {
  if (!credential(input) || !credential(signature)) throw new Error(INVALID_AUTH);
  return Object.freeze({
    'Signature-Input': input,
    Signature: signature,
    'Signature-Agent': SIGNATURE_AGENT,
  });
}

function readCrawlerAuthorization(env = process.env) {
  let input, signature;
  try {
    input = env?.SHOPIFY_CRAWLER_SIGNATURE_INPUT;
    signature = env?.SHOPIFY_CRAWLER_SIGNATURE;
  } catch {
    throw new Error(INVALID_AUTH);
  }
  if (input === undefined || signature === undefined || input === '' || signature === '') {
    throw new Error(MISSING_AUTH);
  }
  return Object.freeze({ headers: signatureHeaders(input, signature) });
}

function headersFrom(auth) {
  try {
    return signatureHeaders(auth?.headers?.['Signature-Input'], auth?.headers?.Signature);
  } catch {
    throw new Error(INVALID_AUTH);
  }
}

function allowedUrl(value) {
  try {
    const url = new URL(value);
    if (url.origin !== STOREFRONT_ORIGIN || url.protocol !== 'https:'
        || url.username || url.password || url.hash || !ALLOWED_PATHS.has(url.pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

function allowedMethod(method) {
  return typeof method === 'string' && ALLOWED_METHODS.has(method.toUpperCase());
}

async function installCrawlerAuthorization(context, auth) {
  const authHeaders = headersFrom(auth);
  try {
    await context.route('**/*', async route => {
      try {
        const request = route.request();
        if (!allowedUrl(request.url()) || !allowedMethod(request.method())) return await route.fallback();
        const headers = { ...await request.allHeaders() };
        // Replace any existing casing of these fields; preserve the browser's own cookies.
        for (const name of Object.keys(headers)) {
          if (SIGNATURE_HEADER_NAMES.has(name.toLowerCase())) delete headers[name];
        }
        Object.assign(headers, authHeaders);
        // Never continue with signed headers: Playwright would carry those through redirects.
        // Fulfill the real, unfollowed response so the browser starts each next request itself.
        const response = await route.fetch({ headers, maxRedirects: 0 });
        await route.fulfill({ response });
      } catch {
        try { await route.abort('failed'); } catch { /* Do not expose SDK request details. */ }
        throw new Error(REQUEST_FAILED);
      }
    });
  } catch {
    throw new Error('Shopify crawler authorization could not be installed.');
  }
}

async function storefrontRequest(requestContext, auth, method, url, data) {
  const headers = headersFrom(auth);
  const target = allowedUrl(url);
  if (!target || !allowedMethod(method)) {
    throw new Error('Shopify storefront request is outside the authorized scope.');
  }
  const options = { method: method.toUpperCase(), headers, maxRedirects: 0 };
  if (data !== undefined) options.data = data;
  try {
    const response = await requestContext.fetch(target.href, options);
    const json = response.json.bind(response);
    // Keep the real APIResponse and body; sanitize only errors from decoding its JSON.
    Object.defineProperty(response, 'json', {
      configurable: true,
      writable: true,
      value: async () => {
        try { return await json(); } catch {
          throw new Error('Shopify storefront response could not be parsed as JSON.');
        }
      },
    });
    return response;
  } catch {
    // SDK errors can include request headers and call logs. Never retain the cause.
    throw new Error(REQUEST_FAILED);
  }
}

module.exports = { readCrawlerAuthorization, installCrawlerAuthorization, storefrontRequest };
