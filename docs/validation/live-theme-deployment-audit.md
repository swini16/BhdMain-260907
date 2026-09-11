# Live theme deployment audit

Date: 2026-09-11
Theme: `BhdMain-260907/main`
Shopify theme role: `MAIN`

## Purpose

Repository state and Shopify content-object state are not enough by themselves to prove that the public MAIN theme contains the rebuilt files. This audit records the active Shopify template entry points and the current deployed implementation.

## MAIN theme identity

PASS.

Shopify reports `BhdMain-260907/main` as the live `MAIN` theme. It is not processing and has not reported a processing failure.

## Header deployment

PASS.

Direct live-theme file inspection confirms the current Best Hydrate header architecture is deployed, with Shopify Admin MAIN as the navigation source through the current menu adapter and the canonical Science / Solutions / Connect structure.

## Footer deployment

PASS.

Direct live-theme file inspection confirms `sections/bhd-footer-nav.liquid` is present in MAIN with the canonical Science / Solutions / Connect footer architecture.

## Dispatcher deployment

PASS.

Direct live-theme file inspection confirms `snippets/bhd-page-dispatch.liquid` contains the current Page handle map, including FAQ, Athletes & Ambassadors, Dianna Proctor and the rebuilt Science, Solutions and Connect content surfaces.

## Active default Page renderer

PASS after September 9 correction.

The active Shopify MAIN `templates/page.json` currently invokes:

`sections/bhd-page-system.liquid`

An earlier audit recorded `main-page.liquid` as the active default renderer. That became stale after Shopify's editor-owned `page.json` changed to `bhd-page-system`. The stale record contributed to later breadcrumb debugging checking the correct helper snippets but the wrong template entry point.

A direct live read on September 9 found that Shopify MAIN still held an obsolete 22 KB copy of `bhd-page-system.liquid`. That old section only fully supported Hydration Science and sent other Pages through a generic fallback with `Home › page title` breadcrumbs.

The active `bhd-page-system.liquid` was then forcibly republished from the current GitHub implementation.

Current direct Shopify MAIN verification shows:

- `templates/page.json` → section type `bhd-page-system`
- `sections/bhd-page-system.liquid` updated `2026-09-09T18:01:09Z`
- checksum `2ed549b4c3204e8d3a05251298e07de0`
- live section contains `data-bhd-page-system="dispatcher-v2"`
- live section directly renders `bhd-page-dispatch`
- obsolete inline `bhd_supported` renderer is absent
- obsolete generic breadcrumb fallback is absent from the active section

The active Page chain is now:

`templates/page.json`

→ `sections/bhd-page-system.liquid`

→ `snippets/bhd-page-dispatch.liquid`

→ page-specific snippet

→ shared page header and breadcrumb components where applicable

`sections/main-page.liquid` still exists in MAIN as a dispatcher-based implementation but is not the active default Page entry point at this time.

## Breadcrumb deployment

PASS at active-file level.

Direct Shopify MAIN inspection confirms:

- deterministic Page breadcrumb map is live
- Page handle is derived from the `/pages/...` request route with explicit handle fallback
- Recovery is explicitly mapped as `Home › Solutions › Performance › Recovery`
- shared page header passes the Shopify Page handle
- Recovery renderer is current and contains its deployment marker

The external crawler currently returns a cache miss for the Recovery URL, so this audit does not claim an independent current-browser HTML fetch. The directly verified evidence is the actual active MAIN template chain and exact live bodies it invokes.

## Parent-page directories

PASS at active-file level.

The live `bhd-menu-descendants.liquid` derives parent-page child and grandchild navigation from Shopify Admin MAIN. Level-1 and level-2 parent pages expose their descendants through clickable on-page navigation, while leaf pages render no empty directory.

## Retained secondary pages

PASS.

The retained secondary-page snippets remain present in MAIN:

- `snippets/bhd-page-faq.liquid`
- `snippets/bhd-page-athletes-ambassadors.liquid`
- `snippets/bhd-page-dianna-proctor.liquid`

Their Shopify Page objects remain published and are reached through the active `bhd-page-system` → dispatcher chain.

## Homepage hero asset migration

PASS on September 11.

All homepage hero image references controlled by `sections/bhd-hero-v4.liquid` were migrated away from SharePoint and raw GitHub hosting to Shopify Files/CDN. Repository search after the migration returns no remaining `sharepoint.com`, `pexels.com`, or `raw.githubusercontent.com` references associated with the migrated website assets.

The desktop hero, four tablet hero panels and mobile Performance hero now use Shopify CDN URLs. The other three mobile hero panels were already on Shopify CDN and were retained.

## Careers job board

PASS on September 11.

The published Shopify Page exists as:

- title: `Jobs & Careers`
- handle: `jobs-careers`
- published: `2026-09-09T15:46:23Z`

A Shopify metaobject definition now exists for admin-managed postings:

- name: `Job Opening`
- type: `job_opening`
- display name field: `title`
- Storefront access: `PUBLIC_READ`
- current entries: `0`

`snippets/bhd-page-jobs-careers.liquid` reads `shop.metaobjects.job_opening.values`, displays only entries with `is_open = true`, and preserves the no-openings fallback when there are no active postings.

GitHub-to-Shopify propagation for this change is directly verified by timestamps:

- GitHub commit `8ee5510474df03acc1ce1bcd59db09f6b2fe4e4f` created `2026-09-11T19:32:21Z`
- Shopify MAIN `snippets/bhd-page-jobs-careers.liquid` updated `2026-09-11T19:32:26Z`
- Shopify MAIN checksum: `7bbd07a43d6e5399a922f9d6f4d4e0fd`
- Shopify MAIN file size: `7337` bytes

The five-second sequence is direct evidence that the careers commit propagated from GitHub to the live MAIN theme.

## Result

**LIVE THEME FILE DEPLOYMENT: PASS AT ACTIVE ENTRY-POINT LEVEL.**

The Page renderer record reflects the actual active Shopify template. GitHub-to-Shopify synchronization is directly verified for the active page system, dispatcher, breadcrumb component, Recovery renderer, parent-directory component, homepage hero asset migration and the Shopify-admin-managed Careers renderer.

Visual browser confirmation remains a separate QA layer when a fresh browser fetch is available.