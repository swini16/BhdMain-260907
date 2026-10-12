# Media News publication and completeness check

Owner approved publication of the two reviewed News entries on October 12, 2026. The earlier draft JSON and copy preview are retained as historical review artifacts, not executable publication instructions.

| Entry | Shopify Article ID | Actual publication time (UTC) |
| --- | --- | --- |
| [U of Alberta’s Folio](https://besthydrate.com/blogs/news/best-hydrate-u-alberta-folio-hydration-research) | 613994758428 | 2026-10-12 22:09:10 |
| [CBC Edmonton AM](https://besthydrate.com/blogs/news/best-hydrate-cbc-edmonton-am-interview) | 613994791196 | 2026-10-12 22:09:22 |

Independent Admin API readback confirmed exact reviewed titles, bodies, summaries, destination links and Media/Press tag sets. Inventory increased from 22 to 24 articles and from 11 to 13 published articles. Every pre-existing article was unchanged. Journal remains published. CBC is newest by publication timestamp; public HTML hero verification is recorded separately by CI.

`scripts/check-media-release-completeness.py` performs anonymous HTTP GETs only. The canonical LP quality workflow runs it during PR review and after the existing main sync. It discovers media routes from dispatch snippets ending `-feature`, the shared media-alliance snippet, and featured Press coverage cards. For new media components, maintain this routing convention or extend discovery and its regression tests.

The check requires each discovered landing page to be publicly reachable, linked from Press, and represented by a published News entry present in both public Media and Press tagged article grids. Shopify's observed Atom entries omit tags, so tag membership is verified separately through those paginated grids. It checks the public News hero URL and exact rendered title against the latest publication timestamp and title in the public Atom feed. Failures and network errors mark the check incomplete and produce a JSON receipt. An unpublished staged landing page is expected to remain incomplete until an owner-approved coordinated release.

Run offline regression tests with `python3 tests/media-release-completeness.py`. Public checks run on the existing authorized GitHub runner; no browser is used by this check. It has no Admin API credentials, mutations, scheduler or authority to create, backdate, publish or edit any content. Existing workflow branch protection and advisory/required job behavior are unchanged; operators must resolve or explicitly review an incomplete media release before declaring it complete.
