#!/usr/bin/env python3
"""Read-only release check. Never creates, updates or publishes content."""
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlsplit

ORIGIN = 'https://besthydrate.com'
ATOM = {'a': 'http://www.w3.org/2005/Atom'}


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()
        self.hero = None
        self.hero_title = ''
        self.in_hero = False
        self.in_hero_title = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and attrs.get('href'):
            target = urlsplit(urljoin(ORIGIN, attrs['href']))
            if target.netloc != urlsplit(ORIGIN).netloc:
                return
            self.paths.add(target.path.rstrip('/'))
            if 'bhd-blog-intro__featured' in attrs.get('class', '').split():
                self.hero = target.path.rstrip('/')
                self.in_hero = True
        if tag == 'strong' and self.in_hero:
            self.in_hero_title = True

    def handle_endtag(self, tag):
        if tag == 'strong':
            self.in_hero_title = False
        if tag == 'a':
            self.in_hero = False
            self.in_hero_title = False

    def handle_data(self, data):
        if self.in_hero_title:
            self.hero_title += data


def links(markup):
    parser = Links()
    parser.feed(markup)
    return parser


class TaggedArchive(HTMLParser):
    """Only article-grid links count; hero/navigation links cannot prove membership."""
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.depth = 0
        self.found_grid = False
        self.articles = set()
        self.pages = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div':
            if self.depth:
                self.depth += 1
            elif 'blog-articles' in attrs.get('class', '').split():
                self.depth = 1
                self.found_grid = True
        if tag == 'a' and attrs.get('href'):
            target = urlsplit(urljoin(ORIGIN, attrs['href']))
            if target.netloc != urlsplit(ORIGIN).netloc:
                return
            if (self.depth and 'full-unstyled-link' in attrs.get('class', '').split()
                    and target.path.startswith('/blogs/news/') and '/tagged/' not in target.path):
                self.articles.add(target.path.rstrip('/'))
            if target.path == self.path and 'pagination__item' in attrs.get('class', '').split():
                page = parse_qs(target.query).get('page', [])
                if len(page) == 1 and page[0].isdigit():
                    self.pages.add(ORIGIN + self.path + '?page=' + page[0])

    def handle_endtag(self, tag):
        if tag == 'div' and self.depth:
            self.depth -= 1


def read_tagged_articles(tag):
    path = '/blogs/news/tagged/' + tag.lower()
    pending, seen, articles = [ORIGIN + path], set(), set()
    while pending:
        url = pending.pop()
        if url in seen:
            continue
        if len(seen) >= 20:
            raise ValueError('Tagged News pagination limit reached')
        seen.add(url)
        page = TaggedArchive(path)
        page.feed(read_public(url))
        if not page.found_grid:
            raise ValueError(f'{tag}: public tagged article grid missing')
        articles.update(page.articles)
        pending.extend(page.pages - seen)
    return articles


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


def evaluate(routes, articles, press_html, news_html, tagged_articles):
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
        elif not any(all('/blogs/news/' + a['handle'] in tagged_articles.get(tag, set())
                         for tag in ('Media', 'Press')) for a in matches):
            errors.append(f'{route}: corresponding News entry missing from Media/Press tagged archives')
    if not published:
        errors.append('No published News articles; latest hero cannot be verified.')
    else:
        latest_time = max(datetime.fromisoformat(a['publishedAt'].replace('Z', '+00:00')) for a in published)
        latest_paths = {'/blogs/news/' + a['handle'] for a in published
                        if datetime.fromisoformat(a['publishedAt'].replace('Z', '+00:00')) == latest_time}
        hero = links(news_html)
        if hero.hero not in latest_paths:
            errors.append('News latest-article hero does not select a newest published article')
        else:
            selected = next(a for a in published if '/blogs/news/' + a['handle'] == hero.hero)
            if not selected.get('title') or hero.hero_title.strip() != selected['title']:
                errors.append('News latest-article hero title does not exactly match the selected article')
    return errors


def read_public(url):
    if urlsplit(url).netloc != urlsplit(ORIGIN).netloc:
        raise ValueError('Refusing off-store URL')
    request = urllib.request.Request(url, headers={'User-Agent': 'BHD-media-release-check/1.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        if (response.status != 200 or urlsplit(response.url).netloc != urlsplit(ORIGIN).netloc
                or urlsplit(response.url).path.rstrip('/') != urlsplit(url).path.rstrip('/')):
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
                             'title': entry.findtext('a:title', None, ATOM),
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
        result['latestHero'] = links(news).hero
        result['latestHeroTitle'] = links(news).hero_title.strip()
        tagged = {tag: read_tagged_articles(tag) for tag in ('Media', 'Press')}
        result['taggedArchiveArticles'] = {tag: sorted(paths) for tag, paths in tagged.items()}
        result['errors'] = evaluate(routes, articles, press, news, tagged)
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
