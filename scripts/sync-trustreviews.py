#!/usr/bin/env python3
"""Sync the current TrustReviews review feed into a same-origin Shopify theme asset."""

from __future__ import annotations

import html
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

WIDGETS = {
    "8904882422044": "https://reviews.trustapps.co/_w/938e7cb7-8c69-47b7-976e-3082273b3445/8904882422044",
}

OUTPUT = Path("assets/bhd-reviews.json")

ITEM_RE = re.compile(
    r'<div(?=[^>]*class="[^"]*\breviews__item\b)(?=[^>]*data-id="([^"]+)")[^>]*>'
    r'(.*?)'
    r'(?=<div(?=[^>]*class="[^"]*\breviews__item\b)|\Z)',
    re.S,
)
AUTHOR_RE = re.compile(r'<h4[^>]*id="review-author"[^>]*>(.*?)</h4>', re.S)
BODY_RE = re.compile(r'<div[^>]*id="review-body"[^>]*>(.*?)</div>', re.S)
SOURCE_RE = re.compile(r'<div[^>]*class="[^"]*\bimport-by\b[^"]*"[^>]*>.*?Imported From:\s*([^<]+)', re.S)
RATING_RE = re.compile(r'"name":"review-rating".*?"data":\{"rating":([0-9]+(?:\.[0-9]+)?)', re.S)
COUNT_RE = re.compile(r'class="[^"]*\btr-review-count\b[^"]*"[^>]*>\s*([0-9]+)', re.S)


def text_from_html(fragment: str) -> str:
    fragment = re.sub(r"<br\s*/?>", "\n", fragment, flags=re.I)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(fragment)).strip()


def fetch(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "BestHydrate-TrustReviews-Sync/1.0",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def parse_reviews(document: str) -> tuple[list[dict], int | None]:
    expected_count = None
    count_match = COUNT_RE.search(document)
    if count_match:
        expected_count = int(count_match.group(1))

    reviews: list[dict] = []
    for match in ITEM_RE.finditer(document):
        review_id, block = match.groups()
        author_match = AUTHOR_RE.search(block)
        body_match = BODY_RE.search(block)
        if not author_match or not body_match:
            continue

        rating = 5
        rating_match = RATING_RE.search(block)
        if rating_match:
            rating = int(float(rating_match.group(1)))

        source = "TrustReviews"
        source_match = SOURCE_RE.search(block)
        if source_match:
            source = text_from_html(source_match.group(1))

        author = text_from_html(author_match.group(1))
        body = text_from_html(body_match.group(1))
        if not author or not body:
            continue

        reviews.append(
            {
                "id": review_id,
                "author": author,
                "rating": rating,
                "body": body,
                "source": source,
            }
        )

    return reviews, expected_count


def main() -> None:
    products = []
    for product_id, url in WIDGETS.items():
        document = fetch(url)
        reviews, expected_count = parse_reviews(document)

        if not reviews:
            raise SystemExit(f"No review cards parsed for product {product_id}. Refusing to overwrite.")

        if expected_count is not None and expected_count < len(reviews):
            raise SystemExit(
                f"TrustReviews count mismatch for {product_id}: widget says {expected_count}, "
                f"parser found {len(reviews)}."
            )

        ratings = [review["rating"] for review in reviews]
        rating = round(sum(ratings) / len(ratings), 1)
        products.append(
            {
                "product_id": product_id,
                "source_url": url,
                "rating": rating,
                "review_count": expected_count if expected_count is not None else len(reviews),
                "reviews": reviews,
            }
        )

    # Keep the current section's simple shape for the one supported reviewed product.
    payload = {
        "schema_version": 1,
        "source": "TrustReviews",
        "fetched_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        **products[0],
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Synced {len(payload['reviews'])} reviews for {payload['product_id']} "
        f"({payload['rating']:.1f}/5, {payload['review_count']} total) -> {OUTPUT}"
    )


if __name__ == "__main__":
    main()
