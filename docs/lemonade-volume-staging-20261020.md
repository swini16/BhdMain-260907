# Lemonade quantity display — staging review

## Current release instruction: October 20, 2026

The owner has explicitly instructed this ChatGPT session to implement and release the existing eHP change: “why handoff why dont u jsut implement gogogo live to ehp”. This supersedes the earlier draft-only and publication holds recorded below. Continue PR238 through its existing protected merge and Shopify MAIN sync; preserve all required checks. The historical preparation and failed-run evidence below remain historical, not the status of the new candidate.

Replace the three quantity cards and pricing estimates with one quantity-aware line:

- 1 jar: `Add 1 for 10% off`
- 2 jars: `Add 1 more for 15% off`
- 3–9 jars: `15% off on 3–9 jars`
- 10+ jars: `20% off on 10+ jars`
- Terms: `Offers do not combine.`

The actionable line increments the native quantity by one without submitting the purchase form. Product prompts count eligible one-time Lemonade already in the cart plus the selected addition. Cart prompts count the cart itself. Preserve the existing inventory, quantity-rule, variant and selling-plan guards; use `Best offer shown in cart.` when an upgrade cannot be established. A known equal-rate discount suppresses an upgrade prompt; a confirmation is suppressed only by a strictly higher rate or an unknown competing offer. Keep the stronger scheduled BFCM offer.

Fresh Shopify readback confirms all three standard automatic offers are ACTIVE, have no end date, cover both Lemonade products and apply only to one-time purchases, with product/order/shipping combinations all false. The third offer is `gid://shopify/DiscountAutomaticNode/1575714488604`, minimum 10, 20%. The existing scheduled BFCM 20%/25% dates and settings are unchanged. Product descriptions already contain one compact static notice instead of the old table; the live enhancement should hide that duplicate only while its contextual offer is visible. No new price or currency estimates are added.

The new preview candidate corrects the localization request to match Shopify's generated form and the existing purchase-flow test, and adds sanitized status/path, country, preview-theme and currency assertions. This corrects an observed request mismatch; it is not a claim that the previous failure's complete root cause or the new candidate has passed. Acceptance includes 1, 2, 3, 9, 10, 11 and back to 1, actual automatic/FIRST15 totals, both markets and desktop/mobile. No workflow, browser security or required gate is changed.

The existing unit workflow also failed because the PR introduced a `jsdom` import without declaring that dependency. A private root `package.json` now declares the fixture dependencies `jsdom` and `liquidjs`, so the existing install step can run the tests. No workflow changes are required.

Pre-commit verification: JavaScript/test syntax, whitespace and 31-locale preservation checks pass. Both existing dependency-free unit files pass. The actual new component passed 26 focused runtime cases plus the observed stock-refresh lifecycle regression. The complete jsdom/LiquidJS suite awaits the existing CI dependency install; no rendered pass is claimed yet.

Fresh Shopify MAIN comparison confirms the product section, cart drawer and cart footer match this PR's starting files after removing only its new render calls. Existing English locale content also matches. The known live-only product-template settings remain outside this PR's diff. The stock-refresh race found during review is fixed: upgrades wait for the native input's own cart-quantity bounds update, while confirmations remain available.

The protected preview result and release outcome will be recorded after execution. The owner has authorized the normal development preview and production release, with no order, payment or external message submission.

## Historical preparation and evidence

Prepared against `main` at `fa87925f226904c0cd9ea86f76d804f78b04cf4f` on October 20, 2026. Display-only proposal; no release, discount change, order, theme upload or publication authorized.

## Source and ownership

- Selected Library file: `libfile_8a32aaa2a958819193081c0f2295d1ef`, `Lemonade-volume-update(1)(1).zip`, 57,135 bytes.
- Verified local SHA256: `f15983253ecdbabd5eea56bb70cc91b21ef84dab8f7b07efbf0771cc07f3751f`.
- Isolated worktree/branch; original saved checkout remains untouched. No AGENTS.md, .agents/skills or CODEOWNERS exists in current main; workspace .agents is empty. Followed repository PR template and .github/ANTI_STALL.md.
- Reviewed open PRs and the relevant changed-file lists. PR226 (A056) and PR227 share the English locale file. The necessary native quantity render also touches main-product.liquid, shared with PR226, PR143 and PR52. Other open product work includes PR151 and PR186. All returned authors are swini16. None of these branches, assignments or review ownership was modified. This adds a new locale namespace and does not incorporate any other draft.
- Read-only Shopify MAIN theme readback: `BhdMain-260907/main`, theme 182996762908. Cart footer and drawer match main exactly. English locale matches main exactly and the ZIP baseline semantically. Live product.json matches the ZIP baseline semantically, but differs from main in trust_strip, free_shipping, and disclosures settings. Those main values are preserved; no whole-template replacement.

## Exact implementation scope

38 storefront paths, plus one regression test and this review. Correcting the introduced findings requires 31 paths beyond the original eight (30 locale files and main-product.liquid), while removing the product.json change. Only display integration and its fallback strings are added:

- `assets/bhd-lemonade-volume.css`: package styling for three quantity choices, focus/selection/disabled states and narrow screens.
- `assets/bhd-lemonade-volume.js`: update the existing native form quantity; synchronize native changes and variant/quantity events. Preserve stock, quantity min/max/increments and remaining-cart constraints. Fail closed for mismatched variants, unavailable stock, missing quantity input and subscriptions, including an initial plan before app input insertion.
- `snippets/bhd-lemonade-volume.liquid`: contextual variant prices via money_with_currency; standard 0/10/15% estimates and verified scheduled 20/25% estimates. Restrict to the two Lemonade products and exclude native quantity-price-break products. Expose inventory ceiling only for tracked deny-policy inventory. Continue-selling items retain native backorder behavior.
- `snippets/bhd-lemonade-cart-offer.liquid`: count eligible one-time Lemonade jars, render offer information and suppress incremental prompts for other discounts, subscriptions, exhausted stock/quantity maxima, incompatible increments and BFCM. Existing Shopify cart totals remain untouched.
- `locales/en.default.json`: only add bhd.volume (19 keys). Explicit estimate qualification and FIRST15 non-combination copy.
- `sections/main-cart-footer.liquid`: one render inside refreshed js-contents.
- `snippets/cart-drawer.liquid`: one render inside refreshed footer.
- `sections/main-product.liquid`: one literal render call immediately inside the native quantity_selector branch. This gives the snippet a real reference visible to Theme Check.
- Thirty non-default storefront locale files: append exactly the same 19 approved English strings under bhd.volume as explicit fallbacks. These are English fallbacks, not new translations; all existing language content is byte-preserved. Native-language translations remain a separate editorial follow-up.
- `templates/product.json`: restored byte-for-byte to main; no remaining template delta.

No workflows, discount configuration, product descriptions, pricing, images, unrelated templates or other owners' changes are modified.

## Backend agreement (read-only October 20)

The two automatic standard offers are ACTIVE, without expiry: 2+ jars 10%, 3+ jars 15%. Both include products 8904882422044 and 10168145281308, apply to one-time purchases only and disable product/order/shipping combinations.

Scheduled offers 1572800823580 (20%, minimum 1) and 1572800856348 (25%, minimum 2) are SCHEDULED for 2026-11-27 07:00:00 UTC through 2026-12-01 07:00:00 UTC, with the same products, one-time-only scope and all combinations disabled. Package dates/rates agree. No new promotion was created. FIRST15 is ACTIVE, one use per customer, expires 2026-11-30 17:00:00 UTC, all combinations disabled.

Displayed totals are estimates for the selected addition, not a repricing of the entire existing cart. Shopify determines actual allocations, rounding, better eligible offers and checkout totals. A page open across a scheduled boundary requires refresh; recheck backend agreement before release.

## Validation

Passed:

- ZIP bytes/hash and safe archive paths.
- All 39 Node unit tests, including 19 new Lemonade fixture tests.
- New tests cover CAD/USD and changed contextual price; 1/2/3/back-to-1; native events/FormData; max exhaustion; inventory remaining; increments; subscriptions and initial-plan guard; variant mismatch and refresh; missing/unavailable inputs; BFCM start/end boundaries; cart refresh through empty; FIRST15/other-code prompt suppression; native cart refresh integration.
- JavaScript syntax, git diff whitespace and desktop/mobile responsive policy source check.
- Preservation checks: product.json is byte-identical to main; remove only the appended bhd namespace and all 30 non-default locales are byte-identical to their prior contents. Existing English locale keys are also preserved.
- Existing optional-cart-target regression and seven backorder render states, mixed-cart fixture and Liquid/JSON/CSS parsing.

Failed / remaining:

- Full Shopify Theme Check still fails on exactly the same 851 errors and 58 warnings as main, with ZERO new findings (compared by path, check, severity and message, ignoring shifted line numbers). The earlier 570 new MatchingTranslations errors were 19 missing keys × 30 locales; explicit approved English fallbacks resolve them without invented translations. Moving the real render call from JSON settings to the native section resolves the additional OrphanedSnippet warning. No checks are suppressed and no baseline errors are altered.
- Desktop/mobile browser launch failed before tests: system Chromium SUID sandbox helper is not configured correctly. No browser protection was disabled. No screenshots or rendered layout pass claimed.
- Shopify-rendered preview, actual cart/checkout discount allocation and FIRST15 non-stacking behavior, mobile/desktop visual and keyboard/touch checks have not run. DOM/Liquid fixtures are not Shopify-rendered proof. No order was placed.

## PR creation authorization and release hold

Opening a PR against main triggers `.github/workflows/shopify-pr-preview-gate.yml` on `pull_request: opened`, including drafts. It copies all theme directories and runs a complete development-theme upload. There is no draft guard. The task prohibits whole-theme uploads and requires CI protections to remain intact. The owner subsequently approved this exact temporary development-theme upload and desktop/mobile checkout QA, stopping before any order. PR creation and this existing preview workflow are now authorized. Do not use CI0/CI1 naming, skip markers, a different base, workflow edits or cancellations to bypass the gate. Merge and live publication remain prohibited.

Before release: resolve that staging authorization conflict, review English fallback scope/native-language editorial needs, run protected CI and Shopify-rendered desktop/mobile preview, verify both market routes/currencies and one-time/subscription choices, stock/quantity rules and backorders, cart add/update/remove refresh, FIRST15 vs automatic discounts without an order, scheduled boundaries, description-notice deduplication, theme/main drift and overlap with PR226/227. Reconcile live-only template differences selectively. Obtain separate release authorization. Rollback is removal of this isolated display patch; backend offers remain unchanged.

## Existing preview workflow and browser access

The protected Shopify PR preview gate runs on opened, synchronize, reopened and ready_for_review events targeting main, with no draft exclusion. It uses ubuntu-latest, contents:read, a per-PR concurrency group with cancel-in-progress, and a 12-minute timeout. The destination store is best-hydrate.myshopify.com; credential access comes from the existing repository secret fallback chain. No credentials were inspected or changed.

For this patch it stages assets, blocks, config, layout, locales, sections, snippets and templates into /tmp/bhd-theme. After a sandbox-enabled installed Chrome preflight, `shopify theme push --development --development-context pr-<PR-number>-proposed` uploads that complete staged theme. It checks the returned theme role is development. At the time of preparation no preview theme ID or URL existed because the workflow had not run; the exact ID is allocated/returned at runtime, not knowable in advance. This is a full remote staging upload, despite not being a publication.

The workflow then uses `shopify theme dev` against that returned theme ID with a runner-local authenticated renderer at 127.0.0.1:9292, live reload off and nodelete. Its upload-error guard only allows proven unchanged unrelated exclusions; changed files and shared/product/cart surfaces remain protected. For this patch the targeted routes are / and /products/lemonade-best-hydrate. The US PDP, quantity-offer interactions and checkout allocation matrix are not explicitly covered by that targeted smoke. The separate purchase-flow branch is selected only by bhd-backorder or purchase-flow filenames and will not run for this patch.

Configured Playwright projects are desktop Chromium 1440×900 and mobile Chromium 390×844 with touch/mobile emulation. Both use chromiumSandbox:true and the workflow selects installed Chrome. Cleanup always attempts to stop the renderer and delete only the returned development preview when an ID was recorded. This does not promise cleanup after every early failure or cancellation. No workflow or protection is changed.

Supported sandboxed browser route: the existing CI route is configured correctly and is pending authorization for its full-theme staging side effect; its actual launch/access is unverified for this branch. No usable local sandboxed browser route was found. System Chromium fails because /usr/lib/chromium/chrome-sandbox is owned by nobody rather than root; a user-namespace capability check fails because /proc/self/uid_map is read-only. No exposed browser connector was available. We did not disable sandboxing, change helper ownership, change permissions, request elevated access or alter security controls.

## Additional acceptance requirement: GRIN attribution and commission basis

Status: UNVERIFIED — QA plan only. Current proposed seeding terms are 10% creator commission plus a 15% audience discount. These are proposed terms, not a claim that provider configuration has been verified or changed. The scheduled BFCM 20%/25% discounts are separate offers.

Before claiming creator-channel acceptance:

- Verify whether GRIN retains the intended creator attribution when an eligible automatic volume or BFCM discount wins over the creator code. Distinguish creator-link attribution from creator-code attribution; record which supported attribution path the evidence actually proves.
- Establish whether the proposed 10% commission is calculated on list-price merchandise revenue or merchandise revenue after the winning discount. Record the applicable provider rule and any exclusions or adjustments shown by the evidence. Do not infer the basis from the headline commission rate.
- Cover standard volume pricing versus the proposed 15% creator discount, including the equal-rate three-jar case, separately from BFCM 20%/25% beating that code. An equal-rate case is not evidence of a winning automatic discount. Record actual discount selection, attribution and commission basis as separate outcomes.
- Prefer read-only provider settings/documentation and existing authorized transaction/attribution evidence, if a later verification task permits those reads. Configuration or documentation can establish intended rules; do not label it end-to-end observed behavior without matching existing evidence.

Shopify non-stacking settings alone prove neither retained GRIN attribution nor the commission revenue basis. No GRIN verification was attempted as part of this plan-only update, and no pass is claimed. If verification requires creating an order, test purchase, commission or another consequential provider action, leave the relevant outcome UNVERIFIED and report the exact missing evidence and required action rather than execute it.

No orders, test purchases, commissions, external messages, discount changes or provider-state changes are authorized by this requirement. Preserve the existing code and test evidence; do not rerun CI for this documentation-only addition. PR creation, full development-theme preview and all publication remain held pending the owner's reply to the exact development-theme approval request; publication still requires separate release authorization.

## Approved preview acceptance run

Owner approval now covers the existing complete DEVELOPMENT-theme staging side effect and desktop/mobile pre-order checkout QA only. Main and branch were refreshed: main remains fa87925f226904c0cd9ea86f76d804f78b04cf4f; pre-QA head was 69761987695bad27d988c0459e79cb6d71db7869. Open PR ownership was refreshed with no new task PR or changed overlapping owners.

Appended CA and US acceptance cases to the existing required pr-preview-gate.spec.cjs suite; all previous tests remain intact. They require a returned preview theme ID and the authenticated loopback renderer, verify market currency and variant, exercise 1/2/3/back-to-1 buttons and native cart updates, check actual automatic totals and FIRST15 non-stacking, attach product/cart screenshots, and open checkout without entering identity/address/payment or submitting anything. Sanitized cart amounts and discount titles are logged. No workflow changed and no extra workflow is dispatched. These cases are prepared, not yet a pass. Existing BFCM dates remain future; no backend time or promotion is changed.

Read-only GRIN results: the single active program has 10% commission, 15% audience code with stacking false, link tracking enabled, a 30-day window, latest-link credit and a 60-day payout hold. The existing completed creator offer agrees with the 10%/15% terms; its response does not provide a usable active link. Store confirmation is configured, but there are zero conversions for September 1–October 20, 2026 in the queried ledger. Neither the configuration nor the empty ledger establishes commission revenue basis or retained attribution when an automatic offer beats a creator code. Those outcomes remain unverified; no test purchase or commission is authorized.

The gift ledger shows one existing US shipment and no monetary fulfillment cost; it contains no CA delivered-cost example. Free shipping to the recipient is not evidence of zero merchant delivery cost. Actual CA/US delivered gift costs must include product cost and fulfillment/shipping (and applicable cross-border charges) from existing cost evidence. No gift, order or provider setting will be created to fill this gap.
