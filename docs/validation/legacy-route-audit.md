# Legacy route and redirect audit

Date: 2026-09-09

## Safe redirects created in Shopify

Fourteen obsolete or shorthand paths that did not host canonical live content were redirected to the current architecture:

| Legacy path | Canonical target | Status |
|---|---|---|
| `/pages/performance-research` | `/pages/performance-hydration` | PASS |
| `/pages/population-health` | `/pages/healthcare-applications` | PASS |
| `/pages/humanitarian-hydration-research` | `/pages/eco-humanitarian` | PASS |
| `/pages/hydration-solutions` | `/pages/product-details` | PASS |
| `/pages/illness-dehydration` | `/pages/clinical-hydration` | PASS |
| `/pages/emergency-hydration` | `/pages/eco-humanitarian` | PASS |
| `/pages/resource-limited-settings` | `/pages/eco-humanitarian` | PASS |
| `/pages/field-partnerships` | `/pages/humanitarian-partnerships` | PASS |
| `/pages/leadership` | `/pages/our-story` | PASS |
| `/pages/scientific-advisors` | `/pages/our-story` | PASS |
| `/pages/clinical-collaborators` | `/pages/our-story` | PASS |
| `/pages/endurance` | `/pages/endurance-hydration` | PASS |
| `/pages/recovery` | `/pages/recovery-hydration` | PASS |
| `/pages/travel` | `/pages/travel-hydration` | PASS |

All fourteen Shopify `urlRedirectCreate` operations completed with zero user errors.

## Existing published legacy pages deliberately retained for disposition

The Shopify inventory still contains live older objects that may have indexed URLs, inbound links or historical content. They were not deleted, unpublished or overwritten during the safe redirect pass:

- `/pages/learn`
- `/pages/connect`
- `/pages/news-blog`
- `/pages/shop`
- `/pages/best-hydrate-electrolyte-mix`
- `/pages/about` (currently Ingredients, not Meet Us)
- `/pages/dianna-proctor`
- `/pages/athletes-ambassadors`
- `/pages/q-a`

Recommended handling:

- Retain `/pages/dianna-proctor`, `/pages/athletes-ambassadors` and `/pages/q-a` unless a later content audit finds duplication or stale claims.
- Merge or redirect `/pages/learn`, `/pages/connect`, `/pages/news-blog`, `/pages/shop`, `/pages/best-hydrate-electrolyte-mix` and old `/pages/about` only after their useful content and inbound-link value are reviewed.
- Do not create duplicate canonical content merely to preserve an old handle.

## Result

**SAFE LEGACY REDIRECT PASS: PASS.**

Non-destructive redirect continuity is in place for obsolete header routes and temporary shorthand routes. Existing published legacy pages remain intentionally unchanged pending explicit disposition.
