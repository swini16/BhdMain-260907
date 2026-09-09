# Best Hydrate public site inventory

Last audited: 2026-09-09
Branch: `main`

## Purpose

This inventory is the working control document for the Best Hydrate public website rebuild. It distinguishes the intended navigation architecture from what the theme can currently render, identifies claim-sensitive pages, and records validation requirements page by page.

## Global findings

- The homepage is custom and substantially developed.
- The default Shopify page template is still only the stock `main-page` section, so most ordinary pages have no Best Hydrate-specific structure, breadcrumbs, related links, visual system, or conversion layer.
- `page.about.json` is a custom Meet Us page and `page.contact.json` is a stock page plus contact form.
- The header enhancement script defines the intended current navigation at runtime, but the server-rendered base header still contains older labels and several older/orphan routes. This creates a no-JavaScript and SEO consistency issue that must be corrected during the global navigation audit.
- Search engines currently expose older public pages such as `/pages/learn` and `/pages/connect`, plus `/pages/dianna-proctor`, `/pages/contact`, `/blogs/news`, and the product. These legacy public pages need deliberate redirect, retention, or integration decisions rather than accidental duplication.
- Page existence in Shopify Admin cannot be proven from the GitHub theme alone. Theme-side content can be prepared for every intended handle. Missing Shopify Page objects must then be created or confirmed in Shopify Admin.

## Content standards for every substantive page

Each substantive page should include, where appropriate:

1. Breadcrumbs: Home > primary family > parent page > current page.
2. Clear H1 and one-sentence page promise.
3. Contextual hero visual, preferably natural stock photography or a restrained scientific illustration.
4. Scannable sections with meaningful H2/H3 hierarchy.
5. Plain-language explanation before technical detail.
6. Evidence/claim discipline, especially for medical, physiological, clinical, or performance claims.
7. Contextual cross-links to parent, sibling, and next-step pages.
8. Product CTA only where contextually useful, not on every screen.
9. Related content rail or cards near the bottom.
10. Source/reference block on science-heavy pages where external claims are made.
11. Accessibility: descriptive alt text, sufficient contrast, keyboard-safe links, no text embedded in decorative imagery when avoidable.
12. SEO basics: descriptive title/H1 relationship, concise intro, internal links, one canonical topic per page, no duplicate thin pages.

## Intended current navigation inventory

### SCIENCE

#### Hydration Science

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/hydration-science` | Science landing page | High | High | Default page only | Parent hub, breadcrumb, science overview, links to three child pages |
| `/pages/how-hydration-works` | Physiology explainer | High | High | Default page only | Fluid balance, absorption, compartments, practical summary |
| `/pages/electrolytes` | Electrolyte explainer | High | High | Default page only | Sodium, potassium, chloride, bicarbonate, roles and limits |
| `/pages/glucose-water-absorption` | SGLT / absorption explainer | High | Very high | Default page only | Accurate glucose-sodium-water mechanism with citations and careful wording |

#### Our Formula

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/our-formula` | Formula landing page | High | High | Default page only | Formula philosophy, ingredients, product relationship |
| `/pages/five-essential-electrolytes` | Formula component explainer | High | High | Default page only | Explain Na, K, Cl, HCO3 plus formula context without inventing magnesium |
| `/pages/ingredient-rationale` | Ingredient-by-ingredient rationale | High | High | Default page only | Why each listed ingredient is present, taste/function separation |
| `/pages/why-bicarbonate` | Bicarbonate differentiator | High | Very high | Default page only | Acid-base context, hydration relevance, conservative claims |

#### Research & Impact

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/research-publications` | Research hub | High | Very high | Default page only | Publications, active research, partners, impact pathways |
| `/pages/publications` | Publication list | High | Very high | Default page only | Verified publication metadata only, links/DOIs where known |
| `/pages/current-research` | Active research portfolio | High | Very high | Default page only | Clearly label planned, underway, completed, published |
| `/pages/research-partners` | Scientific collaboration page | Medium-high | High | Default page only | Verified institutions/collaborators only |
| `/pages/research-impact` | Translation/impact page | Medium-high | High | Default page only | Performance, medical, humanitarian impact without overstating outcomes |

#### Clinical Development

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/clinical-development` | Clinical development hub | High | Very high | Default page only | Development pathway, evidence standards, research vs care distinction |
| `/pages/clinical-program` | Clinical program | High | Very high | Default page only | Program objectives, status, endpoints, governance language |
| `/pages/pilot-studies` | Pilot study portfolio | High | Very high | Default page only | Study design/status, no implied results before results exist |
| `/pages/healthcare-applications` | Healthcare use contexts | High | Very high | Default page only | Use cases framed as applications/research areas, not treatment claims |

### SOLUTIONS

#### Products

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/products/lemonade-best-hydrate` | Primary commerce page | High | High | Product template exists | Accurate formula, directions, claims, conversion, FAQ, science links |
| `/pages/product-details` | Product detail explainer | Medium-high | High | Default page only | What it is, format, servings, positioning, links to shop/formula |
| `/pages/directions` | Directions/use page | Medium | High | Default page only | Label-consistent preparation and use, clear caution language |

#### Performance

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/performance-hydration` | Performance landing page | High | High | Default page only | Training, competition, heat, recovery, personalized hydration framing |
| `/pages/endurance-hydration` | Endurance use case | High | Very high | Default page only | Sweat/fluid strategy, sodium/carbohydrate context, avoid universal dosing |
| `/pages/heat-high-sweat` | Heat and high-sweat use case | High | Very high | Default page only | Heat stress, sweat losses, individualization, safety escalation |
| `/pages/recovery-hydration` | Recovery use case | Medium-high | High | Default page only | Rehydration as part of recovery, food/fluid context, no exaggerated recovery claims |

#### Everyday Wellness

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/everyday-wellness` | Everyday landing page | Medium-high | Medium | Default page only | Work, travel, active living, simple habits |
| `/pages/work-long-shifts` | Work/long shift use case | Medium | Medium | Default page only | Heat, physical work, access, routine, practical cues |
| `/pages/travel-hydration` | Travel use case | Medium | Medium | Default page only | Flights, heat, schedule disruption, practical hydration routine |
| `/pages/active-living` | General active living | Medium | Medium | Default page only | Recreation, outdoor activity, daily movement |

#### Clinical & Humanitarian

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/clinical-hydration` | Clinical hydration landing page | High | Very high | Default page only | Clinical oral hydration positioning without implying universal clinical adoption |
| `/pages/recovery-rehabilitation` | Recovery/rehabilitation context | High | Very high | Default page only | Hydration role in supportive care, clinician guidance |
| `/pages/active-aging` | Active aging context | Medium-high | Very high | Default page only | Older-adult hydration considerations, cautious clinical framing |
| `/pages/eco-humanitarian` | Humanitarian hydration landing page | High | High | Default page only | ORS access, implementation, partnerships, sustainable delivery |

### CONNECT

#### Company & People

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/about` | Meet Us / company people | High | Low | Custom `page.about` template exists | Breadcrumbs, fuller team context, leadership anchor, cross-links |
| `/pages/why-best-hydrate` | Company story | High | Low | Default page only | Origin, problem, development journey, present focus |
| `/pages/mission-values` | Mission and values | Medium-high | Low | Default page only | Science-first, people-first, practical access, transparency |

#### Partnerships

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/partnerships` | Partnership hub | High | Medium | Default page only | Research, retail/distribution, humanitarian partner pathways |
| `/pages/research-partnerships` | Research partnerships | Medium-high | High | Default page only | Collaboration models and verified examples |
| `/pages/retail-distribution` | Retail/distribution partnerships | Medium-high | Low | Default page only | Wholesale fit, retailer benefits, contact CTA |
| `/pages/humanitarian-partnerships` | Humanitarian partnerships | Medium-high | High | Default page only | Pilot/project collaboration and implementation principles |

#### Investor Relations

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/investor-relations` | Investor landing page | High | High | Default page only | Company thesis, stage, opportunity, contact, appropriate disclaimer |
| `/pages/corporate-information` | Corporate facts | Medium | Medium | Default page only | Entity facts and governance information that can be publicly verified |
| `/pages/investor-contact` | Investor contact | Low-medium | Low | Default page only | Focused investor inquiry CTA, privacy expectations |

#### News & Contact

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/blogs/news` | Blog/news hub | High/ongoing | Varies | Shopify blog template exists | Breadcrumbs, categories/tags, featured stories, article consistency |
| `/pages/press` | Press/media page | Medium | Medium | Default page only | Press contact, downloadable facts, verified coverage only |
| `/pages/events` | Events page | Medium | Medium | Default page only | Upcoming/past events separated and dated |
| `/pages/contact` | General contact | Medium | Low | Custom contact template exists | Breadcrumbs, routing by inquiry type, contact form |

## Legacy/currently discoverable pages requiring disposition

These pages are visible in public search results or older navigation and should not be ignored during the rebuild:

| Route | Current role | Recommended disposition |
|---|---|---|
| `/pages/learn` | Older learning hub | Retain temporarily, then redirect or reshape as an index into Science once canonical child pages are complete |
| `/pages/connect` | Older connect hub | Retain temporarily, then redirect or reshape to the current Connect architecture |
| `/pages/dianna-proctor` | Athlete ambassador profile | Retain and improve; link contextually from Performance and News rather than forcing it into primary navigation |

## Server-rendered header routes that differ from runtime architecture

The base header still exposes older links to crawlers/no-JS clients. These need normalization to the canonical architecture after the page set is established:

- `/pages/performance-research`
- `/pages/population-health`
- `/pages/humanitarian-hydration-research`
- `/pages/hydration-solutions`
- `/pages/illness-dehydration`
- `/pages/emergency-hydration`
- `/pages/resource-limited-settings`
- `/pages/field-partnerships`
- `/pages/leadership`
- `/pages/scientific-advisors`
- `/pages/clinical-collaborators`
- additional older contact subroutes if present

Disposition rule: merge useful concepts into canonical pages, then update the server-rendered header so it matches the runtime navigation. Do not create duplicate thin pages merely to satisfy old links.

## Global non-page surfaces to audit

- Homepage
- Product page
- Blog index
- Article template
- Search
- Collection/list-collections
- Cart
- 404
- Footer navigation and policies
- Header, desktop and mobile
- Announcement bar
- Newsletter signup

## Validation checklist used after every page implementation

- [ ] Route/page object exists in Shopify or is explicitly marked pending creation.
- [ ] Correct H1, no duplicate visible H1.
- [ ] Breadcrumb trail is correct.
- [ ] Hero image loads and has useful alt text.
- [ ] Main copy is unique to the page and not filler.
- [ ] Claims reviewed for appropriate certainty.
- [ ] Parent link works.
- [ ] Sibling/related links work.
- [ ] Product CTA is appropriate and correct.
- [ ] Desktop layout is coherent.
- [ ] Tablet layout is coherent.
- [ ] Mobile layout is coherent.
- [ ] No broken internal links introduced.
- [ ] No accidental duplicate/legacy page competing for the same topic.
- [ ] Page title/topic matches navigation label.
- [ ] References included where claims warrant them.
