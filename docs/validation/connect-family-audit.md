# Connect family audit

Date: 2026-09-09
Scope: all canonical Connect pages and surfaces in the current Best Hydrate public-site architecture.

## Canonical inventory

- Meet Us: `/pages/our-story`
- Why Best Hydrate: `/pages/why-best-hydrate`
- Mission & Values: `/pages/mission-values`
- Partnerships: `/pages/partnerships`
- Research Partnerships: `/pages/research-partnerships`
- Retail & Distribution: `/pages/retail-distribution`
- Humanitarian Partnerships: `/pages/humanitarian-partnerships`
- Investor Relations: `/pages/investor-relations`
- Corporate Information: `/pages/corporate-information`
- Investor Contact: `/pages/investor-contact`
- News & Insights: `/blogs/news`
- Press & Media: `/pages/press`
- Events: `/pages/events`
- Contact Us: `/pages/contact`

## Audit findings and corrections

### 1. Meet Us canonical route collision

**Found:** the original planning inventory treated `/pages/about` as Meet Us. Live-store verification showed that `/pages/about` is currently an older Ingredients page, while the actual live Meet Us / Our Story page is `/pages/our-story`.

**Corrected:** the rebuilt Company & People family uses `/pages/our-story` as the canonical Meet Us route. The existing `page.about` template is retained because Shopify template assignment and page handle are separate concepts; it now renders the new Best Hydrate page system above the editable team section. `/pages/about` is moved into legacy-route disposition for the global audit rather than being overwritten accidentally.

### 2. Company-story claim discipline

PASS. Founder-origin language is kept general around a serious health experience. Disease-specific outcomes and unsupported medical benefit claims from older promotional copy are not repeated. Team roles are limited to publicly represented roles and do not imply institutional endorsement.

### 3. Partnership differentiation

PASS. Research, retail/distribution and humanitarian collaboration each have a distinct purpose:

- Research emphasizes question design, methods, ethics, conflicts and publication.
- Retail emphasizes customer, education, operational and channel fit without invented wholesale terms or retailer endorsements.
- Humanitarian emphasizes safe water, local implementation, monitoring and the distinction between the current consumer product and therapeutic WHO/UNICEF ORS.

### 4. Investor-relations boundary

PASS. Public investor pages distinguish current public assets from future plans. They do not publish internal revenue, valuation, cap table, financing target, forecast or pipeline probability. Public corporate, CIPO and publication references are framed as verification points, and the pages include a securities disclaimer.

### 5. News archive and current-claim precedence

PASS. `/blogs/news` remains a dated Shopify article archive. The new hub preserves existing articles, dynamically features the latest post and exposes current tags. The hub and Press page state that dedicated Science and Product pages control current scientific/product positioning when older promotional articles differ.

### 6. Events status discipline

PASS. No tentative appearance is listed as confirmed. Athlete competition coverage is clearly distinguished from Best Hydrate staff attendance, a booth, event sponsorship or an official organizing role unless separately verified.

### 7. Contact routing and privacy

PASS. The live Shopify contact form is preserved. New routing content separates product/order, research, retail, humanitarian, investor, media, events and general inquiries. It discourages sensitive credentials, payment-card data, detailed medical records and confidential third-party information.

### 8. Breadcrumbs and H1 hierarchy

PASS. Connect is rendered as the semantic top-level family label. Real parent pages such as Meet Us, Partnerships, Investor Relations and News & Insights remain clickable in child breadcrumbs. The News hub has one H1 because `main-blog` switches to an H2 for the `news` handle. Contact has one H1 because the native form heading is an H2.

### 9. Cross-link architecture

PASS theme-side. The 14 Connect pages/surfaces cross-link into their parent/sibling pages and into completed Science and Solutions destinations. Existing public athlete route `/pages/dianna-proctor` is used contextually from Press and Events rather than being forced into the primary hierarchy.

### 10. Responsive structure and visuals

PASS theme-side. Company, partnership, investor, press, events and contact pages use the shared responsive Best Hydrate page system with distinct stock visuals. Meet Us combines that system with the existing responsive team-card section. News uses a dedicated responsive blog hero and the native Shopify article grid.

### 11. Shopify object verification

Mixed:

- PASS live object: `/pages/our-story`
- PASS live object: `/blogs/news`
- PASS live object/form: `/pages/contact`
- PARTIAL: newly defined page handles such as Why Best Hydrate, Mission & Values, Partnerships children, Investor Relations children, Press and Events cannot be proven to exist as Shopify Page objects from GitHub theme access alone.

## Remaining global dependencies

1. Normalize the server-rendered header and mobile drawer to the canonical Science, Solutions and Connect architecture.
2. Dispose of legacy routes deliberately, especially `/pages/about`, `/pages/connect`, `/pages/learn` and older header-only routes.
3. Audit footer navigation and policies.
4. Audit article template, product, search, collection/list-collections, cart and 404 surfaces.
5. Run final live browser/device QA once Shopify Page objects are confirmed.

## Result

**CONNECT FAMILY THEME AUDIT: PASS WITH EXTERNAL DEPENDENCIES.**

All 14 canonical Connect pages/surfaces are implemented theme-side and internally normalized. The remaining dependencies are Shopify Page-object existence for new handles, legacy-route disposition, global navigation normalization and final live browser/device QA.
