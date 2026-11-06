# Stock/delay module: local staging only

Base: 6b1bbe3c7ae6b90b32c4cb52c7c23de94b0ab1e8, November 6, 2026.

Nine shared Theme Editor fields: master enable, comma-separated variant scope, inventory/manual condition, customer message, product/drawer/full-cart/add-to-cart-notification toggles, and conflicting-claim suppression. Existing Shopify inventory, availability and purchase controls stay authoritative. Manual mode displays a notice even for positive inventory; it does not enable purchasing or change stock. US variant 51937870741788 remains excluded even if entered in scope. No market changes.

Product variant refresh and cart section redraw use the existing server-rendered paths. The inventory block reuses the same shared copy rather than the old one-day message. Missing settings retain inventory-triggered rendering, but the localized fallback and new form default both use the supplied Canadian 1–2-week notice. A blank field cannot revive the obsolete one-day estimate. Confirm the final wording and activation settings before release.

## Verified source reconciliation

Shopify MAIN theme 182996762908 was read on November 6. The six changed Liquid files and CSS matched repository main before editing. Live locale JSON also matched repository main after ignoring Shopify’s generated comment. Live settings_schema.json differs from repository main only by absence of the unrelated `Best Hydrate announcement` group. The reconciled repository candidate now preserves every live group and adds only the new nine-field group. The repo-only announcement group is deliberately omitted to match live, not silently restored. Exact reconciliation evidence is in `stock-notice-schema-reconciliation.json`. No file has been uploaded.

The candidate schema is reconciled to the observed live schema. Before any approved deployment, require a fresh checksum guard against the recorded live schema; if it differs, stop and rebuild additively. Preserve all current settings_data.json values; this candidate does not edit that file. Re-read theme identity, affected file bytes, schema, and settings before any future publication. Stop on drift.

## Validation

Focused rendered tests cover all four placement toggles, master disable, empty scope, exact IDs, whitespace in scope, explicit US exclusion, manual versus inventory mode, zero/negative/positive inventory, deny/untracked states, escaped customer text and suppression toggle. Legacy seven purchase states preserve enabled/disabled controls and mixed-cart scope. Existing Liquid/JSON/CSS parsing and variant-refresh contract pass. Unit suite passes locally. This is not desktop/mobile Shopify preview or checkout verification.

## Outstanding release gates

- Review precise customer copy and saved settings; new configuration must not accidentally inherit an obsolete one-day estimate.
- Revalidate the resolved schema against a fresh live read immediately before any approved write.
- Run required exact-head checks and authorized isolated Shopify preview at desktop/mobile sizes, with variant changes, repeat cart/drawer quantity redraws and notification mode. No orders, identity, address or payment submission.
- Explicit Austin approval before merge, deployment or any MAIN-theme write. No push, PR, CI, Shopify write or publication was performed here.

## Coverage boundary and future iHP form

Theme settings do not control Shopify checkout, Shop Pay, accelerated-checkout screens, order-status pages, order confirmation emails or other notification templates. Those need separately verified supported integrations. Do not claim all customers beyond checkout see this notice.

A future iHP form should edit the same nine-field configuration rather than duplicate message text per placement. Its draft, preview, approval and publish flow must preserve current theme identity and exact prior values, detect changes, and read back the saved result. There is no iHP publishing endpoint implemented by this preparation.

## Readiness review update

Independent read-only review identified two behavior issues, both corrected: clearing shared copy could revive the obsolete one-day estimate, and non-Shopify-managed stock could hide manual notice text in the inventory block. Regression tests now cover both. The live raw schema MD5 and newline-normalized local snapshot SHA-256 are labeled separately.

Final local verification: 89/89 unit tests, seven purchase-state fixtures, responsive policy and diff checks pass. Shopify Theme Check Node 3.31.0 reports 905 findings in baseline and candidate, with zero newly introduced normalized findings. This is not a clean whole-theme pass; existing findings remain.

No isolated Shopify browser preview was run. Opening even a draft PR triggers the repository's Shopify preview, LP quality and advisory storefront workflows. Current paid-overage/capacity evidence is unavailable, so no PR or workflow was launched. CI0/CI1 bypass modes were not used. Existing base-head workflow lookup returned no PR-triggered runs and is not evidence of capacity or of candidate success. Required exact-head remote gates remain pending.

Preview must also inspect notification close/reopen: the existing notification keeps rendered markup after dismissal, so suppression can remain while a scoped cart item exists. Verify that behavior alongside actual variant refresh and cart/drawer redraws before release.

## Direct preview attempt and final refresh fix

The supported direct Shopify route was inspected: themeDuplicate followed by themeFilesUpsert to an unpublished target, avoiding GitHub Actions. A single duplicate request for MAIN 182996762908 named `Stock delay module QA 2026-11-06 - DO NOT PUBLISH` returned `newTheme: null` and no user errors. Complete readback showed the original 20 themes only; a later exact-name read also found no candidate. The duplicate outcome is unconfirmed, not a successful preview. No retry, existing-theme overwrite, file upload or publication followed. MAIN remains 182996762908. Theme capacity is a possible cause, not an API-confirmed diagnosis. Resolve this uncertain operation or explicitly designate a safe existing staging target before proceeding.

Independent follow-up also identified stale `visibility-hidden` on inventory variant refresh. `assets/product-info.js` now copies that class only for the Inventory region from the rendered source, with a bidirectional scoped/unscoped FBA regression. Its pre-edit live source exactly matched the base commit. Final local suite: 90/90 unit tests; seven rendered purchase fixtures; JS syntax and diff checks pass. Required live-rendered preview remains outstanding.
