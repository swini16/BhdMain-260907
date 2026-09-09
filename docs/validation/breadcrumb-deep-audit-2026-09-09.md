# Breadcrumb deep audit

Date: 2026-09-09

## Why this audit exists

Earlier breadcrumb checks were marked PASS even though storefront screenshots subsequently showed trails such as `Home › Recovery`. Those PASS statements were incorrect because they verified theme source and menu structure without proving that the runtime breadcrumb lookup resolved the current page to its menu ancestors.

This pass treats the screenshot as a confirmed rendering defect and removes the fragile lookup dependency from Shopify Page breadcrumbs.

## Confirmed failure mode

The prior breadcrumb component attempted to discover the current page by traversing `linklists['new-menu']` at render time and comparing menu URLs with the storefront request path.

That design had several possible failure points:

- Shopify menu links had previously been stored as manual HTTP links.
- Shopify can localize or normalize storefront paths independently of the Admin URL representation.
- GitHub-to-Shopify synchronization had left some helper snippets on older live versions even after repository changes.
- A failed traversal intentionally fell back to `Home › Current Page`, which exactly matches the screenshot showing `Home › Recovery`.

The CSS was inspected separately. `sections/main-page.liquid` renders `.bhd-breadcrumbs` as a wrapping flex row and does not hide intermediate breadcrumb links at tablet or mobile breakpoints. The missing parents were therefore a data/rendering problem, not responsive CSS.

## MAIN menu normalization

Shopify Admin MAIN is menu ID `gid://shopify/Menu/281128960284`, handle `new-menu`.

The menu has been converted from manual HTTP destinations to native Shopify resources:

- Page destinations use `PAGE` plus the actual Shopify Page resource ID.
- Buy Best Hydrate uses `PRODUCT` plus the canonical product resource ID.
- News & Insights uses `BLOG` plus the News blog resource ID.

The Recovery menu node is directly verified as:

- level 1: Solutions, `/pages/solutions-overview`
- level 2: Performance, `/pages/performance-hydration`
- level 3: Recovery, `/pages/recovery-hydration`
- Recovery Page resource: `gid://shopify/Page/155036123420`

## Deterministic Page breadcrumb architecture

`snippets/bhd-page-breadcrumbs.liquid` no longer discovers Shopify Page hierarchy by traversing the menu at runtime.

Instead it:

1. derives the current Page handle directly from the storefront `/pages/...` request path when available
2. falls back to the explicitly passed Shopify Page handle
3. resolves that handle against a canonical breadcrumb map mirroring MAIN
4. renders the exact depth and parent links assigned to that route

This removes dependency on:

- linklist cache state
- absolute versus relative menu URLs
- locale prefixes before `/pages/`
- nested snippet visibility of menu data

The output also exposes nonvisual QA attributes:

- `data-bhd-breadcrumb-handle`
- `data-bhd-breadcrumb-depth`

## Coverage

The deterministic map contains 57 Page handles:

- 55 Page nodes represented in MAIN
- Athletes & Ambassadors as a logical secondary page under Connect › Company & People
- Dianna Proctor as a logical secondary page under Connect › Company & People

Representative assertions:

- `/pages/science-overview` → `Home › Science`
- `/pages/hydration-science` → `Home › Science › Hydration Science`
- `/pages/five-essential-electrolytes` → `Home › Science › Our Formula › Five Essential Electrolytes`
- `/pages/products-overview` → `Home › Solutions › Products`
- `/pages/recovery-hydration` → `Home › Solutions › Performance › Recovery`
- `/pages/clinical-hydration` → `Home › Solutions › Clinical & Humanitarian › Clinical Hydration`
- `/pages/company-people` → `Home › Connect › Company & People`
- `/pages/our-story` → `Home › Connect › Company & People › Meet Us`
- `/pages/mission-values` → `Home › Connect › Company & People › About Best Hydrate`
- `/pages/contact` → `Home › Connect › News & Contact › Contact Us`

A local structural validation of the map confirmed:

- 57 unique mapped handles
- 55 MAIN Page entries plus 2 secondary entries
- every depth-2 and depth-3 entry has a valid parent route
- Recovery resolves exactly to `Home › Solutions › Performance › Recovery`

## Exact Recovery render chain

The current page render path is:

`page.handle = recovery-hydration`

→ `snippets/bhd-page-dispatch.liquid`

→ `snippets/bhd-page-recovery.liquid`

→ `snippets/bhd-page-header.liquid`

→ `snippets/bhd-page-breadcrumbs.liquid`

The shared page header now explicitly passes `page.handle` to the breadcrumb component. The breadcrumb component independently derives `recovery-hydration` from `request.path` as an additional safeguard.

The Recovery content itself carries `data-bhd-page="recovery-hydration"` as a nonvisual deployment marker.

## Parent-page directories

`snippets/bhd-menu-descendants.liquid` was also forcibly republished to Shopify MAIN after an older live copy was discovered.

Parent pages continue to derive their child and grandchild directory cards from Shopify Admin MAIN:

- level-1 pages show level-2 children and level-3 descendants
- level-2 pages show their level-3 children
- leaf pages render no empty directory

The current file includes `data-bhd-directory-depth` as a nonvisual QA marker.

## Direct Shopify MAIN verification

After the fixes, direct Shopify Theme file reads confirmed these current live files:

- `snippets/bhd-page-breadcrumbs.liquid`, updated 2026-09-09T17:53:50Z
- `snippets/bhd-page-header.liquid`, updated 2026-09-09T17:50:59Z
- `snippets/bhd-page-dispatch.liquid`, updated 2026-09-09T17:49:54Z
- `snippets/bhd-page-recovery.liquid`, updated 2026-09-09T17:51:24Z
- `snippets/bhd-menu-descendants.liquid`, updated 2026-09-09T17:51:51Z

The live breadcrumb body includes the explicit `recovery-hydration` depth-3 mapping. The live page header passes the Page handle directly. The live Recovery body includes its deployment marker.

Shopify reports:

- theme role: MAIN
- `processing: false`
- `processingFailed: false`

## Browser-fetch limitation

The available external crawler can open the homepage but currently returns a cache miss when asked to fetch `/pages/recovery-hydration` directly. Therefore this audit does not claim an independent crawler screenshot of the corrected Recovery page.

The evidence that is directly verified is the exact active MAIN theme source, current Shopify MAIN menu resource hierarchy, explicit Recovery route mapping, updated live timestamps, and absence of CSS that would hide intermediate breadcrumb nodes.

## Result

The previous runtime menu-discovery approach has been removed for Shopify Page breadcrumbs. Recovery no longer depends on menu traversal to determine its ancestry. Its canonical trail is explicitly and deterministically defined as:

`Home › Solutions › Performance › Recovery`
