# Lemonade quantity display — staging review

Prepared against `main` at `fa87925f226904c0cd9ea86f76d804f78b04cf4f` on October 20, 2026. Display-only proposal; no release, discount change, order, theme upload or publication authorized.

## Source and ownership

- Selected Library file: `libfile_8a32aaa2a958819193081c0f2295d1ef`, `Lemonade-volume-update(1)(1).zip`, 57,135 bytes.
- Verified local SHA256: `f15983253ecdbabd5eea56bb70cc91b21ef84dab8f7b07efbf0771cc07f3751f`.
- Isolated worktree/branch; original saved checkout remains untouched. No AGENTS.md, .agents/skills or CODEOWNERS exists in current main; workspace .agents is empty. Followed repository PR template and .github/ANTI_STALL.md.
- Reviewed open PRs and the relevant changed-file lists. PR226 (A056) and PR227 share the English locale file. Other open product work includes PR143, PR151, PR186 and PR52. All returned authors are swini16. None of these branches, assignments or review ownership was modified. This adds a new locale namespace and does not incorporate any other draft.
- Read-only Shopify MAIN theme readback: `BhdMain-260907/main`, theme 182996762908. Cart footer and drawer match main exactly. English locale matches main exactly and the ZIP baseline semantically. Live product.json matches the ZIP baseline semantically, but differs from main in trust_strip, free_shipping, and disclosures settings. Those main values are preserved; no whole-template replacement.

## Exact implementation scope

Eight storefront paths, plus one regression test and this review:

- `assets/bhd-lemonade-volume.css`: package styling for three quantity choices, focus/selection/disabled states and narrow screens.
- `assets/bhd-lemonade-volume.js`: update the existing native form quantity; synchronize native changes and variant/quantity events. Preserve stock, quantity min/max/increments and remaining-cart constraints. Fail closed for mismatched variants, unavailable stock, missing quantity input and subscriptions, including an initial plan before app input insertion.
- `snippets/bhd-lemonade-volume.liquid`: contextual variant prices via money_with_currency; standard 0/10/15% estimates and verified scheduled 20/25% estimates. Restrict to the two Lemonade products and exclude native quantity-price-break products. Expose inventory ceiling only for tracked deny-policy inventory. Continue-selling items retain native backorder behavior.
- `snippets/bhd-lemonade-cart-offer.liquid`: count eligible one-time Lemonade jars, render offer information and suppress incremental prompts for other discounts, subscriptions, exhausted stock/quantity maxima, incompatible increments and BFCM. Existing Shopify cart totals remain untouched.
- `locales/en.default.json`: only add bhd.volume (19 keys). Explicit estimate qualification and FIRST15 non-combination copy.
- `sections/main-cart-footer.liquid`: one render inside refreshed js-contents.
- `snippets/cart-drawer.liquid`: one render inside refreshed footer.
- `templates/product.json`: one new lemonade_volume custom-liquid block before quantity_selector. Every pre-existing value and block order remains unchanged.

No workflows, discount configuration, product descriptions, pricing, images, unrelated templates or other owners' changes are modified.

## Backend agreement (read-only October 20)

The two automatic standard offers are ACTIVE, without expiry: 2+ jars 10%, 3+ jars 15%. Both include products 8904882422044 and 10168145281308, apply to one-time purchases only and disable product/order/shipping combinations.

Scheduled offers 1572800823580 (20%, minimum 1) and 1572800856348 (25%, minimum 2) are SCHEDULED for 2026-11-27 07:00:00 UTC through 2026-12-01 07:00:00 UTC, with the same products, one-time-only scope and all combinations disabled. Package dates/rates agree. No new promotion was created. FIRST15 is ACTIVE, one use per customer, expires 2026-11-30 17:00:00 UTC, all combinations disabled.

Displayed totals are estimates for the selected addition, not a repricing of the entire existing cart. Shopify determines actual allocations, rounding, better eligible offers and checkout totals. A page open across a scheduled boundary requires refresh; recheck backend agreement before release.

## Validation

Passed:

- ZIP bytes/hash and safe archive paths.
- All 37 Node unit tests, including 17 new Lemonade fixture tests.
- New tests cover CAD/USD and changed contextual price; 1/2/3/back-to-1; native events/FormData; max exhaustion; inventory remaining; increments; subscriptions and initial-plan guard; variant mismatch and refresh; missing/unavailable inputs; BFCM start/end boundaries; cart refresh through empty; FIRST15/other-code prompt suppression; native cart refresh integration.
- JavaScript syntax, git diff whitespace and desktop/mobile responsive policy source check.
- Semantic preservation checks: remove only the new block/order entry and the template equals main; remove only bhd and the locale equals main.
- Existing optional-cart-target regression.

Failed / remaining:

- Full Shopify Theme Check: 1,421 errors and 59 warnings; same tool on main: 851 errors and 58 warnings. Incremental results are exactly 570 MatchingTranslations errors (19 English-only keys across 30 other locales) and one OrphanedSnippet warning (render is embedded in custom-liquid template settings). No new Liquid syntax errors. Translate the new keys before treating the proposal as fully validated; do not disable this check.
- Desktop/mobile browser launch failed before tests: system Chromium SUID sandbox helper is not configured correctly. No browser protection was disabled. No screenshots or rendered layout pass claimed.
- Shopify-rendered preview, actual cart/checkout discount allocation and FIRST15 non-stacking behavior, mobile/desktop visual and keyboard/touch checks have not run. DOM/Liquid fixtures are not Shopify-rendered proof. No order was placed.

## PR creation constraint and release hold

Opening a PR against main triggers `.github/workflows/shopify-pr-preview-gate.yml` on `pull_request: opened`, including drafts. It copies all theme directories and runs a complete development-theme upload. There is no draft guard. The task prohibits whole-theme uploads and requires CI protections to remain intact. Therefore PR creation is held pending explicit clarification; do not use CI0/CI1 naming, skip markers, a different base, workflow edits or cancellations to bypass the gate.

Before release: resolve that staging authorization conflict, finish localization, run protected CI and Shopify-rendered desktop/mobile preview, verify both market routes/currencies and one-time/subscription choices, stock/quantity rules and backorders, cart add/update/remove refresh, FIRST15 vs automatic discounts without an order, scheduled boundaries, description-notice deduplication, theme/main drift and overlap with PR226/227. Reconcile live-only template differences selectively. Obtain separate release authorization. Rollback is removal of this isolated display patch; backend offers remain unchanged.
