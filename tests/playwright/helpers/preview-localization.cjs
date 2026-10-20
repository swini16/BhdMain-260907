const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;

function previewTarget(path, baseURL, themeId) {
  const base = new URL(baseURL);
  if (!['http:', 'https:'].includes(base.protocol) || base.hostname !== '127.0.0.1' ||
      base.username || base.password || !/^[1-9]\d*$/.test(String(themeId))) {
    throw new Error('Preview setup requires the loopback renderer and an explicit development theme ID.');
  }
  const url = new URL(path, base);
  assertLocalTarget(url, base, themeId);
  url.searchParams.set('preview_theme_id', String(themeId));
  url.searchParams.set('utm_source', 'qa_automation');
  url.searchParams.set('utm_medium', 'playwright');
  url.searchParams.set('utm_campaign', 'pr_preview_targeted');
  return url;
}

function assertLocalTarget(url, base, themeId) {
  const ids = url.searchParams.getAll('preview_theme_id');
  if (url.origin !== base.origin || url.protocol !== base.protocol || url.username || url.password ||
      ids.length > 1 || (ids.length === 1 && ids[0] !== String(themeId))) {
    throw new Error('Preview redirect left the renderer or selected a different/ambiguous theme: ' +
      JSON.stringify(safeUrl(url.href, base.href)));
  }
}

// No cookie values, query values, credentials, response bodies, or arbitrary paths in logs.
function safeUrl(value, baseURL) {
  try {
    const url = new URL(value, baseURL);
    const safePath = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:localization\/?|products\/[a-z0-9-]+\/?|cart\/?)?$/i;
    return {
      origin: url.origin,
      path: safePath.test(url.pathname) ? url.pathname : '[redacted]',
      queryKeys: [...new Set([...url.searchParams.keys()].map(key =>
        /^[a-z0-9_\[\]-]{1,64}$/i.test(key) ? key : '[redacted]'))].sort(),
      previewThemeId: /^\d+$/.test(url.searchParams.get('preview_theme_id') || '') ?
        url.searchParams.get('preview_theme_id') : null,
    };
  } catch {
    return { invalidUrl: true };
  }
}

async function responseEvidence(response, method, baseURL) {
  const headers = await response.headers();
  const entries = await response.headersArray();
  return {
    method,
    status: response.status(),
    url: safeUrl(response.url(), baseURL),
    location: headers.location ? safeUrl(headers.location, response.url()) : null,
    contentType: (headers['content-type'] || '').split(';')[0],
    setCookieNames: [...new Set(entries.filter(header => header.name.toLowerCase() === 'set-cookie')
      .map(header => header.value.split('=', 1)[0].trim())
      .filter(name => /^[a-z0-9_-]{1,100}$/i.test(name)))].sort(),
  };
}

async function localizePreview(request, { baseURL, themeId, country, evidence }) {
  if (!['CA', 'US'].includes(country)) throw new Error('Unexpected preview acceptance country.');
  const base = new URL(baseURL);
  const home = previewTarget('/', baseURL, themeId);
  let url = previewTarget('/localization', baseURL, themeId);
  let method = 'POST';
  const form = {
    form_type: 'localization', utf8: '✓', _method: 'put',
    country_code: country, language_code: 'en', return_to: home.pathname + home.search,
  };
  evidence.request = { country, methodOverride: 'put', returnTo: safeUrl(home.href, baseURL) };
  evidence.responses = [];
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const options = { maxRedirects: 0, failOnStatusCode: false, timeout: 15000 };
    let response;
    try {
      response = method === 'POST'
        ? await request.post(url.href, { ...options, form })
        : await request.get(url.href, options);
    } catch (error) {
      evidence.transportFailure = {
        method, url: safeUrl(url.href, baseURL),
        kind: /timeout|timed out/i.test(error?.message || '') ? 'timeout' : 'request failed',
      };
      throw new Error('Localization transport failure: ' + JSON.stringify(evidence.transportFailure));
    }
    const record = await responseEvidence(response, method, baseURL);
    evidence.responses.push(record);
    const status = response.status();
    const location = (await response.headers()).location;
    await response.dispose();
    if (status >= 200 && status < 300) return;
    const diagnostic = JSON.stringify(record);
    if (!REDIRECTS.has(status)) {
      throw new Error('Localization HTTP failure: ' + diagnostic);
    }
    if (!location) throw new Error('Localization redirect has no Location: ' + diagnostic);
    let next;
    try { next = new URL(location, url); }
    catch { throw new Error('Invalid localization Location: ' + diagnostic); }
    assertLocalTarget(next, base, themeId);
    if (method === 'POST' && (status === 307 || status === 308)) {
      throw new Error('Localization requires an unexpected POST replay; stopped: ' + diagnostic);
    }
    if (hop === MAX_REDIRECTS) throw new Error('Localization redirect limit exceeded: ' + diagnostic);
    // Match browser POST-to-GET behavior without concealing or rewriting the server's Location.
    if (status === 301 || status === 302 || status === 303) method = 'GET';
    url = next;
  }
}

async function cookieEvidence(page, baseURL) {
  const cookies = await page.context().cookies(baseURL);
  return cookies.map(({ name, domain, path, secure, httpOnly, sameSite }) =>
    ({ name, domain, path: safeUrl(path, baseURL).path, secure, httpOnly, sameSite }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function visitPreview(page, path, { baseURL, themeId, country, currency, evidence }) {
  const target = previewTarget(path, baseURL, themeId);
  const visit = { requested: safeUrl(target.href, baseURL) };
  (evidence.visits ||= []).push(visit);
  let response;
  try {
    response = await page.goto(target.href, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    visit.transportFailure = /timeout|timed out/i.test(error?.message || '') ? 'timeout' : 'navigation failed';
    throw new Error('Preview navigation failed: ' + JSON.stringify(visit));
  }
  visit.finalUrl = safeUrl(page.url(), baseURL);
  visit.status = response ? response.status() : null;
  // Browser navigation follows HTTP redirects. Record the chain and reject an
  // escaped preview before accepting the page or enabling any cart setup.
  const requests = [];
  for (let request = response?.request(); request; request = request.redirectedFrom()) requests.unshift(request);
  visit.responses = [];
  for (const request of requests) {
    const hop = await request.response();
    if (hop) visit.responses.push(await responseEvidence(hop, request.method(), baseURL));
  }
  for (const request of requests) assertLocalTarget(new URL(request.url()), target, themeId);
  assertLocalTarget(new URL(page.url()), target, themeId);
  if (!response || !response.ok()) throw new Error('Preview document failed: ' + JSON.stringify(visit));
  visit.context = await page.evaluate(() => ({
    themeId: String(window.Shopify?.theme?.id || ''),
    country: window.Shopify?.country || null,
    currency: window.Shopify?.currency?.active || null,
  }));
  visit.cookies = await cookieEvidence(page, baseURL);
  if (visit.context.themeId !== String(themeId) ||
      (country && visit.context.country !== country) ||
      (currency && visit.context.currency !== currency)) {
    throw new Error('Preview theme/market verification failed: ' + JSON.stringify(visit));
  }
  return response;
}

async function preparePreviewMarket(page, options) {
  const { baseURL, themeId, country, currency, evidence } = options;
  evidence.verified = false;
  evidence.phase = 'initial preview';
  await visitPreview(page, '/', { baseURL, themeId, evidence });
  evidence.phase = 'localization response';
  await localizePreview(page.request, { baseURL, themeId, country, evidence });
  evidence.cookiesAfterLocalization = await cookieEvidence(page, baseURL);
  evidence.phase = 'localized preview';
  await visitPreview(page, '/', { baseURL, themeId, country, currency, evidence });
  evidence.verified = true;
  evidence.phase = 'ready for cart';
  return path => visitPreview(page, path, options);
}

module.exports = { localizePreview, preparePreviewMarket, previewTarget, safeUrl, visitPreview };
