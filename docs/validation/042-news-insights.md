# 042 - News & Insights

Route: `/blogs/news`
Family: Connect > News & Insights

| Check | Status | Notes |
|---|---|---|
| Live blog object | PASS | Public News blog and existing 2026 article archive verified. |
| Dedicated hub intro | PASS | News-only Best Hydrate blog intro section adds breadcrumbs, one H1, latest-article feature and dynamic tag navigation. |
| H1 control | PASS | `main-blog` switches to H2 `Latest articles` for the `news` handle, avoiding duplicate H1. Other future blogs retain their normal H1. |
| Existing archive preserved | PASS | Existing Shopify articles remain the source of article cards and pagination. |
| Latest article | PASS | Hero pulls `blog.articles.first` dynamically rather than hard-coding a stale story. |
| Topic navigation | PASS | Up to ten current Shopify tags render dynamically plus an All link. |
| Claim-age boundary | PASS | Intro states that rebuilt Science/Product pages control current scientific and product positioning when older articles differ. |
| Cross-links | PASS | Hydration Science and Press & Media linked from hub. |
| Responsive structure | PASS | Custom intro collapses cleanly to single-column tablet/mobile layouts. |

Overall: **PASS theme-side; live blog object and archive verified. Final browser visual QA remains in the whole-site pass.**
