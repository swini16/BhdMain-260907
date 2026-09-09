# Final responsive and live theme QA

Date: 2026-09-09
Scope: production Shopify MAIN theme, desktop/tablet/mobile responsive architecture, homepage, header, footer, product, canonical content pages and utility surfaces.

## Method

This closeout used two evidence layers:

1. direct Shopify Admin GraphQL inspection of the actual MAIN theme `BhdMain-260907/main`
2. source-level responsive review of the GitHub `main` branch and the live theme files that Shopify reports as active

The available toolset does not provide an arbitrary webpage screenshot/browser viewport capture, so this is not a pixel-screenshot comparison. It is a live-theme deployment, markup, CSS breakpoint, navigation and surface integrity audit.

## Production drift found and corrected

### Header contrast drift

FAIL found, then corrected.

The live `sections/bhd-header-contrast.liquid` was an older 24,694-byte implementation that still rebuilt navigation in JavaScript. GitHub already contained the intended presentation-only version.

Correction:

- forced the canonical presentation-only file through GitHub-to-Shopify sync
- confirmed the MAIN theme updated the file
- removed the obsolete JavaScript menu rebuilding behavior
- retained the canonical Science, Solutions and Connect hierarchy directly in `bhd-header.liquid`

Final state: PASS.

### Very-small-phone header crowding

A source-level crowding risk existed around 320 to 360 px when customer accounts are enabled because Account, Discuss and Cart compete with the centered brand.

Correction added at `max-width:360px`:

- Account icon hidden at this smallest breakpoint
- tagline hidden
- logo reduced to 32 px
- site name reduced to 1.6 rem
- header gaps tightened

Discuss and Cart remain visible.

Final state: PASS.

### Product guide deployment drift

FAIL found, then corrected.

GitHub had a standalone `bhd-product-guide` section and a product-template reference to it, but the Shopify MAIN theme had never ingested that new section file. The live product template therefore omitted the intended guide.

Correction:

- moved the guide into the existing live `disclosures.liquid` product section, which reliably participates in MAIN sync
- preserved native Shopify product title/media/price/variants/quantity/buy buttons/description behavior
- guide now appears after the main product content and before disclosure content
- live MAIN `disclosures.liquid` and `templates/product.json` were directly re-read after sync and confirmed updated
- removed the obsolete standalone product-guide section from GitHub

Guide responsive behavior:

- desktop: 4 cards
- tablet: 2 cards
- mobile: 1 card

Final state: PASS.

## Header

PASS.

Desktop:

- canonical Science, Solutions, Connect and Shop architecture
- four-column mega-menu treatment
- dropdown positioning includes viewport-edge correction
- Discuss, search/account where applicable, and cart actions retained

Tablet / compact desktop:

- 990 to 1180 px typography, spacing and actions compress deliberately
- mega menus remain bounded to the viewport

Mobile:

- below 990 px desktop nav is replaced by the mobile menu
- nested tier controls expose `aria-expanded`
- only one main/tier submenu remains open at a time
- Escape closes open desktop/mobile menu state
- 360 px and below receives the additional crowding hardening noted above

## Homepage hero

PASS by responsive source review and live-file verification.

- 1200 px and above: dedicated desktop hero artwork
- 750 to 1199 px: dedicated tablet composition with Performance/Daily and Medical/Humanitarian slides around the central product/formula card
- below 750 px: dedicated mobile slideshow using portrait assets
- carousel controls have accessible labels
- hero container clips intentional composition overflow
- image dimensions and alt text are supplied

## Homepage supporting sections

PASS.

Hydration markets:

- desktop: 3-column card grid
- tablet: stacked rows with split image/content cards
- mobile: fully stacked cards
- images use controlled aspect ratios/object positioning

Benefits, product story and trust-strip sections use fluid Shopify/page-width behavior without fixed viewport-breaking widths.

## Canonical content pages

PASS.

The shared `bhd-page-system` has explicit responsive states:

- desktop hero and split-content grids
- below 990 px hero/prose/split layouts collapse to one column
- 4-card and related grids become 2 columns on tablet
- below 750 px key points, cards and related content become one column
- wide comparison tables are wrapped in an intentional horizontal-scroll container
- mobile typography, hero media ratios, spacing and radii are reduced deliberately

All 53 live `snippets/bhd-*` files were inventoried directly in Shopify MAIN. The dispatcher and all rebuilt Science, Solutions and Connect content snippets are present.

## Product surface

PASS after correction.

- native Shopify product commerce remains first
- product guide is now live through `disclosures.liquid`
- disclosure content remains intact
- related products remain native and responsive
- product guide links to Product Details, Directions, Our Formula and Hydration Science
- no separate missing-section dependency remains

## Footer and newsletter

PASS.

The actual MAIN theme contains the canonical Best Hydrate footer navigation and footer group:

- desktop: brand plus Science, Solutions and Connect columns
- tablet: compact four-part grid
- mobile: 2-column link layout with brand spanning full width and Connect spanning full width
- separate newsletter section remains responsive
- Shopify policy/social/payment footer remains available without duplicating old content blocks

## Utility surfaces

PASS by live template inspection plus shared responsive wrapper review.

Reviewed:

- article
- search
- collection
- list collections
- cart
- 404

These retain Shopify native main sections while `bhd-header-blog.liquid` adds contextual breadcrumbs, navigation aids and recovery links. The utility strip collapses to one column on mobile; 404 recovery cards collapse from four to two to one column.

## Legacy route/navigation check

PASS in current `main`.

Code search found no active `/pages/about` link and no active `emergency-hydration` route in the rebuilt navigation code. The obsolete menu architecture observed in a public crawler snapshot came from the stale live header-contrast implementation and was removed from MAIN.

Public search/crawler snapshots can lag live theme state, so Shopify MAIN file inspection is the controlling deployment evidence for this audit.

## Result

**LIVE THEME / RESPONSIVE SOURCE QA: PASS.**

Concrete production defects found during this pass were corrected and re-verified in Shopify MAIN.

No remaining structural responsive blocker was found in the reviewed desktop, tablet or mobile source states. Pixel-level device screenshots were not available in the current tool environment, so this record does not claim screenshot-perfect rendering on every physical browser/device combination.
