# Best Hydrate public site inventory

Last audited: 2026-09-09
Branch: `main`

## Purpose

This inventory is the working control document for the Best Hydrate public website rebuild. It distinguishes the canonical navigation architecture from legacy public routes, identifies claim-sensitive pages, and records the intended role of each public surface.

## Current implementation state

- All 17 canonical Science pages are implemented theme-side and family-audited.
- All 14 canonical Solutions content pages are implemented theme-side and family-audited, plus the primary commerce product bridge.
- All 14 canonical Connect pages/surfaces are implemented theme-side and family-audited.
- The default Shopify page template now uses the Best Hydrate page system, which dispatches canonical handles to dedicated content while unsupported legacy/default pages fall back to `page.content`.
- The live Meet Us page is `/pages/our-story`. Live verification showed `/pages/about` is an older Ingredients page, so `/pages/about` is a legacy-route disposition item, not the Meet Us canonical route.
- `page.about.json` now combines the Best Hydrate page system with the existing editable team section. Shopify template naming is independent of the live page handle.
- `page.contact.json` now combines the Best Hydrate page system with the native Shopify contact form.
- `/blogs/news` has a dedicated Best Hydrate news intro, current tag navigation and dynamic latest-article feature while preserving the existing Shopify article archive.
- The header enhancement/runtime architecture and the server-rendered header/mobile navigation still need final normalization. This remains a major global SEO/no-JavaScript consistency task.
- GitHub proves theme-side implementation but cannot prove every newly defined Shopify Page object exists in Admin. Live objects have been verified for `/pages/our-story`, `/blogs/news`, `/pages/contact` and the existing commerce product.

## Content standards for every substantive page

Each substantive page should include, where appropriate:

1. Breadcrumbs: Home > primary family > parent page > current page.
2. Clear H1 and one-sentence page promise.
3. Contextual hero visual, preferably natural stock photography or a restrained scientific illustration.
4. Scannable sections with meaningful H2/H3 hierarchy.
5. Plain-language explanation before technical detail.
6. Evidence/claim discipline, especially for medical, physiological, clinical, performance, investor or humanitarian claims.
7. Contextual cross-links to parent, sibling and next-step pages.
8. Product CTA only where contextually useful, not on every screen.
9. Related content rail or cards near the bottom.
10. Source/reference block on science-heavy or verification-heavy pages where external claims are made.
11. Accessibility: descriptive alt text, sufficient contrast, keyboard-safe links, no text embedded in decorative imagery when avoidable.
12. SEO basics: descriptive title/H1 relationship, concise intro, internal links, one canonical topic per page and no duplicate thin pages.

## Canonical navigation inventory

### SCIENCE

#### Hydration Science

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/hydration-science` | Science landing page | High | High | Implemented | Parent hub, breadcrumb, science overview, links to three child pages |
| `/pages/how-hydration-works` | Physiology explainer | High | High | Implemented | Fluid balance, absorption, compartments, practical summary |
| `/pages/electrolytes` | Electrolyte explainer | High | High | Implemented | Sodium, potassium, chloride, bicarbonate, roles and limits |
| `/pages/glucose-water-absorption` | SGLT / absorption explainer | High | Very high | Implemented | Accurate glucose-sodium-water mechanism with citations and careful wording |

#### Our Formula

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/our-formula` | Formula landing page | High | High | Implemented | Formula philosophy, ingredients, product relationship |
| `/pages/five-essential-electrolytes` | Formula component explainer | High | High | Implemented | Explain product-language electrolyte species without inventing magnesium |
| `/pages/ingredient-rationale` | Ingredient-by-ingredient rationale | High | High | Implemented | Why each listed ingredient is present, taste/function separation |
| `/pages/why-bicarbonate` | Bicarbonate differentiator | High | Very high | Implemented | Acid-base context, hydration relevance, conservative claims |

#### Research & Impact

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/research-publications` | Research hub | High | Very high | Implemented | Publications, active research, partners, impact pathways |
| `/pages/publications` | Publication list | High | Very high | Implemented | Verified publication metadata only, links/DOIs where known |
| `/pages/current-research` | Active research portfolio | High | Very high | Implemented | Clearly label planned, underway, completed and published |
| `/pages/research-partners` | Scientific collaboration page | Medium-high | High | Implemented | Verified institutions/collaborators only |
| `/pages/research-impact` | Translation/impact page | Medium-high | High | Implemented | Performance, medical, humanitarian impact without overstating outcomes |

#### Clinical Development

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/clinical-development` | Clinical development hub | High | Very high | Implemented | Development pathway, evidence standards, research vs care distinction |
| `/pages/clinical-program` | Clinical program | High | Very high | Implemented | Program objectives, status, endpoints, governance language |
| `/pages/pilot-studies` | Pilot study portfolio | High | Very high | Implemented | Study design/status, no implied results before results exist |
| `/pages/healthcare-applications` | Healthcare use contexts | High | Very high | Implemented | Applications/research areas, not treatment claims |

### SOLUTIONS

#### Products

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/products/lemonade-best-hydrate` | Primary commerce page | High | High | Enhanced product template | Accurate formula, directions, claims, conversion, science links |
| `/pages/product-details` | Product detail explainer | Medium-high | High | Implemented | What it is, format, servings, positioning, links to shop/formula |
| `/pages/directions` | Directions/use page | Medium | High | Implemented | Label-consistent preparation and use, clear caution language |

#### Performance

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/performance-hydration` | Performance landing page | High | High | Implemented | Training, competition, heat, recovery, personalized hydration framing |
| `/pages/endurance-hydration` | Endurance use case | High | Very high | Implemented | Sweat/fluid strategy, sodium/carbohydrate context, avoid universal dosing |
| `/pages/heat-high-sweat` | Heat and high-sweat use case | High | Very high | Implemented | Heat stress, sweat losses, individualization, safety escalation |
| `/pages/recovery-hydration` | Recovery use case | Medium-high | High | Implemented | Rehydration as part of recovery, food/fluid context, no exaggerated recovery claims |

#### Everyday Wellness

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/everyday-wellness` | Everyday landing page | Medium-high | Medium | Implemented | Work, travel, active living, simple habits |
| `/pages/work-long-shifts` | Work/long shift use case | Medium | Medium | Implemented | Heat, physical work, access, routine, practical cues |
| `/pages/travel-hydration` | Travel use case | Medium | Medium | Implemented | Flights, heat, schedule disruption, practical hydration routine |
| `/pages/active-living` | General active living | Medium | Medium | Implemented | Recreation, outdoor activity, daily movement |

#### Clinical & Humanitarian

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/clinical-hydration` | Clinical hydration landing page | High | Very high | Implemented | Clinical oral hydration positioning without implying universal clinical adoption |
| `/pages/recovery-rehabilitation` | Recovery/rehabilitation context | High | Very high | Implemented | Hydration role in supportive care, clinician guidance |
| `/pages/active-aging` | Active aging context | Medium-high | Very high | Implemented | Older-adult hydration considerations, cautious clinical framing |
| `/pages/eco-humanitarian` | Humanitarian hydration landing page | High | High | Implemented | ORS access, implementation, partnerships, sustainable delivery |

### CONNECT

#### Company & People

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/our-story` | Meet Us / company people | High | Low | Implemented + live verified | Breadcrumbs, fuller team context, company perspective, cross-links |
| `/pages/why-best-hydrate` | Company story | High | Low | Implemented | Origin, problem, development journey, present focus |
| `/pages/mission-values` | Mission and values | Medium-high | Low | Implemented | Science-first, people-first, practical access, transparency |

#### Partnerships

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/partnerships` | Partnership hub | High | Medium | Implemented | Research, retail/distribution, humanitarian partner pathways |
| `/pages/research-partnerships` | Research partnerships | Medium-high | High | Implemented | Collaboration models, governance and evidence standards |
| `/pages/retail-distribution` | Retail/distribution partnerships | Medium-high | Low | Implemented | Channel fit, customer education, commercial contact CTA |
| `/pages/humanitarian-partnerships` | Humanitarian partnerships | Medium-high | High | Implemented | Pilot/project collaboration, safe water and implementation principles |

#### Investor Relations

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/pages/investor-relations` | Investor landing page | High | High | Implemented | Public company thesis, current vs future, contact, disclaimer |
| `/pages/corporate-information` | Corporate facts | Medium | Medium | Implemented | Public entity/product/IP/research facts with diligence caveats |
| `/pages/investor-contact` | Investor contact | Low-medium | Low | Implemented | Focused investor inquiry CTA, privacy and securities boundaries |

#### News & Contact

| Route | Role | Content depth | Research sensitivity | Theme status | Validation target |
|---|---|---:|---:|---|---|
| `/blogs/news` | Blog/news hub | High/ongoing | Varies | Enhanced + live verified | Breadcrumbs, tags, dynamic latest story, archive consistency |
| `/pages/press` | Press/media page | Medium | Medium | Implemented | Press contact, current source paths, no invented coverage |
| `/pages/events` | Events page | Medium | Medium | Implemented | Confirmed-status discipline, dated coverage, event inquiries |
| `/pages/contact` | General contact | Medium | Low | Implemented + live verified | Breadcrumbs, routing by inquiry type, native contact form |

## Legacy/currently discoverable pages requiring disposition

These pages remain public or discoverable and should be deliberately redirected, retained or reshaped during the global audit rather than ignored:

| Route | Current role | Recommended disposition |
|---|---|---|
| `/pages/about` | Older Ingredients page, despite the misleading handle | Merge useful content into Our Formula / Ingredient Rationale, then redirect if Shopify routing allows |
| `/pages/learn` | Older learning hub | Redirect or reshape as an index into canonical Science after navigation cleanup |
| `/pages/connect` | Older Connect hub | Redirect or reshape to the current Connect architecture |
| `/pages/dianna-proctor` | Athlete ambassador profile | Retain and improve; link contextually from Performance, Press and News rather than forcing it into primary navigation |
| `/pages/athletes-ambassadors` | Older athlete/ambassador hub | Evaluate against Dianna profile, Partnerships and Events; avoid duplicating sponsor/ambassador claims |

## Server-rendered header routes that differ from canonical architecture

The base header still exposes older links to crawlers/no-JavaScript clients. These need normalization now that the canonical page families are built:

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

Disposition rule: merge useful concepts into canonical pages, then update server-rendered desktop/mobile navigation so it matches the canonical architecture. Do not create duplicate thin pages merely to satisfy old links.

## Global non-page surfaces to audit next

- Homepage and hero integration
- Product page final audit
- Article template
- Search
- Collection/list-collections
- Cart
- 404
- Footer navigation and policies
- Header, desktop and mobile
- Announcement bar
- Newsletter signup
- Blog index final browser QA (theme implementation complete)

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
