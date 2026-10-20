# PR #238: localization harness correction and preview retest

## State

Staged for review and preview retesting against PR head `63f3a2d33654e6228abc87fd3b1d7d1f428d0b43`.
This change modifies the Playwright harness and adds offline regression tests. It does not modify theme files, discount configuration, workflow gates or browser sandbox settings.

The staged branch is separate from PR #238. Updating that PR triggers its development-theme upload automatically. This diagnosis did not update the PR, start another preview run, create a theme, publish, merge, submit a contact/signup form, or place an order.

## What the evidence establishes

| Finding | Evidence and limit |
| --- | --- |
| Four acceptance cases stopped in localization setup | Failed run 39465460381: CA/US on desktop/mobile, including retries. Quantity and FIRST15 arrays are empty; checkout is “not reached.” |
| The request omits documented form fields | PR head sends no `_method=put` or `utf8=✓`. Shopify's generated localization form and the existing purchase-flow harness include both. `language_code` is documented and remains unchanged. |
| The error hides the failing hop | `page.request.post()` automatically follows redirects. The old `localize.ok()` assertion cannot distinguish an initial POST failure from a failing redirect destination. |
| The API request already shares browser cookies | `page.request` and `context.request` are the same context-associated client. Swapping them or copying cookies manually is unsupported by this evidence. |
| Failed setup still caused cleanup writes | The original `finally` unconditionally posted cart clear/update even when localization failed. Cleanup is now armed only after verified setup. |
| Exact original HTTP status and redirect chain remain unknown | GitHub returned an artifact file reference, but transfer to the workspace failed and then timed out after 45 seconds with zero bytes. No trace or screenshot was inspected. |

The form mismatch is a source-confirmed harness defect. It is **not yet proven to be the original run's root cause**. No production theme defect has been established.

The failed workflow installed `@shopify/cli@latest`; its exact resolved version was not present in the inspected logs. Current official CLI source rewrites non-checkout redirects to local paths, but that source cannot be substituted for the failed runner's exact version.

## Changes

- Send Shopify's documented localization fields through the existing shared API context.
- Keep the theme ID and QA attribution in the POST URL and return path. Return to the homepage first so a missing market-specific product route is reported separately.
- Disable automatic API redirects for every request. Record each HTTP status and sanitized Location, follow at most five same-origin redirects, and reject foreign origins, ports, mismatched/duplicate theme IDs, malformed Locations and unexpected 307/308 POST replay.
- Navigate with the browser and record its redirect response chain. Validate every observed hop and the final URL, then require the rendered theme ID, country and currency.
- Preserve all quantity, cart, FIRST15, non-stacking and pre-order checkout assertions. Recheck preview identity when visiting the product and cart pages.
- Attach per-case localization JSON and print it within `LEMONADE_ACCEPTANCE`. Include cookie names/scope flags, never cookie values, response bodies, credentials or arbitrary query values.
- Perform no cart cleanup when setup fails before cart work begins.

Browser navigation can follow HTTP redirects before their chain is inspected. The harness rejects an escaped preview before accepting the page; it does not claim that those browser GET requests were prevented.

## Validation

Validation: **72 offline tests passed**, with zero failures, skips or cancellations. JavaScript syntax checks passed for the helper and acceptance spec. The cases include redirects, error-status retention, preview identity, redaction, and the real acceptance callback's zero cart writes after failed setup.

Run the offline behavioral suite with:

```sh
node tests/unit/preview-localization.test.cjs
node --check tests/playwright/helpers/preview-localization.cjs
node --check tests/playwright/pr-preview-gate.spec.cjs
```

These fixtures make no network requests and require no additional dependencies. They test the actual helper and exercise the acceptance setup/cleanup integration with a stub Playwright test registration.

The direct command above executes Node's built-in test suite and reports all 72 cases in this workspace. The default isolated `node --test` launcher here reported only a file-level result, so that output was not used as proof of individual case execution. No CI or browser sandbox setting was changed.

The previously reported 39 code tests and zero newly introduced Theme Check errors belong to the supplied PR head. This staging change does not claim a new live preview pass or a fresh run of that unchanged theme suite.

## Preview retest handoff

1. Review this commit, then apply it to the PR #238 branch when ready for its existing preview workflow to run. Keep the current gates, sandbox and four-case CA/US desktop/mobile matrix.
2. Use a newly created, role-checked development theme. Theme 183760781596 was deleted by the failed run; do not reuse it or substitute the live theme. Record the resolved Shopify CLI and Playwright versions in the retest evidence.
3. Run the existing preview gate once. For each case, require the expected theme ID, CA/CAD or US/USD, then the existing quantity sequence 1 → 2 → 3 → 1, cart pricing, FIRST15/non-stacking checks and checkout opening.
4. Inspect the `lemonade-CA-localization` / `lemonade-US-localization` JSON attachment, with project name from the test case, plus `LEMONADE_ACCEPTANCE`. Distinguish the original POST status from subsequent GET statuses.
5. Leave checkout before entering identity/address/payment information or submitting an order. Do not submit contact, investor or signup forms. Verify the workflow deletes its exact temporary theme afterward.

| Retest evidence | Next diagnosis |
| --- | --- |
| Initial POST returns 4xx/5xx | Endpoint, request contract or renderer/proxy response; inspect that hop. |
| POST redirects, then a GET returns 4xx/5xx | Redirect destination or route failure; do not call it a POST status failure. |
| Localization succeeds but country/currency is wrong | Preview session or market persistence needs investigation. |
| Wrong origin or theme ID | Preview binding failed; stop before accepting cart setup. |
| No response / transport timeout | Transport failure; no HTTP status is established. |
| All four cases reach and pass downstream assertions | Preview acceptance evidence for the tested commit; publication still requires its separate approval. |

Form delivery remains untested.

## Sources

- [PR #238](https://github.com/swini16/BhdMain-260907/pull/238)
- [Failed run 39465460381](https://github.com/swini16/BhdMain-260907/actions/runs/39465460381)
- [Original trace artifact](https://github.com/swini16/BhdMain-260907/actions/runs/39465460381/artifacts/12284129511)
- [Shopify localization form output](https://shopify.dev/docs/api/liquid/tags/form#form-localization)
- [Shopify localization update example](https://shopify.dev/docs/storefronts/themes/markets/localization-discovery)
- [Playwright API request cookies and redirect options](https://playwright.dev/docs/api/class-apirequestcontext)
- [Official CLI proxy source, pinned for context only](https://github.com/Shopify/cli/blob/659cb76d5957bc0e8b26546d9ffcc844d090c051/packages/theme/src/cli/utilities/theme-environment/proxy.ts)
