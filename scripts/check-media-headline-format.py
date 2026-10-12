"""Read-only exact title verification for the approved three-outlet release."""
import importlib.util
import json
from html.parser import HTMLParser
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('media_check', root / 'scripts/check-media-release-completeness.py')
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)


class Headings(HTMLParser):
    def __init__(self):
        super().__init__()
        self.current = None
        self.text = ''
        self.values = {'h1': [], 'h3': []}

    def handle_starttag(self, tag, attrs):
        if tag in self.values:
            self.current, self.text = tag, ''

    def handle_data(self, data):
        if self.current:
            self.text += data

    def handle_endtag(self, tag):
        if tag == self.current:
            self.values[tag].append(self.text.strip())
            self.current = None


def headings(path):
    parser = Headings()
    parser.feed(media.read_public(media.ORIGIN + path))
    return parser.values


def main():
    entries = json.loads((root / 'docs/media-title-format-staged-20261012.json').read_text())['entries']
    routes = ['cbc-edmonton-am', 'folio-hydration-feature', 'edmonton-journal-feature']
    feed = {a['handle']: a for a in media.read_news_feed()}
    press = headings('/pages/press')['h3']
    for entry, route in zip(entries, routes, strict=True):
        title = entry['title']
        assert feed[entry['handle']]['title'] == title, f'News title mismatch: {route}'
        assert headings('/pages/' + route)['h1'] == [title], f'Landing-page H1 mismatch: {route}'
        assert title in press, f'Press card title missing: {route}'
        assert headings('/blogs/news/' + entry['handle'])['h1'] == [title], f'News article H1 mismatch: {route}'
        print(json.dumps({'route': route, 'title': title, 'newsTitle': 'PASS', 'pageH1': 'PASS', 'pressCard': 'PASS', 'articleH1': 'PASS'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
