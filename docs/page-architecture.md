# Best Hydrate page architecture

Last updated: 2026-09-09
Branch: `main`

## Objective

Create a coherent public information architecture that feels like one science-first Best Hydrate website rather than a collection of unrelated Shopify pages. Each page should have a clear role, a predictable visual grammar, and intentional internal links.

## Page families

### 1. Science pages
Purpose: explain mechanisms, formula rationale, evidence, and research.

Visual language:
- clean white/very pale blue base
- restrained molecule, fluid, laboratory, or physiology imagery
- diagrams only when they make the explanation clearer
- navy + hydration blue accents

Typical structure:
1. breadcrumb
2. compact science hero
3. plain-language summary
4. mechanism / concept sections
5. practical meaning
6. evidence / references
7. related science pages
8. product link where relevant

Claim rule: mechanism and clinical statements need the strongest sourcing and most conservative wording.

### 2. Solution/use-case pages
Purpose: help a visitor recognize when hydration strategy matters in their real life.

Visual language:
- natural, believable people photography
- use-context first, product second
- lower visual density than campaign hero art

Typical structure:
1. breadcrumb
2. situation-led hero
3. what changes hydration needs in this setting
4. practical approach
5. where Best Hydrate may fit
6. safety/individualization note where relevant
7. cross-links to science and sibling use cases
8. shop CTA

Claim rule: avoid promising performance, recovery, treatment, or prevention outcomes unless directly supported and appropriate.

### 3. Company/partnership pages
Purpose: build trust, explain who Best Hydrate is, and make collaboration easy.

Visual language:
- people, facilities, retail, research, community
- cleaner corporate layout
- fewer molecule graphics

Typical structure:
1. breadcrumb
2. purpose-led hero
3. concise overview
4. proof/context
5. partnership or contact pathway
6. related company pages

### 4. Investor pages
Purpose: provide a professional, restrained entry point for legitimate investor inquiries.

Visual language:
- clean corporate information design
- company/product/research visuals
- no exaggerated market graphics

Typical structure:
1. breadcrumb
2. investor hero
3. company snapshot
4. strategic thesis
5. current stage / areas of work
6. governance/corporate facts where publishable
7. contact
8. disclaimer

### 5. News/blog pages
Purpose: document real company activity, athlete/community stories, research updates, and educational commentary.

Typical structure:
- blog index: featured story, current categories, recent posts
- article: breadcrumb, title, author/date, content, related posts, relevant page links

## Canonical breadcrumb families

Science:
- Home > Science > [Tier 2] > [Page]

Solutions:
- Home > Solutions > [Tier 2] > [Page]

Connect:
- Home > Connect > [Tier 2] > [Page]

Blog:
- Home > Connect > News & Contact > Blog > [Article]

Product:
- Home > Solutions > Products > Best Hydrate

## Cross-linking rules

Every page should normally have:
- 1 parent link
- 2 to 4 sibling/related links
- 1 cross-family link when genuinely useful

Examples:
- Electrolytes -> Hydration Science, Five Essential Electrolytes, Our Formula, Heat & High Sweat
- Why Bicarbonate -> Our Formula, Ingredient Rationale, Glucose & Water Absorption
- Endurance -> Performance Hydration, Heat & High Sweat, Recovery, Hydration Science
- Clinical Hydration -> Clinical Development, Healthcare Applications, Recovery & Rehabilitation
- Humanitarian Hydration -> Humanitarian Partnerships, Research Impact, Our Formula

Avoid sitewide repetition of the same four links. Related links should be contextual.

## Shared component system to build

### Breadcrumbs
Semantic nav with `aria-label="Breadcrumb"`, Home first, current page last and not linked.

### Compact page hero
Fields:
- eyebrow / family
- H1
- one-sentence promise
- supporting visual
- optional primary CTA

### Key-point strip
3 short points maximum. Use only where it meaningfully orients the visitor.

### Content sections
Reusable variants:
- text + image
- image + text
- centered explainer
- 3-card grid
- timeline/process
- comparison table
- reference list

### Related-page cards
2 to 4 cards with short reason-to-click copy. These are the main internal-linking mechanism.

### CTA band
Variants:
- Shop Best Hydrate
- Explore the Science
- Partner With Us
- Contact Research Team
- Investor Inquiry

## Stock visual conventions

Use natural editorial-style photography with restrained processing.

Preferred subjects:
- realistic runners, workers, travelers, active adults
- clinicians/researchers in credible environments
- clean water/community settings for humanitarian pages
- laboratories and research environments for science pages
- ingredient close-ups where useful

Avoid:
- hyper-saturated AI-looking imagery
- impossible molecule compositions
- excessive water splashes
- generic handshake photography unless no better option exists
- imagery implying clinical endorsement by identifiable health systems

External image URLs should be from stable, reputable stock sources. Where long-term brand control matters, selected assets should ultimately be moved into Shopify files/theme assets.

## Writing conventions

Tone:
- clear
- science-first
- practical
- confident without overclaiming
- Canadian spelling where natural

Preferred phrasing:
- `science-informed`
- `designed for`
- `can support`
- `helps provide`
- `research is evaluating`

Avoid unless specifically verified:
- `clinically proven`
- `doctor recommended`
- `FDA approved`
- `prevents dehydration`
- `treats dehydration`
- `faster absorption` as an absolute product superiority claim
- universal dosing claims

## Research labels

Every page is assigned one of four research levels:

- LOW: company story, contact, partnership process
- MEDIUM: everyday hydration habits, travel, retail
- HIGH: performance physiology, formula rationale, research partnerships
- VERY HIGH: clinical, medical, SGLT mechanism, active aging, study results, publication claims

HIGH and VERY HIGH pages get selective external research before final copy is committed.

## Implementation order

### Wave 0: foundation
- inventory
- architecture
- shared page system
- breadcrumb component
- related link component

### Wave 1: Science foundation
1. Hydration Science
2. How Hydration Works
3. Electrolytes
4. Glucose & Water Absorption
5. Our Formula
6. Five Essential Electrolytes
7. Ingredient Rationale
8. Why Bicarbonate

### Wave 2: Research / Clinical Development
9. Research & Impact hub
10. Publications
11. Current Research
12. Research Partners
13. Research Impact
14. Clinical Development
15. Clinical Program
16. Pilot Studies
17. Healthcare Applications

### Wave 3: Solutions
18. Product Details
19. Directions
20. Performance Hydration
21. Endurance
22. Heat & High Sweat
23. Recovery
24. Everyday Wellness
25. Work & Long Shifts
26. Travel
27. Active Living
28. Clinical Hydration
29. Recovery & Rehabilitation
30. Active Aging
31. Eco-Humanitarian

### Wave 4: Connect
32. About / Meet Us
33. Why Best Hydrate
34. Mission & Values
35. Partnerships
36. Research Partnerships
37. Retail & Distribution
38. Humanitarian Partnerships
39. Investor Relations
40. Corporate Information
41. Investor Contact
42. Press
43. Events
44. Contact

### Wave 5: legacy and global surfaces
- Learn legacy disposition
- Connect legacy disposition
- Dianna Proctor refinement
- blog index/article template
- product page
- 404
- search
- footer
- server-rendered header parity

## Definition of done for a page

A page is not considered finished until:

1. content is implemented in theme/store
2. visual loads
3. breadcrumb is correct
4. internal cross-links are present
5. claim-sensitive copy has been checked
6. mobile/tablet/desktop structure has been reviewed
7. route is confirmed or explicitly flagged as awaiting Shopify page creation
8. page is entered in the validation log
