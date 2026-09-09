# Global header audit

Date: 2026-09-09
Scope: primary desktop navigation, mobile navigation, no-JavaScript navigation, menu enhancement layer, canonical route consistency.

## Finding

The previous header had two competing architectures. `bhd-header.liquid` server-rendered older routes and labels, while `bhd-header-contrast.liquid` rebuilt much of the menu after JavaScript loaded. Normal browsers therefore often showed a newer menu than crawlers, no-JavaScript clients and the original HTML source.

## Corrections

### 1. Canonical hierarchy is server-rendered

PASS. `bhd-header.liquid` now directly renders the current three-family architecture:

- Science
- Solutions
- Connect

The same canonical hierarchy exists in desktop and mobile markup before JavaScript executes.

### 2. Deprecated header targets removed

PASS. The source header no longer links to the superseded navigation targets that were previously exposed, including:

- `/pages/performance-research`
- `/pages/population-health`
- `/pages/humanitarian-hydration-research`
- `/pages/hydration-solutions`
- `/pages/illness-dehydration`
- `/pages/emergency-hydration`
- `/pages/resource-limited-settings`
- `/pages/field-partnerships`

Those concepts now resolve through the canonical Science and Solutions pages rather than duplicate thin navigation destinations.

### 3. Meet Us route normalized

PASS. Connect and Meet Us now use `/pages/our-story`, which is the verified live Shopify object. `/pages/about` is not used by the canonical header because it is a separate legacy Ingredients page.

### 4. Solutions family root semantics

PASS. No fake `/pages/solutions` route was created. The top-level Solutions link goes to `/pages/product-details`, while the dropdown exposes the actual Product, Performance, Everyday Wellness and Clinical/Humanitarian hubs.

### 5. Client-side reconstruction removed

PASS. `bhd-header-contrast.liquid` is now presentation-only. It no longer renames navigation items, injects a second route architecture or rebuilds menus after load.

JavaScript in the primary header is limited to interaction behavior: opening and closing menus, tier-two expansion, Escape handling, outside-click closing and viewport positioning.

### 6. No-JavaScript path

PASS. A compact `<noscript>` navigation exposes canonical Science, Formula, Research, Solutions, Performance, Everyday, Clinical, Humanitarian, Meet Us, Partnerships, Investor, News, Contact and Shop destinations.

### 7. Commerce and discussion paths

PASS. Shop points directly to the primary Best Hydrate product. Discuss points to `/blogs/news` and remains compatible with the contextual blog-label enhancement section.

### 8. Accessibility structure

PASS theme-side. Navigation regions are labelled, menu toggles expose `aria-expanded`, submenu controls are buttons rather than fake links, and Escape closes open menus.

## Source validation

PASS. Post-implementation source checks confirmed that `/pages/performance-research`, `/pages/hydration-solutions` and `/pages/about` are absent from the canonical header, while `/pages/our-story` appears in mobile, desktop and no-JavaScript navigation.

## Remaining dependencies

- Live browser QA at desktop, tablet and mobile breakpoints remains part of final whole-site validation.
- Existing legacy Shopify Page objects and URL redirects are a separate legacy-route cleanup task. Removing obsolete links from the theme does not itself create HTTP redirects in Shopify Admin.

## Result

**GLOBAL HEADER THEME AUDIT: PASS WITH LIVE-BROWSER AND SHOPIFY-REDIRECT DEPENDENCIES.**

The navigation architecture is now defined once in server-rendered HTML and progressively enhanced for interaction, rather than replaced by JavaScript after page load.
