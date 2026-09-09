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

The Shopify Admin MAIN menu and the server-rendered storefront header now carry the same order and destinations.

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

## Breadcrumbs

PASS.

Page-system breadcrumbs now derive their hierarchy from the Shopify Admin MAIN menu, handle `new-menu`, instead of maintaining a separate hardcoded copy of the menu tree.

Each page also passes its declared family, Science, Solutions or Connect, into the breadcrumb renderer. This prevents a cross-family shortcut from taking over the canonical breadcrumb. For example, Our Formula is linked from Solutions as a product shortcut, but its canonical page trail remains under Science.

Within the canonical family, the deepest matching menu position wins. This preserves the complete visible navigation route when the same destination is used at multiple levels.

Examples:

`Home › Science › Our Formula`

`Home › Science › Our Formula › Five Essential Electrolytes`

`Home › Solutions › Products › Product Details`

`Home › Solutions › Clinical & Humanitarian › Clinical Hydration`

`Home › Connect › Company & People › Meet Us`

`Home › Connect › Company & People › About Best Hydrate`

`Home › Connect › Investor Relations › Investor Overview`

`Home › Connect › Company & People › Jobs & Careers`

Secondary pages intentionally outside MAIN, including Athletes & Ambassadors and Dianna Proctor, retain explicit logical fallbacks under `Connect › Company & People`.

News and article breadcrumbs remain normalized to the Connect hierarchy:

`Home › Connect › News & Contact › News & Insights`

Article pages continue one level deeper to the current article title.

Product and utility surfaces retain their existing contextual breadcrumb treatments.

## Live deployment verification

Direct Shopify MAIN theme inspection confirmed current deployed versions of:

- `sections/bhd-header.liquid`
- `sections/bhd-header-contrast.liquid`
- `snippets/bhd-page-breadcrumbs.liquid`
- `snippets/bhd-page-header.liquid`
- `snippets/bhd-page-dispatch.liquid`
- `snippets/bhd-page-mission-values.liquid`
- `snippets/bhd-page-jobs-careers.liquid`

The live breadcrumb snippet contains the family-aware Shopify MAIN traversal, and the live page-header snippet passes the page family into it. Shopify reports no theme processing failure.

The consolidated About Best Hydrate snippet required an explicit sync-marker commit because Shopify initially retained an older live checksum. It was rechecked through the Shopify Theme file API and the renamed live content is current.

## Result

PASS.

The nested menu interaction, Company & People information architecture, About Best Hydrate consolidation, Jobs & Careers page and menu-derived breadcrumb hierarchy are aligned in Shopify Admin and the live Shopify MAIN theme.