/* Best Hydrate market-aware clean campaign + product routing.
 * Loaded globally by the theme layout.
 */
(() => {
  const CA_PRODUCT = '/products/lemonade-best-hydrate';
  const US_PRODUCT = '/products/lemonade-electrolyte-best-hydrate';
  const marketBuyUrl = window.BHD_MARKET_BUY_URL || CA_PRODUCT;
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  function preserveSuffix(source, destinationPath) {
    const sourceUrl = new URL(source, window.location.origin);
    return `${destinationPath}${sourceUrl.search}${sourceUrl.hash}`;
  }

  // If someone lands on the product handle for the wrong Shopify market,
  // route them to the product published in their current market.
  if ((path === CA_PRODUCT || path === US_PRODUCT) && path !== marketBuyUrl) {
    window.location.replace(preserveSuffix(window.location.href, marketBuyUrl));
    return;
  }

  // Rewrite all product links in the rendered DOM to the current market.
  // This centralizes market handling so dozens of theme CTAs don't need
  // country-specific Liquid logic individually.
  function rewriteProductLinks() {
    document.querySelectorAll('a[href]').forEach((anchor) => {
      let url;
      try {
        url = new URL(anchor.getAttribute('href'), window.location.origin);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (url.pathname !== CA_PRODUCT && url.pathname !== US_PRODUCT) return;

      url.pathname = marketBuyUrl;
      anchor.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rewriteProductLinks, { once: true });
  } else {
    rewriteProductLinks();
  }

  const map = {
    '/go/science': '/pages/lp-01-hydration-is-more-than-water',
    '/go/formula': '/pages/lp-02-six-ingredients',
    '/go/research': '/pages/lp-03-research-milestone',
    '/go/performance': '/pages/lp-04-hydration-follows-the-session',
    '/go/cold': '/pages/lp-05-cold-dry-air',
    '/go/clinical': '/pages/lp-06-clinical-hydration-context',
    '/go/buy': marketBuyUrl,
  };

  const destination = map[path];
  if (!destination) return;

  const incoming = new URLSearchParams(window.location.search);
  const source = incoming.get('src') || incoming.get('utm_source') || 'organic';
  const campaign = incoming.get('campaign') || incoming.get('utm_campaign') || path.split('/').pop();
  const content = path === '/go/buy' ? 'buy_direct' : 'guide';

  const qs = new URLSearchParams({
    utm_source: source,
    utm_medium: 'organic_social',
    utm_campaign: campaign,
    utm_content: content,
  });

  window.location.replace(`${destination}?${qs.toString()}`);
})();
