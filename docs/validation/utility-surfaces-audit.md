# Utility and commerce-support surfaces audit

Date: 2026-09-09
Scope: article, search, collection, list-collections, cart and 404 templates.

## Architecture

A shared `bhd-surface-context` section now adds Best Hydrate-specific navigation and context around Shopify's native utility and commerce sections. Native search, product grid, cart, article and comment mechanics remain intact.

## Article

PASS theme-side.

- Adds Home > News & Insights > article breadcrumbs.
- Explicitly identifies articles as dated records and points readers to current Science and Product pages for current claims/composition.
- Preserves Shopify article title, featured image, sharing, comments and article content.

## Search

PASS theme-side.

- Adds breadcrumb and plain-language search scope.
- Provides direct routes to Science and Shop.
- Preserves Shopify search results, sorting and mixed content/product result mechanics.

## Collection

PASS theme-side.

- Adds Shop > collection breadcrumb context.
- Gives visitors Product Details and Hydration Science routes beside commerce results.
- Preserves collection title/description, filters, sorting, quick add and product grid.

## Collection index

PASS theme-side.

- Removed the generic blank slideshow and empty rich-text scaffolding.
- Uses the shared Shop context and native collection listing only.
- Gives the collection index a clear `Shop Best Hydrate` title.

## Cart

PASS theme-side.

- Adds a lightweight cart breadcrumb/context strip.
- Provides Directions and Our Formula links without interrupting cart state.
- Preserves native Shopify cart items, subtotal and checkout buttons.

## 404

PASS theme-side.

- Preserves the native 404 heading.
- Adds meaningful recovery routes to Science, Solutions, Connect and Shop.
- Adds an inline site search form.

## Diff validation

PASS. The utility implementation changed exactly seven intended files:

- `sections/bhd-surface-context.liquid`
- `templates/article.json`
- `templates/search.json`
- `templates/collection.json`
- `templates/list-collections.json`
- `templates/cart.json`
- `templates/404.json`

No checkout or product business logic was modified.

## Remaining dependency

Live desktop/tablet/mobile rendering and functional QA remain part of the final browser pass.

## Result

**UTILITY SURFACES THEME AUDIT: PASS WITH LIVE-BROWSER DEPENDENCY.**
