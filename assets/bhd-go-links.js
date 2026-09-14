/* Best Hydrate clean campaign redirects.
 * Keeps public organic captions readable while preserving source-aware attribution.
 * Loaded by the theme layout. Safe no-op on all other paths.
 */
(() => {
  const path = window.location.pathname.replace(/\/+$/, '');
  const map = {
    '/go/science': '/pages/lp-01-hydration-is-more-than-water',
    '/go/formula': '/pages/lp-02-six-ingredients',
    '/go/research': '/pages/lp-03-research-milestone',
    '/go/performance': '/pages/lp-04-hydration-follows-the-session',
    '/go/cold': '/pages/lp-05-cold-dry-air',
    '/go/clinical': '/pages/lp-06-clinical-hydration-context',
    '/go/buy': '/products/lemonade-best-hydrate'
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
    utm_content: content
  });

  window.location.replace(`${destination}?${qs.toString()}`);
})();
