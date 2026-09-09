# Menu, Admin content and asset-source reconciliation

Date: 2026-09-09

## Scope

This audit covers the Shopify Admin MAIN navigation, storefront header hierarchy, current menu destination Page bodies, nested hover behavior, and the reason Shopify Content > Files does not currently show every image used by the storefront.

## Shopify Admin MAIN navigation

PASS.

Before this pass, Shopify Admin MAIN still exposed the obsolete top-level labels `SHOP`, `LEARN`, and `CONNECT`, while the custom storefront header had already moved to Science, Solutions, Connect and Shop.

The Shopify Admin MAIN menu was rebuilt without deleting any Page objects. It now mirrors the current storefront hierarchy:

- Science
  - Hydration Science
  - Our Formula
  - Research & Impact
  - Clinical Development
- Solutions
  - Products
  - Performance
  - Everyday Wellness
  - Clinical & Humanitarian
- Connect
  - Company & People
  - Partnerships
  - Investor Relations
  - News & Contact
- Shop

Each second-level group contains the corresponding third-level destinations used by the current storefront.

Company & People is ordered:

1. Meet Us
2. About Best Hydrate
3. Jobs & Careers

## Page content inventory

PASS for current MAIN menu Page destinations.

The Shopify Page inventory showed that many canonical Page objects had empty Admin body fields even though the live storefront rendered substantial Liquid content for those routes.

Only Page objects whose body field was literally empty were populated. Existing nonempty body content was preserved.

The added bodies are concise contextual introductions, normally one paragraph, with relevant accessible iconography using markup such as:

`<span role="img" aria-label="Research">🔬</span>`

Where appropriate, copy explicitly states that Best Hydrate is an early-stage company and that more research, events, partnerships, programs or resources will be added as they become ready to share.

The fill pass covered the empty canonical Science, Solutions and Connect Page objects. A post-write Shopify Page inventory confirmed that every current Page destination in MAIN has a nonempty body summary.

Existing populated pages, including Meet Us, About Best Hydrate, Jobs & Careers, FAQ, Athletes & Ambassadors and Dianna Proctor, were not overwritten by the body-fill operation.

Retired unpublished legacy Page objects are outside this requirement and remain preserved for history and redirects.

## Menu interaction

PASS in deployed theme code.

Desktop second-level menu items now open their third-level context on hover.

The close sequence is deliberately staged:

1. deepest hover preview closes after approximately 260 ms
2. unpinned top-level hover preview closes after approximately 520 ms

This provides enough tolerance to move between the second-level trigger and its third-level links while still allowing the menu to unwind naturally when the pointer leaves the full menu context.

Explicit clicks remain stronger than hover previews. Clicking a second-level toggle pins its top-level parent if necessary and converts the nested state into a persistent clicked state, so the hover timeout does not immediately remove it.

Mobile remains click-oriented.

## Shopify Admin menu versus storefront header

PASS for current state.

The Admin MAIN menu and the server-rendered `bhd-header.liquid` hierarchy now contain the same Science, Solutions, Connect and Shop architecture and the same Company & People order.

The earlier mismatch existed because the custom header hierarchy was stored directly in theme code while the Shopify navigation object was a separate older data source. Updating one did not automatically update the other.

Current state is reconciled. Future navigation changes should be treated as an information-architecture change and applied consistently to the Shopify MAIN menu and theme rendering unless the header is later refactored to render the Admin menu as its sole data source.

## Why Content > Files does not equal all storefront images

EXPECTED ARCHITECTURE, not a missing-file error.

Shopify currently has multiple independent asset sources:

1. **Shopify Files**
   - Media uploaded into Content > Files
   - served from the Shopify CDN
   - recent examples include Best Hydrate mobile Daily, Medical and Humanitarian imagery and existing Dianna Proctor media

2. **Theme Assets**
   - files committed inside the Shopify theme `assets` directory
   - referenced through Liquid helpers such as `asset_url`
   - example: the Best Hydrate discuss icon
   - these do not need to appear in Content > Files

3. **External stock imagery**
   - several canonical page snippets directly reference Pexels image URLs
   - example: the About Best Hydrate hero is currently loaded from `images.pexels.com`
   - external images do not become Shopify File objects automatically, so they will not appear in Content > Files

4. **Product media**
   - product images are also attached to product records and should not be assumed to be represented solely by the general Files browsing view

Therefore Content > Files is not currently intended to be a complete visual manifest of every storefront image.

## Asset migration status

OPEN, separate from this menu/content repair.

No broad stock-image migration was performed in this pass. Doing so would change asset sourcing across many already-built pages and should be handled as a controlled asset project:

- inventory external stock URLs
- decide which images should become first-party Shopify Files or theme assets
- upload/import them
- preserve source context and alt text
- replace external references with Shopify CDN or theme-asset references
- validate desktop, tablet and mobile rendering after migration

This avoids confusing a storage migration with a navigation/content repair and avoids overwriting assets that may be changing in parallel.

## Live verification

Direct Shopify Theme API inspection confirmed current deployed versions of the header, staged hover behavior, canonical breadcrumb file and About Best Hydrate content in the MAIN theme.

Direct Shopify Admin queries confirmed:

- MAIN now contains Science, Solutions, Connect and Shop
- Company & People is Meet Us, About Best Hydrate, Jobs & Careers
- current menu Page destinations have nonempty body summaries
- the Shopify Files library contains Shopify-hosted media but does not include externally referenced Pexels imagery by design

## Result

PASS for menu reconciliation, Page content availability and nested menu behavior.

OPEN only for an optional future consolidation of all externally sourced storefront imagery into Shopify-controlled storage.