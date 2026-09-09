# Live theme deployment audit

Date: 2026-09-09
Theme: `BhdMain-260907/main`
Shopify theme role: `MAIN`

## Purpose

Repository state and Shopify content-object state are not enough by themselves to prove that the public MAIN theme contains the rebuilt files. This audit directly queried Shopify's live theme file API and compared the active theme architecture with the GitHub implementation.

## MAIN theme identity

PASS.

Shopify reports `BhdMain-260907/main` as the live `MAIN` theme. It is not processing and has not reported a processing failure.

## Header deployment

PASS.

Direct live-theme file inspection confirmed `sections/bhd-header.liquid` contains the September 9 canonical server-rendered Science / Solutions / Connect architecture, including `/pages/our-story` and the current product route.

## Footer deployment

PASS.

Direct live-theme file inspection confirmed the new `sections/bhd-footer-nav.liquid` exists in MAIN with the canonical Science / Solutions / Connect footer architecture.

## Dispatcher deployment

PASS.

Direct live-theme file inspection confirmed `snippets/bhd-page-dispatch.liquid` contains the current handle map, including FAQ, Athletes & Ambassadors and Dianna Proctor.

## Default page-template drift found and corrected

The live `templates/page.json` remained Shopify's stock `main-page` template even while GitHub's copy briefly pointed to `bhd-page-system`. Rather than rely on an editor-owned JSON template that was not accepting GitHub changes consistently, the architecture was made robust at the section layer.

`sections/main-page.liquid`, which the live stock `page.json` already invokes, was rebuilt to:

- render `bhd-page-dispatch`
- provide the complete shared Best Hydrate page styling
- preserve a dispatcher fallback for unsupported pages
- support responsive desktop/tablet/mobile layouts

Direct live-theme file inspection confirmed the upgraded `main-page.liquid` is present in MAIN with an update timestamp on September 9, 2026.

The temporary alternative `page.bhd.json` / `bhd-page-system-live` experiment was removed from GitHub after the stable `main-page` route was proven. GitHub `page.json` was realigned to the same stock `main-page` architecture used by Shopify.

## Retained secondary pages

PASS.

Direct live-theme file inspection confirmed all three new retained-page snippets are present in MAIN:

- `snippets/bhd-page-faq.liquid`
- `snippets/bhd-page-athletes-ambassadors.liquid`
- `snippets/bhd-page-dianna-proctor.liquid`

Their Shopify Page objects are published and assigned to the default page template, which now reaches the dispatcher through live `main-page.liquid`.

## Result

**LIVE THEME FILE DEPLOYMENT: PASS.**

GitHub-to-Shopify synchronization is proven at the file level for the critical header, footer, dispatcher, page renderer and retained secondary-page snippets. Public web-search crawlers may continue to show cached pre-rebuild HTML until they recrawl the store, so crawler snapshots are not used as the source of truth for deployment status.

Remaining QA is visual/interactive browser testing at target breakpoints, plus externally managed AVADA sitemap cleanup and the open duplicate-product catalog decision.
