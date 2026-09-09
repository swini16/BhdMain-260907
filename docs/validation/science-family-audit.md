# Science family audit

Date: 2026-09-09
Scope: Runtime canonical Science navigation and its 17 intended content routes.

## Inventory result

- Hydration Science: 4/4 dedicated pages implemented.
- Our Formula: 4/4 dedicated pages implemented.
- Research & Impact: 5/5 dedicated pages implemented.
- Clinical Development: 4/4 dedicated pages implemented.
- Total: **17/17 theme-side Science pages implemented and dispatched.**

## Structural checks

| Check | Result | Notes |
|---|---|---|
| Dedicated content snippet per canonical Science route | PASS | No Science route depends on generic page-body content for its primary experience. |
| Dispatcher coverage | PASS | All 17 current canonical Science handles are explicitly routed through `bhd-page-dispatch.liquid`. |
| Breadcrumb convention | PASS | Shared header supports Home > Science > parent > current page where a parent exists. |
| H1 convention | PASS | Shared page header provides a single visible page H1 for dedicated pages. |
| Stock visual convention | PASS | Each Science page has a contextual hero; substantive pages also use secondary visuals where useful. |
| Cross-link convention | PASS | Parent, sibling, next-step and cross-family links are present contextually. |
| Science references | PASS | Science, medical, performance and regulatory claims use authoritative or peer-reviewed sources rather than unsupported marketing copy. |
| Product/physiology distinction | PASS | Mechanism, formulation rationale, product authorization and product-specific evidence are repeatedly separated. |
| WHO ORS boundary | PASS | Therapeutic WHO ORS is not treated as interchangeable with Best Hydrate or generic electrolyte beverages. |
| NPN boundary | PASS | Canadian NHP authorization is framed around labelled conditions of use, not as blanket proof of every clinical application. |
| Clinical research versus care | PASS | Clinical Development cluster separates research participation, protocol questions and medical care. |
| Study-status discipline | PASS | Accepted, planned, exploratory, active and completed states are not intentionally conflated. |
| Responsive shared CSS | PASS | Dedicated pages use the same desktop/tablet/mobile page system. |
| Generic fallback preservation | PASS | Unsupported/legacy handles still render existing `page.content` instead of being blanked. |
| Shopify Page object verification | PARTIAL | Requires Shopify Admin/store access or direct public-route verification. GitHub theme implementation alone cannot prove object existence. |
| Cross-family link completion | PARTIAL | Links into Solutions and Connect will become fully validated as those families are built. |

## Claim-control findings carried into later families

1. Do not describe Best Hydrate as WHO therapeutic ORS or imply equivalence based on overlapping ingredients.
2. Keep the current formula aligned with the public ingredient list and do not add magnesium unless the actual product changes.
3. Treat “five essential electrolytes” as Best Hydrate product language, with the explanatory caveat already built on its dedicated page.
4. A Natural Product Number supports authorized Canadian sale under labelled conditions of use, not every proposed use case.
5. Academic affiliation and authorship do not equal institutional endorsement.
6. Planned studies and pilots are questions and protocols, not efficacy evidence.
7. High-dose sodium bicarbonate sports research must not be borrowed as a claim for ordinary hydration-formula bicarbonate exposure.
8. Clinical, performance and humanitarian application claims require evidence appropriate to the formulation, population and setting.

## Next family

Proceed to **Solutions**, beginning with Products:

1. Product page audit and enhancement: `/products/lemonade-best-hydrate`
2. Product Details: `/pages/product-details`
3. Directions: `/pages/directions`
4. Then Performance, Everyday Wellness, and Clinical & Humanitarian clusters.

## Final status

**Science family theme/content audit: PASS. Store-object and cross-family route completion: PARTIAL.**
