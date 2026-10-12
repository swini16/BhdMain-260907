# Staged outlet/headline format

These changes are staged locally only. No article title, page title, publication date or other Shopify content was written. No browser was used and no new preview workflow was started. PR #236 is a separate, owner-approved release.

| Outlet | Proposed News title, landing-page H1 and Press card heading |
| --- | --- |
| CBC Edmonton AM | CBC Edmonton AM: A sports drink that could help with Crohn's disease |
| U of Alberta’s Folio | U of Alberta’s Folio: U of A researcher lends expertise to boost the science of oral hydration |
| Edmonton Journal | Edmonton Journal: Thirsty? Edmonton product developers enter the sports drink market |

CBC wording comes from the owner-supplied CBC Listen screenshot already verified for PR #235 (Library `libfile_241243cdd7c8819191c42cf6a6563701`). Folio wording comes from the official publisher headline previously verified for PR #234. Journal wording is preserved in the approved PR #209 landing-page source (`13840b17fa4b2146b12e2e3b2e3bb247d0782fdf`) and independently matches the existing published News article body. No new external headline wording has been inferred from a URL or invented summary. Journal was not freshly fetched from the publisher in this task.

The page H1 now carries the attributed headline; its previous duplicate source H2 becomes “Original reporting.” Source attribution, excerpts, dates, URLs and research cautions remain unchanged. Only the three Press card headings change. Product, inventory, homepage banner and protected checkout content are unchanged.

The staged JSON records each existing article ID, freshly read title/update timestamp, retained handle/publication timestamp, and proposed replacement title. It is a review manifest, not an executable mutation. Before any later title-only write, re-read the article and stop if its title or update timestamp differs, preserving any intervening owner edits. Do not recreate or republish articles.

Preview fixture titles and the existing heading assertions are updated to the proposed wording. CBC includes an apostrophe, so the fixture builder uses a double-quoted Liquid string via JSON encoding. Existing captured public-response regression fixtures stay unchanged as historical evidence.

Validation: 15 completeness regression tests; Python fixture-builder compilation; JavaScript test-file syntax; workflow YAML parsing; full diff whitespace check. Full comparative Shopify Theme Check results are saved separately. Browser previews and new live title verification remain release gates.
