# Product and commerce audit

Date: 2026-09-09
Scope: Best Hydrate product template, Shopify product descriptions, canonical product route, duplicate public product risk.

## Canonical product route

PASS. The site architecture consistently points to:

`/products/lemonade-best-hydrate`

The product is ACTIVE and publicly available in Shopify.

## Theme structure

PASS.

The product template preserves Shopify native commerce behavior first, then adds Best Hydrate-specific context:

1. native `main-product` section for product title, media, variant selection, quantity and add-to-cart
2. `bhd-product-guide` for breadcrumbs, formula, preparation and Science/Solutions links
3. disclosures/caution context
4. related products

No checkout, price, inventory or variant logic was replaced during the site rebuild.

## Product-description claim cleanup

PASS.

Direct Shopify Admin inspection found older public description language still using phrases including `Metabolic Hydration`, `add energy`, broad prepare/repair language and a hard 1-3 day shipping promise. That copy was inconsistent with the evidence/claim standard used across the rebuilt site.

Both active public Best Hydrate lemonade product descriptions were updated without altering their prices, variants, inventory, handles or status.

The new description:

- identifies Best Hydrate as a lemon-flavoured powdered hydration mix
- lists the current ingredient set without adding magnesium
- keeps preparation controlled by the current package label
- identifies NPN 80118664 without treating the NPN as blanket clinical proof
- frames activity, heat, sweating, work, travel and preference as contexts rather than universal needs
- keeps water and normal meals as the everyday baseline
- explicitly separates the consumer product from medical care and therapeutic oral rehydration solution
- cross-links Product Details, Directions, Our Formula and Hydration Science
- removes a fixed shipping-time promise from the product description

## Duplicate active product finding

ATTENTION REQUIRED, catalog-level rather than theme-level.

Shopify currently has two ACTIVE, publicly addressable products with essentially the same Best Hydrate lemonade identity:

1. canonical: `/products/lemonade-best-hydrate`
2. secondary: `/products/lemonade-electrolyte-best-hydrate`

They are separate Shopify Product objects and currently have different prices. The site architecture points only to the canonical first handle.

Both descriptions were normalized so neither public page carries stale claims. The secondary product was **not** archived, deleted, repriced or redirected because that could affect orders, sales channels, inventory or an intentional catalog strategy.

Recommended disposition before final catalog closeout:

- confirm whether the secondary product is intentional
- if not intentional, preserve any order/inventory history and then archive/unpublish it through a controlled catalog cleanup
- if it is intentional, differentiate its title, role and pricing rationale so search engines and customers do not see two near-identical public products

## Result

**PRODUCT THEME/COPY AUDIT: PASS.**

**CATALOG DUPLICATION: OPEN DECISION.**

Final browser/device QA remains outstanding. Catalog consolidation is intentionally not performed automatically.
