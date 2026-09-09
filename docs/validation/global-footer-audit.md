# Global footer audit

Date: 2026-09-09
Scope: footer navigation, newsletter hierarchy, global policy/social/payment footer.

## Findings

The previous footer depended on Shopify Admin menus (`new-menu` and `footer`), so the repository could not guarantee that global footer links matched the canonical Science, Solutions and Connect architecture. The standalone newsletter was also configured with an H1-sized heading on every page, creating poor document hierarchy beneath page-specific H1s.

## Corrections

### Canonical navigation

PASS. Added `sections/bhd-footer-nav.liquid`, which server-renders stable canonical links under three groups:

- Science
- Solutions
- Connect

The footer also provides a direct product CTA and Best Hydrate brand context.

### Admin-menu dependency

PASS. Canonical site navigation is no longer dependent on unknown or stale Admin menu contents. The standard Shopify footer section remains only for policies, social links and payment methods.

### Newsletter hierarchy

PASS. The global newsletter heading is now H2 rather than H1. Copy was rewritten to explain the expected content: hydration science, product updates, partnerships and field notes.

### Responsive structure

PASS theme-side. The canonical footer uses four columns on desktop, retains compact multi-column behavior on tablet, and collapses deliberately on mobile.

### Policy/social/payment surfaces

PASS structurally. Shopify's standard footer retains policy links, social links and payment icons so legal and commerce-generated destinations continue to come from Shopify rather than being hard-coded into the theme.

## Remaining dependency

Live browser/device QA remains part of the final whole-site pass.

## Result

**GLOBAL FOOTER THEME AUDIT: PASS WITH LIVE-BROWSER DEPENDENCY.**
