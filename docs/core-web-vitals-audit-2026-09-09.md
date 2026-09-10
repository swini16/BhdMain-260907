# Core Web Vitals Audit — Best Hydrate

**Date:** 2026-09-09  
**Scope:** Shopify theme, excluding homepage hero optimization/migration by explicit request.  
**Baseline commit:** `8f8489584272c27af9e040c5f0e78700ccc1c0a1`

## Measurement limitation

Real-user Chrome UX / Search Console Core Web Vitals data could not be retrieved because the connected Google Search Console account does not currently expose a `besthydrate.com` property. Therefore this is a **code + live-markup audit**, not a claim that field p75 LCP/INP/CLS already passes.

Targets once field data is available:
- LCP: ≤ 2.5 s
- INP: ≤ 200 ms
- CLS: ≤ 0.1

## Findings

### CLS — strong non-hero baseline

- Homepage market images already had explicit `width` + `height` and stable media aspect ratios.
- Homepage product-story visual already reserves substantial layout space and Shopify image output provides intrinsic dimensions.
- Header has explicit desktop/mobile minimum heights and explicit logo/icon dimensions.
- Press/content images inspected use explicit dimensions.
- No major non-hero layout-shift hazard was found in the inspected custom homepage/header components.

### INP — generally good, small header improvement made

Already good:
- Global Dawn-style JS is loaded with `defer`.
- Predictive search and cart drawer JS are deferred.
- Sticky-header scroll listener was already passive and requestAnimationFrame-gated.

Improved:
- Sticky-header code now caches the header node instead of querying it on every scroll update.
- Header height is measured outside the scroll decision loop and re-measured only on responsive resize/media-query change.
- Persistent `will-change: transform` was narrowed to active header motion states.
- Resize measurement is requestAnimationFrame-gated.

Commit: `d5dfd62572b1072f006b2910b6bb94772d66fea4`

### LCP / loading priority — non-hero improvements made

Homepage below-fold market imagery:
- retained `loading="lazy"`
- added `decoding="async"`
- added `fetchpriority="low"`

Commit: `8c10d09274a8b1b86294b0d054c072bcdb3dc464`

Homepage below-fold product story image:
- retained responsive Shopify `srcset`/`sizes`
- retained lazy loading
- added asynchronous decoding + low fetch priority

Commit: `69df0cb04f8a057bae59ddef41e4329287f38dc4`

Blog/article cards:
- added asynchronous image decoding
- lazy cards now explicitly use low fetch priority
- cards intentionally rendered eager are **not** forced to low priority

Commit: `c26d62ab866a7211ac23782f272708851adf31c1`

**Deployment verification note:** GitHub `main` contains these article-card attributes, but Shopify MAIN still returned the previous `article-card.liquid` body during immediate verification. A force-sync commit (`2fe30a48ac085438b9a7fff8c76f6489e9a929e4`) was made, but the Shopify file had still not refreshed on the immediate re-check. Treat this one minor optimization as **repo-ready, not yet verified live**.

Press-page below-fold interview image:
- retained dimensions + lazy loading + async decoding
- added low fetch priority while updating the press page

Commit: `c98fcb7fb8e5080bcebc7c8c2135caab4edbc94d`

## Shopify MAIN verification

The connected live Shopify theme is `BhdMain-260907/main` and reported healthy (`processing=false`, `processingFailed=false`). Shopify MAIN reflected the updated header-scroll, markets, product-story and press files during this pass. The article-card exception is documented above.

## Existing good practices confirmed

- Body and heading fonts are two different fonts, so both existing font preloads are legitimate; they were left intact.
- `font-display: swap` is already configured.
- Predictive-search CSS is loaded non-blocking (`media="print"` + onload swap).
- Cart-items CSS is loaded non-blocking.
- Most global JS uses `defer`.
- Homepage below-fold images already reserve geometry.
- Responsive Shopify image widths/sizes are used in the product-story section.

## Remaining non-hero candidate — do only after lab/field validation

`layout/theme.liquid` still loads several cart-drawer stylesheets synchronously when the drawer is enabled:
- `component-cart-drawer.css`
- `component-cart.css`
- `component-totals.css`
- `component-price.css`
- `component-discounts.css`

These are a possible render-blocking reduction opportunity, but were **not** converted blindly because cart/header paint correctness matters and there is no current PSI/CrUX evidence showing they are a meaningful bottleneck. Test before altering.

## Explicitly deferred: hero

Not touched in this pass:
- homepage desktop/tablet hero external SharePoint/raw-GitHub imagery
- hero LCP image migration to Shopify CDN
- large inlined mobile hero snippets / hero HTML weight
- hero preload/fetch-priority strategy

These are likely to dominate the remaining homepage LCP opportunity and should be a separate controlled pass, as requested.

## Verification checklist when GSC / CrUX becomes available

1. Measure PHONE and DESKTOP separately.
2. Check homepage plus `/pages/publications`, `/pages/press`, `/pages/hydration-science`, product page and blog index.
3. Diagnose the p75 failing metric, not Lighthouse score alone.
4. If LCP fails, do the dedicated hero pass first.
5. If INP fails, profile third-party/app scripts and long tasks before deleting standard theme behavior.
6. If CLS fails, identify the actual shifting node in DevTools rather than guessing.

## Conclusion

Outside the intentionally deferred hero, the inspected custom theme code already had a reasonably strong CWV baseline. This pass applied the highest-confidence, lowest-risk non-hero improvements found. The next meaningful CWV decision should be driven by actual field/lab measurements, with hero work expected to be the major remaining homepage performance project.
