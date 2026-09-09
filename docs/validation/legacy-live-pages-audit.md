# Legacy live-pages audit

Date: 2026-09-09
Scope: published non-canonical Shopify pages retained from earlier site architecture.

## Duplicate hubs retired safely

Six obsolete published pages were identified as duplicate architecture. They were **unpublished rather than deleted** so their Admin history remains recoverable, then their public paths were redirected to canonical replacements.

| Legacy page | Canonical destination | Result |
|---|---|---|
| `/pages/learn` | `/pages/hydration-science` | Unpublished + redirect PASS |
| `/pages/connect` | `/pages/our-story` | Unpublished + redirect PASS |
| `/pages/news-blog` | `/blogs/news` | Unpublished + redirect PASS |
| `/pages/shop` | `/products/lemonade-best-hydrate` | Unpublished + redirect PASS |
| `/pages/best-hydrate-electrolyte-mix` | `/pages/hydration-science` | Unpublished + redirect PASS |
| `/pages/about` (old Ingredients) | `/pages/our-formula` | Unpublished + redirect PASS |

These dispositions remove duplicated or outdated navigation hubs without deleting source content from Shopify Admin.

## Distinct legacy pages retained and rebuilt

Three useful pages were retained as first-class secondary surfaces rather than redirected away:

### FAQ - `/pages/q-a`

- retained and published
- old missing/stale template suffix removed
- wired into the shared Best Hydrate page dispatcher
- rebuilt with current product boundaries, formula, label-first directions, water-first everyday context and clinical cautions
- exact legacy scoop/daily-volume instructions are not repeated because the current physical label controls exact directions
- hidden Shopify body was replaced with a concise current summary so internal search does not surface obsolete dosing/claim copy

### Athletes & Ambassadors - `/pages/athletes-ambassadors`

- retained and published
- old template suffix removed
- wired into the shared page system
- rebuilt around transparent partnership standards, evidence boundaries and contextual athlete use
- removed older blanket language such as 'hydration that actually works', 'no unnecessary sugars' and performance/recovery claims presented without qualification
- current body summary normalized for internal search

### Dianna Proctor - `/pages/dianna-proctor`

- retained and published
- old template suffix removed
- rebuilt as a current athlete profile with the existing Best Hydrate-owned Shopify images
- 2026 competition facts verified against Athletics Canada and University of Guelph sources
- current profile includes 2026 World Relays selection, participation in the Canadian-record mixed 4x400 metre relay and 2026 U SPORTS 300 metre title
- explicitly separates athlete results from product-performance attribution
- hidden Shopify body normalized to current verified facts

## Meet Us hidden-body cleanup

`/pages/our-story` uses the custom Meet Us template and did not visually depend on its old Shopify body, but that body contained older phrases including 'optimally balanced' and 'spikes and drops'. The body was replaced with a concise current company summary so internal search or metadata extraction does not preserve obsolete claim language.

## AVADA HTML sitemap cleanup

PASS. Six AVADA-generated HTML sitemap pages were reviewed and removed from Shopify:

- `/pages/avada-sitemap`
- `/pages/avada-sitemap-pages`
- `/pages/avada-sitemap-products`
- `/pages/avada-sitemap-collections`
- `/pages/avada-sitemap-blogs`
- `/pages/avada-sitemap-articles`

The current Refresh/GitHub theme contains no AVADA references. Shopify already generates and maintains its native XML sitemap, so these old HTML sitemap pages were redundant. Their stored HTML also contained stale `myshopify.com` links and retired page references. All six Page objects were permanently deleted through Shopify Admin with zero mutation errors.

The Rewind menu backup page is unpublished and explicitly marked by Rewind as a backup resource. It was left untouched.

Shopify's privacy opt-out page was also left untouched.

## Result

**LEGACY CONTENT DISPOSITION: PASS.**

All first-party legacy pages are now either canonical, safely redirected, or deliberately retained and rebuilt. The redundant AVADA HTML sitemap family has been removed.
