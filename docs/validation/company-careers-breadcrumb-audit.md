# Company, careers and breadcrumb closeout

Date: 2026-09-09

## Nested menu state

PASS.

When a second-level menu node is clicked, its top-level family is promoted to the pinned open state first if needed. The top-level toggle receives `aria-expanded="true"` before the child state is applied.

Desktop second-level items also expand on hover as previews. Leaving the nested context closes the deepest hover preview first after approximately 260 ms, then closes an unpinned top-level hover preview after approximately 520 ms. A second-level item opened by click remains persistent and is not removed by the hover timeout.

This keeps the visual tree, hover previews and explicit toggle states consistent on desktop and mobile.

## Company & People hierarchy

PASS.

The visible Company & People branch is now ordered:

1. Meet Us
2. About Best Hydrate
3. Jobs & Careers

Meet Us points to `/pages/our-story`.
About Best Hydrate points to `/pages/mission-values`.
Jobs & Careers points to `/pages/jobs-careers`.

The Shopify Admin MAIN menu and the server-rendered storefront header carry the same order and destinations.

## About Best Hydrate consolidation

PASS.

The former Mission & Values content and useful Why Best Hydrate material have been consolidated into one About Best Hydrate page at `/pages/mission-values`.

The consolidated page includes:

- company origin and why Best Hydrate exists
- mission
- seven operating values
- formula and development logic
- product, science, research and access tracks
- decision standards
- startup-stage context
- links to Meet Us and Jobs & Careers

The Shopify Page object is titled `About Best Hydrate` and remains published.

The old `/pages/why-best-hydrate` Page object remains unpublished rather than deleted, preserving its Shopify history. A redirect sends `/pages/why-best-hydrate` to `/pages/mission-values`.

## Jobs & Careers

PASS.

A published Shopify Page object exists at `/pages/jobs-careers` using the default page template.

The live theme renders a dedicated Jobs & Careers page with:

- startup-stage hiring context
- future capability areas
- expected working style
- guidance for speculative introductions
- links to About Best Hydrate, Meet Us, Contact, News, Current Research and Partnerships

## Menu route uniqueness

PASS.

The earlier breadcrumb defect was caused by different menu levels sharing the same destination URL. A breadcrumb could determine the deepest matching destination, but it could not determine which menu node the visitor had actually clicked.

Distinct menu positions now have distinct routes. New published hierarchy pages were created for:

- `/pages/science-overview`
- `/pages/solutions-overview`
- `/pages/products-overview`
- `/pages/clinical-humanitarian`
- `/pages/connect-overview`
- `/pages/company-people`
- `/pages/investor-overview`
- `/pages/news-contact`
- `/pages/ingredients-formula`
- `/pages/shop-overview`

This separates, for example, top-level Science from level-two Hydration Science, top-level Solutions from level-two Products and level-three Product Details, and top-level Connect from Company & People and Meet Us.

The new pages are published and contain concise startup-appropriate introductory copy rather than empty placeholders.

## Breadcrumbs

PASS.

Page-system breadcrumbs derive their hierarchy from Shopify Admin MAIN, handle `new-menu`, rather than maintaining a second hardcoded tree.

Each specialized page can also declare its canonical Science, Solutions or Connect family. Cross-family shortcuts therefore do not take over the canonical trail.

Because menu nodes at different levels now use distinct routes, the breadcrumb depth corresponds directly to the menu node that was clicked.

Examples:

`Home › Science`

`Home › Science › Hydration Science`

`Home › Science › Our Formula › Five Essential Electrolytes`

`Home › Solutions › Products`

`Home › Solutions › Products › Product Details`

`Home › Solutions › Clinical & Humanitarian › Clinical Hydration`

`Home › Connect › Company & People`

`Home › Connect › Company & People › Meet Us`

`Home › Connect › Company & People › About Best Hydrate`

`Home › Connect › Investor Relations › Investor Overview`

`Home › Connect › News & Contact › News & Insights`

The product menu destination is also read from MAIN, so Buy Best Hydrate receives:

`Home › Solutions › Products › Buy Best Hydrate`

Secondary pages intentionally outside MAIN, including Athletes & Ambassadors and Dianna Proctor, retain explicit logical fallbacks under `Connect › Company & People`.

## Parent-page directories

PASS.

Parent menu pages now expose their descendants directly on the page using Shopify Admin MAIN as the source of truth.

Top-level parent pages list:

- every level-two child
- each child's level-three descendants as clickable links

Level-two parent pages list:

- every direct level-three child as a clickable link

Leaf pages do not render an empty directory.

On specialized content pages, the directory is placed directly below the page hero so it remains easy to discover. On newly created hierarchy hubs, it appears directly below the introductory content.

The directory includes relevant section iconography and responsive cards but does not duplicate or overwrite existing page content.

## Live deployment verification

Direct Shopify MAIN theme inspection confirmed current deployed versions of:

- `snippets/bhd-header-menu-source.liquid`
- `snippets/bhd-menu-descendants.liquid`
- `snippets/bhd-page-breadcrumbs.liquid`
- `snippets/bhd-page-header.liquid`
- `snippets/bhd-page-dispatch.liquid`

The MAIN theme reports `processing: false` and `processingFailed: false`.

A direct Shopify Admin query also confirmed the updated MAIN menu hierarchy and all ten new hierarchy Page objects as published.

## Result

PASS.

The Shopify Admin menu now has unique routes for distinct hierarchy positions, breadcrumbs follow the clicked menu depth, and parent pages expose their children and grandchildren through clickable on-page navigation derived from the same MAIN source.