# Public feed regression evidence

`media-news-cbc-entry.xml` and `media-news-cbc-hero.html` were extracted from the public HTTP diagnostics in GitHub job [115033386211](https://github.com/swini16/BhdMain-260907/actions/runs/38316227721/job/115033386211), captured October 12, 2026 at 22:22:03 UTC. Runner log timestamps and trailing whitespace were removed; ElementTree serialized the entry with its `ns0` namespace prefix. These are actual public response fragments, not fabricated category fixtures.

The CBC Atom entry has full content, publication time, title and URL, but no category elements. `media-news-admin-readback.json` contains the matching authoritative Admin API publication-readback fields for CBC, Folio and Journal. All three have Media and Press tags. This snapshot is test evidence only; it is not a runtime source of truth.

The runtime check reads current public `/blogs/news/tagged/media` and `/blogs/news/tagged/press` article grids to verify tag membership. It follows their pagination and only counts article-card links inside `.blog-articles`, excluding hero and navigation links. It fails closed for missing grids, missing coverage or exhausted pagination. No tags are synthesized into feed entries, and no Admin credentials are introduced.
