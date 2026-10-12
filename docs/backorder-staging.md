# Canadian backorder staging — release approval required

Owner authorized release after focused QA and required protections pass (2026-10-12). Sequence: verify theme source and required gate; merge/deploy theme; read back deployed files; recheck expected CA policy DENY and unchanged protected fields; set only CA policy CONTINUE; read back both variants. No quantities, locations, prices, SKUs, orders or fulfillment settings may be mutated.

Customer copy (owner requested, exact): **Due to high demand, may take an extra day or two to arrive**. The cause and extra-day estimate are owner-provided; Amazon replenishment timing and successful backorder fulfillment have not been verified. Confirm they are supportable before release.

## Theme behavior

- Eligibility defaults only to CA variant `47373155631388` (product `8904882422044`, handle `lemonade-best-hydrate`). Eligibility is deliberately fixed to this CA variant. Inventory policy is the merchant-controlled activation condition; US is excluded.
- Notice appears only when the eligible variant has tracked inventory, inventory quantity <= 0, and policy `continue`. Shopify remains authoritative for availability and quantity rules; no forced enabled button or invented stock.
- Exact inventory counts are removed from the product inventory block. The notice appears above purchase controls, in the inventory block when present, and on the affected full-cart/drawer line. Product variant refresh replaces the notice, and cart section refresh re-evaluates each line.
- While a notice is present, CSS hides conflicting product stock/speed claims, shared header/footer shipping captions, the promotion announcement, mobile sticky delivery caption and cart fast-delivery heading. Checkout controls, policy links and tax/duty copy remain. Normal in-stock state restores these elements automatically. This does not rewrite unrelated landing-page copy or the shipping policy.
- Existing add-to-cart and express-checkout behavior is preserved. `continue` permits purchase through Shopify; a theme alone cannot change `DENY` into a purchasable variant.

## Verified read-only inventory / routing evidence supplied by Shopify worker

At 2026-10-12 03:39 UTC, CA variant `47373155631388` / inventory item `49415821394204`: available 6, committed 4, on hand 10, CAD39.99, DENY, tracked, shipping required. Second product `10168145281308` / variant `51937870741788` / item `53683139543324`: available 42, DENY, separate pool. Its base CAD31.99 and description US31.99 require separate market review; no price change is proposed. Both use SKU `61-1V3E-WRUS`; identical SKU does not mean shared inventory.

ByteStand location `93885759772`, service `66989752604` (`fba-shipping`). General shipping profile `101300142364` has the ByteStand location group with CA/US free rates; other locations have no rates. An installed integration and rates do not prove automatic fulfillment retry or readiness of inbound Amazon inventory.

## Merchant setting plan — do only after explicit release approval

1. Confirm current CA inventory and market mapping again. Open Shopify Products → Canadian Lemonade product `8904882422044` → variant `47373155631388`. Do not select both products by shared SKU.
2. In Inventory, retain **Track quantity** and enable **Continue selling when out of stock** for this CA variant only. Save only after explicit approval. Preserve SKU, price, inventory quantities, locations, shipping profile and committed customer orders. Do not fake inventory or enable the second variant.
3. Release the reviewed theme change through the normal approved workflow. Main auto-deploys; do not merge until required QA succeeds. Coordinate policy activation with the disclosure being available.
4. Verify the zero-stock/continue state in an authorized isolated preview or agreed test procedure; do not reduce live stock just to test. Check desktop/mobile, changing variants, add-to-cart, cart drawer, full cart and express checkout. Confirm no stale fast-delivery claim remains in the purchase flow. These browser checks are still a launch gate; local render fixtures are not a Shopify checkout test.

## Fulfillment decision and operating checks before accepting backorders

- Owner must confirm Amazon MYI/inbound availability and ByteStand auto-request behavior: whether requests are rejected, held, or retried when FBA is unavailable, and who resubmits them. No automatic hold or retry has been established by this work.
- Name the person responsible for inspecting every affected order and its fulfillment order/request status. Check unfulfilled, rejected and on-hold orders directly; zero-inventory orders may not trigger Shopify Flow “ready to fulfill,” which requires available inventory. Do not rely on that trigger as the backorder safety net.
- After replenishment, verify the fulfillment request is accepted and tracking returns to Shopify. Prevent duplicate requests or duplicate manual shipment. A successful checkout is not proof of Amazon dispatch.
- If hand delivery is needed, agree eligible addresses, timing, customer communication and an appropriate fulfillment path before promising it. The current alternative locations lack shipping rates; no universal hand-delivery service has been configured. Do not create a second fulfillment alongside an Amazon request.
- Retain explicit owner release approval as the final gate. If the estimate cannot be met, return the wording/operating decision to the owner before launch. Do not silently change approved wording.

## Validation

`NODE_PATH=/workspace/ehp-shopify-tools/node_modules node tests/backorder-render.cjs`: seven rendered purchase states (in stock, deny, zero/negative continue, untracked, other market, unavailable), mixed-cart scoping and eligibility-disable fixture; Liquid/JSON/CSS parsing; exact-count removal; variant-update hook. `node --check assets/product-info.js` and `git diff --check`.

Shopify Theme Check comparison against current main: 3 existing findings in changed files, 3 in the draft, no added findings. This is a baseline comparison, not a clean whole-theme result.

Release authorization supersedes the initial CI0 staging request. CI0 designation has been removed. The required preview gate now runs actual-stock and isolated simulated-zero desktop/mobile product/add/cart/quantity/discount/checkout-navigation tests. Simulated inputs are confined to the development theme package and do not change Shopify inventory. No payment submission or test order.

Reference: https://shopify.dev/docs/api/liquid/objects/variant (tracked inventory, inventory policy and quantity semantics).

## Narrow rollback

If policy activation/readback fails, keep or restore CA policy DENY only (expected-current check first). If a theme regression appears, restore only the changed existing theme files from the recorded pre-release snapshot; leave new unused asset/snippet files harmlessly in place. Do not roll back unrelated main commits, quantities or customer orders. Existing orders still require fulfillment review. Pre-release source snapshot: `/workspace/ehp-evidence/backorder-pre-live.json`.

Live drift check: seven existing deployment Liquid/JS files match main; locale differs only by Shopify's generated comment header. Live settings_schema lacks an unrelated announcement group, so this change no longer edits settings_schema. Live product template differs only by its generated comment; product template and settings_data are not deployed.


## Verified fixture and cart redraw correction (2026-10-12)

The CI development theme was deleted by cleanup before its fixture bytes could be read. A separate unpublished diagnostic copy, 183588880668 (`ehp-ca-zero-readback-e8fe6de`), received the nine proposed files plus the two generated zero-state transformations. Admin readback matched all Liquid/JS/CSS exactly; locale content differed only by Shopify's generated comment. Native Safari confirmed the exact notice on product, drawer and cart, and CA product/quantity2 at checkout. This proves the fixture logic works; the earlier CI fixture-delivery failure was not evidence of broken conditional logic. The gate now reads both uploaded fixture files back and requires exact hashes, then uses distinct preview URLs for actual and simulated stock states.

Native testing exposed a baseline false cart error: the custom header lacks `cart-icon-bubble`; cart.js updated the drawer, then threw when trying to redraw the absent optional header element. The correction skips absent targets, matching existing drawer rendering behavior. The regression test executes the actual source: baseline fails, corrected source succeeds, and malformed responses still report errors. Both drawer and full-cart browser checks now require clean error containers after quantity redraw, before page reload can clear them.

At 04:47 UTC native verification on the corrected unpublished diagnostic theme passed drawer2→3→2, totals CAD79.98→119.97→79.98, no visible/accessibility error, fresh cart quantity2, and checkout product/quantity2. Checkout subtotal79.98, estimated tax4.00,total83.98CAD; shipping still requires an address. No order was placed. Native viewport828 was readable; the required CI retains dedicated1440/390 desktop/mobile coverage in both stock states.

Do not publish diagnostic theme183588880668: it contains simulated inventory inputs. Retain for review, then include in later authorized cleanup. Production repository snippet still reads real variant inventory quantity and policy. No live quantity or policy changes were used for diagnosis.
