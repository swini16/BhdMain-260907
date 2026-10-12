#!/usr/bin/env python3
"""Read-only release check. Never creates, updates or publishes content."""
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit

ORIGIN = 'https://besthydrate.com'
ATOM = {'a': 'http://www.w3.org/2005/Atom'}


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()
        self.hero = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and attrs.get('href'):
            target = urlsplit(urljoin(ORIGIN, attrs['href']))
            if target.netloc != urlsplit(ORIGIN).netloc:
                return
            self.paths.add(target.path.rstrip('/'))
            if 'bhd-blog-intro__featured' in attrs.get('class', '').split():
                self.hero = target.path.rstrip('/')


def links(markup):
    parser = Links()
    parser.feed(markup)
    return parser


def required_routes(root):
    dispatch = (root / 'snippets/bhd-page-dispatch.liquid').read_text()
    routes = set()
    for handles, snippet in re.findall(r"{%\s*when\s+(.*?)\s*%}\s*{%\s*render\s+'([^']+)'", dispatch):
        if snippet == 'bhd-page-media-alliance' or snippet.endswith('-feature'):
            routes.update('/pages/' + h for h in re.findall(r"'([^']+)'", handles))
    press = (root / 'snippets/bhd-page-press.liquid').read_text()
    featured = re.search(r'<section[^>]*aria-labelledby="BhdPressCoverage-[\s\S]*?</section>', press)
    if not featured or not routes:
        raise ValueError('Media release inventory missing; review routing/Press coverage before release.')
    routes.update(p for p in links(featured.group()).paths if p.startswith('/pages/'))
    return routes


def evaluate(routes, articles, press_html, news_html):
    errors = []
    if not routes:
        errors.append('No media routes discovered; cannot certify release completeness.')
    published = [a for a in articles if a['isPublished'] and a.get('publishedAt')]
    for route in sorted(routes):
        if route not in links(press_html).paths:
            errors.append(f'{route}: absent from public Press & Media links')
        matches = [a for a in published if route in links(a['body']).paths]
        if not matches:
            errors.append(f'{route}: no published News article links to this media landing page')
        elif not any({'Media', 'Press'}.issubset(set(a['tags'])) for a in matches):
            errors.append(f'{route}: corresponding News entry lacks Media/Press tags')
    if not published:
        errors.append('No published News articles; latest hero cannot be verified.')
    else:
        latest_time = max(datetime.fromisoformat(a['publishedAt'].replace('Z', '+00:00')) for a in published)
        latest_paths = {'/blogs/news/' + a['handle'] for a in published
                        if datetime.fromisoformat(a['publishedAt'].replace('Z', '+00:00')) == latest_time}
        if links(news_html).hero not in latest_paths:
            errors.append('News latest-article hero does not select a newest published article')
    return errors


def read_public(url):
    if urlsplit(url).netloc != urlsplit(ORIGIN).netloc:
        raise ValueError('Refusing off-store URL')
    request = urllib.request.Request(url, headers={'User-Agent': 'BHD-media-release-check/1.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200 or urlsplit(response.url).netloc != urlsplit(ORIGIN).netloc:
            raise ValueError('Unexpected public response')
        return response.read().decode('utf-8')


def read_news_feed():
    articles, seen = [], set()
    url = ORIGIN + '/blogs/news.atom'
    for _ in range(20):
        if url in seen:
            raise ValueError('Repeated News feed page')
        seen.add(url)
        feed = ET.fromstring(read_public(url))
        if len(seen) == 1:
            first_entry = feed.find('a:entry', ATOM)
            if first_entry is not None:
                print('FEED_ENTRY_EVIDENCE ' + ET.tostring(first_entry, encoding='unicode'))
        for entry in feed.findall('a:entry', ATOM):
            alternate = next((n.get('href') for n in entry.findall('a:link', ATOM)
                              if n.get('rel', 'alternate') == 'alternate'), None)
            alternate = urljoin(url, alternate) if alternate else None
            if not alternate or not urlsplit(alternate).path.startswith('/blogs/news/'):
                raise ValueError('News feed article URL missing or unexpected')
            content = entry.find('a:content', ATOM)
            body = content.text if content is not None and content.text else read_public(alternate)
            if content is not None and content.get('type') == 'xhtml':
                for node in content.iter():
                    node.tag = node.tag.split('}')[-1]
                body = ET.tostring(content, encoding='unicode')
            articles.append({'handle': urlsplit(alternate).path.rstrip('/').split('/')[-1],
                             'publishedAt': entry.findtext('a:published', None, ATOM),
                             'isPublished': True,
                             'tags': [n.get('term') or n.text or '' for n in entry.findall('a:category', ATOM)],
                             'body': body})
        next_url = next((n.get('href') for n in feed.findall('a:link', ATOM) if n.get('rel') == 'next'), None)
        if not next_url:
            return articles
        url = urljoin(url, next_url)
    raise ValueError('News feed pagination limit reached; release verification incomplete')


def main():
    root = Path(__file__).resolve().parents[1]
    result = {'readOnly': True, 'routes': [], 'publishedNewsCount': 0, 'latestHero': None, 'errors': []}
    try:
        routes = required_routes(root)
        result['routes'] = sorted(routes)
        articles = read_news_feed()
        result['publishedNewsCount'] = len(articles)
        press = read_public(ORIGIN + '/pages/press')
        news = read_public(ORIGIN + '/blogs/news')
        hero = re.search(r'<a[^>]*class="[^"]*bhd-blog-intro__featured[^"]*"[\s\S]*?</a>', news)
        print('HERO_HTML_EVIDENCE ' + (hero.group() if hero else 'MISSING'))
        result['latestHero'] = links(news).hero
        result['errors'] = evaluate(routes, articles, press, news)
        for route in sorted(routes):
            if not read_public(ORIGIN + route).strip():
                result['errors'].append(f'{route}: empty public landing page')
    except (ValueError, OSError, ET.ParseError) as error:
        result['errors'].append(f'Public verification incomplete: {error}')
    Path('artifacts').mkdir(exist_ok=True)
    Path('artifacts/media-release-completeness.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
    if result['errors']:
        raise SystemExit('INCOMPLETE MEDIA RELEASE: review missing entries; this check cannot publish them.')


if __name__ == '__main__':
    main()
