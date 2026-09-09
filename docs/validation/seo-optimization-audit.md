# Best Hydrate SEO optimization audit

Date: 2026-09-09

## Scope

Full on-site SEO pass covering Shopify metadata, homepage metadata, product SEO, blog/article SEO, structured data, crawl controls, redirects, image alt text, favicon signals, internal hierarchy, and live MAIN theme verification.

The work preserves current page copy, the existing menu hierarchy, the two intentional regional product records, and science-safe claim boundaries.

## Page metadata

PASS.

Every published Shopify Page now has a unique `global.title_tag` and `global.description_tag` matched to the page's actual search intent.

Coverage includes:

- Science pages
- formula and ingredient pages
- research and publication pages
- clinical development pages
- Solutions pages
- performance hydration pages
- everyday hydration pages
- humanitarian pages
- Company & People pages
- partnership pages
- investor pages
- press, events and contact pages
- all new hierarchy hub pages

Examples include:

- `Hydration Science | Fluids, Electrolytes & Glucose`
- `Recovery Hydration | Fluids & Electrolytes`
- `About Best Hydrate | Mission, Values & Formula`
- `Best Hydrate Science | Hydration, Formula & Research`
- `Hydration Solutions | Performance, Daily & Clinical`

Visible page content was not overwritten to achieve this metadata coverage.

## Homepage metadata

PASS.

The homepage now uses:

Title:
`Best Hydrate | Science-Informed Electrolyte Hydration`

Description:
`Best Hydrate is a Canadian science-informed electrolyte drink mix for performance, everyday hydration and recovery. Explore the formula and hydration science.`

The same canonical homepage messaging is used for social metadata so title and description signals remain consistent.

## Product SEO

PASS.

Both intentional regional product records have custom SEO titles and descriptions.

The canonical consumer product uses:

`Best Hydrate Electrolyte Drink Mix | Lemonade`

Its description accurately references glucose, sodium, potassium, chloride and bicarbonate without adding magnesium or unsupported clinical claims.

The second regional product remains active and separate by design. No product was archived, repriced or merged during the SEO pass.

## Product media accessibility and image SEO

PASS for current Shopify product media.

Alt text was added to the canonical product's key Shopify-hosted media, including:

- product container image
- product video
- hydration and product-information graphics
- nutrition facts label
- QR information graphic
- English and French product-label imagery
- Best Hydrate logo

Alt text is descriptive rather than keyword stuffed.

## Blog and article SEO

PASS.

The News blog now has a unique SEO title and description.

All eight published articles now have unique SEO title and description metadata.

Sparse article summaries were filled where useful, without replacing existing summaries unnecessarily.

All eight published article hero images now have descriptive alt text.

## Structured data

PASS.

New shared structured-data layer:

`snippets/bhd-seo-structured-data.liquid`

It provides:

- Organization JSON-LD
- WebSite JSON-LD on the homepage
- Shopify native Product structured data on product pages
- Shopify native Article structured data on article pages
- BreadcrumbList structured data following the Shopify MAIN hierarchy
- article breadcrumbs through `Connect > News & Contact > News & Insights > Article`

The schema intentionally does not fabricate ratings, reviews, medical claims, local-business data, awards or unsupported organization details.

## Canonical and social metadata

PASS.

The theme retains Shopify's canonical URL output.

`snippets/meta-tags.liquid` now also supplies:

- consistent Open Graph title and description
- Open Graph image fallback to Best Hydrate branding when no page image exists
- Twitter summary-large-image metadata
- Twitter image fallback
- product price Open Graph properties
- homepage title and description consistency

## Breadcrumb and internal hierarchy SEO

PASS.

Page breadcrumbs use deterministic canonical hierarchy paths aligned with Shopify MAIN.

Parent pages expose children and grandchildren as clickable internal links.

This improves both user navigation and crawlable internal hierarchy without adding hidden keyword blocks.

Examples:

`Home > Science > Our Formula > Five Essential Electrolytes`

`Home > Solutions > Performance > Recovery`

`Home > Connect > Company & People > About Best Hydrate`

## Crawl and index controls

PASS.

The theme now emits `noindex,follow` for low-value utility routes including:

- search results
- cart
- 404 pages
- customer/account pages
- `/collections/all`

The thin `/pages/shop-overview` hierarchy helper is marked with Shopify `seo.hidden = 1` because all visible Shop navigation now points directly to the canonical product.

No broad robots blocking was added.

## Redirect cleanup

PASS.

Existing legacy redirects were reviewed and preserved where they continue to consolidate old routes.

Two stale top-level legacy redirects were improved:

- `/pages/learn` now redirects to `/pages/science-overview`
- `/pages/connect` now redirects to `/pages/connect-overview`

This aligns old Google-facing routes with the current top-level architecture instead of sending visitors directly to lower-level pages.

## Favicon search signal

PASS on-site.

The Shopify favicon setting uses the Best Hydrate logo.

The theme explicitly advertises:

- 96 x 96 square PNG favicon
- shortcut icon
- 180 x 180 Apple touch icon

This corrects the earlier weak 32 x 32-only signal and gives search crawlers a stable square icon source.

Search-engine display remains dependent on recrawling and cache refresh.

## Search Console

BLOCKED externally.

The connected Google Search Console integration currently exposes no Best Hydrate property.

Attempts to register both:

- `sc-domain:besthydrate.com`
- `https://besthydrate.com/`

returned no accessible existing property for the connected Google identity.

Therefore this pass did not claim to complete:

- Search Console sitemap submission
- URL Inspection indexing requests
- Google indexing-coverage review
- query/click/impression analysis
- Core Web Vitals reporting from Search Console

Once the Best Hydrate Search Console property is verified or the owning Google account is connected, those are the next external SEO steps.

## Homepage hero asset delivery

PARTIAL, no unsafe substitution made.

The homepage still references several desktop/tablet hero images through external SharePoint URLs and one older mobile Performance asset through raw GitHub.

A controlled migration to Shopify Files was attempted for six external hero sources. Shopify could not process those source URLs, so no failed asset was placed on the live storefront.

The six failed temporary MediaImage records created during testing were deleted afterward.

The Shopify Files inventory already contains READY mobile Daily, Medical and Humanitarian hero assets, but no verified equivalent desktop/tablet files were found for the current SharePoint hero scenes.

Therefore the current visual assets were preserved rather than replacing them with unrelated or lower-resolution images.

Recommended follow-up when original files are available:

1. upload the exact desktop/tablet hero originals directly to Shopify Files
2. use responsive Shopify CDN image URLs or image objects
3. preserve meaningful alt text
4. retain explicit dimensions or aspect ratios
5. validate mobile/tablet/desktop visual parity and LCP after migration

## Live theme verification

PASS.

Direct Shopify MAIN verification confirms the current live theme contains:

- `layout/theme.liquid`
- `snippets/meta-tags.liquid`
- `snippets/bhd-seo-structured-data.liquid`

At final verification the live theme reported:

- role: MAIN
- `processing: false`
- `processingFailed: false`

## Result

PASS for the full feasible on-site SEO implementation.

Completed:

- unique Page metadata
- homepage metadata
- product metadata
- blog/article metadata
- article summaries
- product and article image alt text
- Organization, WebSite, Product, Article and Breadcrumb structured data
- canonical hierarchy and crawlable internal linking
- low-value route noindex controls
- redirect cleanup
- favicon search signals
- direct live MAIN verification

Outstanding external or source-dependent work:

- connect or verify the Best Hydrate Google Search Console property
- submit/verify sitemap and request priority recrawls there
- review real Google query/indexing/Core Web Vitals data once access exists
- migrate externally hosted desktop/tablet homepage hero originals to Shopify CDN when the exact source files are available

No ranking guarantee is implied. SEO changes improve crawlability, relevance, technical clarity and search presentation signals, while actual indexing and rankings remain search-engine decisions.