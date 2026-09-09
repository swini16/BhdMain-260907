# Breadcrumb deep audit

Date: 2026-09-09

## Why this audit exists

Earlier breadcrumb checks were marked PASS even though storefront screenshots subsequently showed trails such as `Home › Recovery`. Those PASS statements were incorrect because they verified menu data and breadcrumb helper files without proving that the active Shopify Page template actually invoked those helpers.

This audit traces the complete active render chain and records the actual root cause.

## Actual root cause

The decisive finding was in the active Shopify MAIN Page template.

Live `templates/page.json` points to:

`sections/bhd-page-system.liquid`

The live copy of `bhd-page-system.liquid` was stale. It was a 22 KB inline renderer from an earlier build that only marked `hydration-science` as supported. Every other Page, including Recovery, fell into this hard-coded fallback:

`Home › {{ page.title }}`

That exactly explains the screenshot showing:

`Home › Recovery`

The newer dispatcher, shared page header and breadcrumb snippets were all present in MAIN, but the active Page template was bypassing them. This is why several previous fixes looked correct in source inspection yet had no effect on the rendered Recovery page.

## Active renderer correction

GitHub already contained the intended dispatcher-based `sections/bhd-page-system.liquid`.

That section was materially changed and republished so Shopify would ingest it instead of retaining the stale copy.

Direct Shopify MAIN verification now shows:

- live `templates/page.json` still intentionally points to `bhd-page-system`
- live `sections/bhd-page-system.liquid` updated at `2026-09-09T18:01:09Z`
- current checksum: `2ed549b4c3204e8d3a05251298e07de0`
- current size: `12091`
- current markup contains `data-bhd-page-system="dispatcher-v2"`
- current body directly renders `{% render 'bhd-page-dispatch' %}`
- the obsolete `bhd_supported` one-page logic is gone
- the obsolete built-in `Home › page title` fallback is gone

The active Page render chain is therefore now:

`templates/page.json`

→ `sections/bhd-page-system.liquid`

→ `snippets/bhd-page-dispatch.liquid`

→ page-specific content snippet

→ `snippets/bhd-page-header.liquid`

→ `snippets/bhd-page-breadcrumbs.liquid`

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

`snippets/bhd-page-breadcrumbs.liquid` does not depend on runtime linklist traversal for Shopify Page hierarchy.

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

The output exposes nonvisual QA attributes:

- `data-bhd-breadcrumb-handle`
- `data-bhd-breadcrumb-depth`

## Coverage

The deterministic map contains 57 Page handles:

- 55 Page nodes represented in MAIN
- Athletes & Ambassadors as a logical secondary page under Connect › Company & People
- Dianna Proctor as a logical secondary page under Connect › Company & People

Representative expected trails:

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

Structural validation of the map confirmed:

- 57 unique mapped handles
- 55 MAIN Page entries plus 2 secondary entries
- every depth-2 and depth-3 entry has a defined parent route
- Recovery resolves exactly to `Home › Solutions › Performance › Recovery`

## Exact Recovery render chain

Recovery now traverses the active dispatcher path:

`page.handle = recovery-hydration`

→ `snippets/bhd-page-dispatch.liquid`

→ `snippets/bhd-page-recovery.liquid`

→ `snippets/bhd-page-header.liquid`

→ `snippets/bhd-page-breadcrumbs.liquid`

The shared page header explicitly passes `page.handle` to the breadcrumb component. The breadcrumb component independently derives `recovery-hydration` from `request.path` as an additional safeguard.

The Recovery content carries `data-bhd-page="recovery-hydration"` as a nonvisual deployment marker.

## Parent-page directories

`snippets/bhd-menu-descendants.liquid` was also forcibly republished after an older live copy was discovered.

Parent pages derive their child and grandchild directory cards from Shopify Admin MAIN:

- level-1 pages show level-2 children and level-3 descendants
- level-2 pages show their level-3 children
- leaf pages render no empty directory

The current file includes `data-bhd-directory-depth` as a nonvisual QA marker.

## CSS check

The active dispatcher-based page system renders `.bhd-breadcrumbs` as a wrapping flex row. Tablet and mobile rules reduce spacing and type size but do not hide intermediate breadcrumb nodes.

Therefore the prior `Home › Recovery` screenshot was not caused by responsive CSS. It came from the stale active renderer's hard-coded fallback.

## Direct Shopify MAIN verification

Direct Shopify Theme file reads after the final active-renderer correction confirm:

- `sections/bhd-page-system.liquid`, updated `2026-09-09T18:01:09Z`
- `snippets/bhd-page-breadcrumbs.liquid`, updated `2026-09-09T17:53:50Z`
- `snippets/bhd-page-header.liquid`, updated `2026-09-09T17:50:59Z`
- `snippets/bhd-page-dispatch.liquid`, updated `2026-09-09T17:49:54Z`
- `snippets/bhd-page-recovery.liquid`, updated `2026-09-09T17:51:24Z`
- `snippets/bhd-menu-descendants.liquid`, updated `2026-09-09T17:51:51Z`

The live breadcrumb body contains the explicit `recovery-hydration` depth-3 mapping. The live Recovery body contains its deployment marker. The active page-system body now invokes the dispatcher rather than the old fallback.

Shopify reports:

- theme role: MAIN
- `processing: false`
- `processingFailed: false`

## Browser-fetch limitation

The external crawler currently returns a cache miss for `/pages/recovery-hydration`, so this audit does not claim an independent fresh crawler screenshot of the corrected rendered page.

The directly verified evidence is the actual active Shopify MAIN template entry point, the current live section body it invokes, the complete dispatcher chain, the deterministic Recovery mapping, and the absence of CSS that would hide breadcrumb parents.

## Result

The actual active renderer that produced `Home › Recovery` has been replaced.

The current MAIN Page render chain now reaches the deterministic breadcrumb map, where Recovery is explicitly defined as:

`Home › Solutions › Performance › Recovery`
