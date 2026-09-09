# Company, careers and breadcrumb closeout

Date: 2026-09-09

## Nested menu state

PASS.

When a second-level menu node is toggled, its top-level family is now promoted to the pinned open state first if it was previously open only by hover. The top-level toggle receives `aria-expanded="true"` before the child state is applied.

This keeps the visual tree and toggle state consistent on desktop and mobile.

## Company & People hierarchy

PASS.

The visible Company & People branch is now ordered:

1. Company
2. Meet Us
3. Jobs & Careers

Company points to `/pages/mission-values`.
Meet Us points to `/pages/our-story`.
Jobs & Careers points to `/pages/jobs-careers`.

## Company consolidation

PASS.

The former Mission & Values content and useful Why Best Hydrate material have been consolidated into one Company page at `/pages/mission-values`.

The consolidated page includes:

- company origin and why Best Hydrate exists
- mission
- seven operating values
- formula and development logic
- product, science, research and access tracks
- decision standards
- startup-stage context
- links to Meet Us and Jobs & Careers

The Shopify Page object is titled `Company` and remains published.

The old `/pages/why-best-hydrate` Page object was unpublished rather than deleted, preserving its Shopify history. A redirect now sends `/pages/why-best-hydrate` to `/pages/mission-values`.

## Jobs & Careers

PASS.

A new published Shopify Page object exists at `/pages/jobs-careers` using the default page template.

The live theme renders a dedicated Jobs & Careers page with:

- startup-stage hiring context
- future capability areas
- expected working style
- guidance for speculative introductions
- links to Company, Meet Us, Contact, News, Current Research and Partnerships

## Breadcrumbs

PASS.

All tracked Shopify Page routes now use one canonical breadcrumb mapping rather than the former generic `Home › Current Page` treatment.

Example corrected trail:

`Home › Science › Our Formula › Five Essential Electrolytes`

Other families follow the same hierarchy through Science, Solutions and Connect, with the relevant second-level menu node included where applicable.

News and article breadcrumbs are normalized to the Connect hierarchy:

`Home › Connect › News & Contact › News & Insights`

Article pages continue one level deeper to the current article title.

Product and utility surfaces retain their existing contextual breadcrumb treatments.

## Live deployment verification

Direct Shopify MAIN theme inspection confirmed the deployed presence and current versions of:

- `snippets/bhd-page-breadcrumbs.liquid`
- `snippets/bhd-page-header.liquid`
- `snippets/bhd-page-dispatch.liquid`
- `snippets/bhd-page-mission-values.liquid`
- `snippets/bhd-page-jobs-careers.liquid`
- `sections/bhd-header-contrast.liquid`

The dispatcher and consolidated Company page required explicit sync-marker commits because Shopify initially retained older live checksums. Both were rechecked after republishing and are current in MAIN.

## Result

PASS.

The nested menu toggle state, Company & People information architecture, Company consolidation, Jobs & Careers page and tracked breadcrumb hierarchy are now aligned in the live Shopify MAIN theme.