# Product and commerce audit

Date: 2026-09-09
Scope: Best Hydrate product template, Shopify product descriptions, canonical product route, regional product configuration.

## Canonical product route

PASS. The primary site architecture consistently points to:

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

## Intentional regional product configuration

PASS. The two ACTIVE public lemonade products are intentional regional catalog entries, not accidental duplicates.

1. `/products/lemonade-best-hydrate`
2. `/products/lemonade-electrolyte-best-hydrate`

Best Hydrate confirmed that the pair exists to support different regional selling contexts, including CAD and USD pricing. Both products therefore remain active. No archive, redirect, merge or repricing action is required as part of this site cleanup.

Their descriptions were normalized to the same current claim standard while preserving independent product objects, pricing, inventory and market configuration.

## Result

**PRODUCT THEME/COPY AUDIT: PASS.**

**REGIONAL PRODUCT CONFIGURATION: INTENTIONAL, PASS.**

Final browser/device QA remains a separate presentation check.
