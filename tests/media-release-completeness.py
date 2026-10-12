import importlib.util
import json
import unittest
from unittest.mock import patch
from pathlib import Path

spec = importlib.util.spec_from_file_location('media_check', Path(__file__).resolve().parents[1] / 'scripts/check-media-release-completeness.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Completeness(unittest.TestCase):
    def setUp(self):
        self.routes = {'/pages/folio-hydration-feature', '/pages/cbc-edmonton-am'}
        self.articles = [{'handle': str(i), 'title': f'Article {i}', 'publishedAt': f'2026-10-12T22:09:{i:02d}Z',
                          'isPublished': True, 'tags': ['Press', 'Media'],
                          'body': f'<a href="{route}">Story</a>'} for i, route in enumerate(sorted(self.routes))]
        self.press = ''.join(a['body'] for a in self.articles)
        self.news = '<a class="bhd-blog-intro__featured" href="/blogs/news/1"><span>Latest article</span><strong>Article 1</strong></a>'
        self.tagged = {tag: {'/blogs/news/0', '/blogs/news/1'} for tag in ('Media', 'Press')}

    def check(self):
        return module.evaluate(self.routes, self.articles, self.press, self.news, self.tagged)

    def test_complete(self):
        self.assertEqual(self.check(), [])

    def test_new_lp_without_news_is_incomplete(self):
        self.routes.add('/pages/new-media-feature')
        self.press += '<a href="/pages/new-media-feature">New coverage</a>'
        self.assertTrue(any('no published News' in e for e in self.check()))

    def test_draft_does_not_count(self):
        self.articles[0]['isPublished'] = False
        self.assertTrue(any('no published News' in e for e in self.check()))

    def test_missing_press_tag(self):
        self.tagged['Press'].remove('/blogs/news/0')
        self.assertTrue(any('tagged archives' in e for e in self.check()))

    def test_stale_hero(self):
        self.news = '<a class="bhd-blog-intro__featured" href="/blogs/news/old">Old</a>'
        self.assertTrue(any('hero' in e for e in self.check()))

    def test_missing_press_discovery(self):
        self.press = ''
        self.assertTrue(any('Press & Media links' in e for e in self.check()))

    def test_wrong_hero_title_fails(self):
        self.news = self.news.replace('Article 1', 'Old title')
        self.assertTrue(any('hero title' in e for e in self.check()))

    def test_hero_title_entities_are_decoded(self):
        self.articles[1]['title'] = 'News & Media'
        self.news = self.news.replace('Article 1', 'News &amp; Media')
        self.assertEqual(self.check(), [])

    def test_empty_inventory_fails(self):
        self.assertTrue(module.evaluate(set(), [], '', '', {}))

    def test_current_source_routes(self):
        self.assertEqual(module.required_routes(Path(__file__).resolve().parents[1]),
                         {'/pages/folio-hydration-feature', '/pages/cbc-edmonton-am', '/pages/edmonton-journal-feature'})

    def test_feed_pagination_uses_publication_date_and_tags(self):
        first = '''<feed xmlns="http://www.w3.org/2005/Atom">
        <link rel="next" href="/blogs/news.atom?page=2"/>
        <entry><link href="/blogs/news/example"/>
        <published>2026-10-12T22:09:22Z</published><updated>2026-10-13T00:00:00Z</updated>
        <category term="Media"/><category term="Press"/>
        <content type="html">&lt;a href="/pages/cbc-edmonton-am"&gt;CBC&lt;/a&gt;</content></entry></feed>'''
        with patch.object(module, 'read_public', side_effect=[first, '<feed xmlns="http://www.w3.org/2005/Atom"/>']) as read:
            result = module.read_news_feed()
        self.assertEqual(result[0]['publishedAt'], '2026-10-12T22:09:22Z')
        self.assertEqual(result[0]['tags'], ['Media', 'Press'])
        self.assertIn('/pages/cbc-edmonton-am', module.links(result[0]['body']).paths)
        self.assertEqual(read.call_args.args[0], module.ORIGIN + '/blogs/news.atom?page=2')

    def test_feed_cycles_fail(self):
        feed = '<feed xmlns="http://www.w3.org/2005/Atom"><link rel="next" href="/blogs/news.atom"/></feed>'
        with patch.object(module, 'read_public', return_value=feed):
            with self.assertRaisesRegex(ValueError, 'Repeated'):
                module.read_news_feed()

    def test_actual_cbc_feed_omits_admin_tags_without_losing_coverage(self):
        fixtures = Path(__file__).parent / 'fixtures'
        entry = (fixtures / 'media-news-cbc-entry.xml').read_text()
        hero = (fixtures / 'media-news-cbc-hero.html').read_text()
        admin = json.loads((fixtures / 'media-news-admin-readback.json').read_text())[0]
        with patch.object(module, 'read_public', return_value='<feed xmlns="http://www.w3.org/2005/Atom">' + entry + '</feed>'):
            articles = module.read_news_feed()
        self.assertEqual(articles[0]['tags'], [])  # Real feed omits categories; never invent tags.
        self.assertTrue({'Media', 'Press'}.issubset(admin['tags']))
        self.assertEqual(articles[0]['title'], admin['title'])
        self.assertEqual(module.links(hero).hero_title, admin['title'])
        tagged = {tag: {'/blogs/news/' + admin['handle']} for tag in ('Media', 'Press')}
        self.assertEqual(module.evaluate({'/pages/cbc-edmonton-am'}, articles,
                                        articles[0]['body'], hero, tagged), [])
        self.assertTrue(module.evaluate({'/pages/cbc-edmonton-am'}, articles,
                                        articles[0]['body'], hero, {}))

    def test_tagged_archive_excludes_hero_and_follows_pagination(self):
        first = '''<a class="bhd-blog-intro__featured" href="/blogs/news/wrong">Hero</a>
        <div class="blog-articles"><div><a class="full-unstyled-link" href="/blogs/news/one">One</a></div><a href="/blogs/news/excerpt-link">Excerpt</a></div>
        <a href="/blogs/news/outside">Navigation</a>
        <a class="pagination__item" href="/blogs/news/tagged/media?page=2">2</a>'''
        second = '''<div class="blog-articles"><a class="full-unstyled-link" href="/blogs/news/two">Two</a></div>
        <a class="pagination__item" href="/blogs/news/tagged/media?page=2">2</a>'''
        with patch.object(module, 'read_public', side_effect=[first, second]) as read:
            self.assertEqual(module.read_tagged_articles('Media'), {'/blogs/news/one', '/blogs/news/two'})
        self.assertEqual(read.call_count, 2)

    def test_missing_tagged_grid_fails_closed(self):
        with patch.object(module, 'read_public', return_value='<a href="/blogs/news/one">One</a>'):
            with self.assertRaisesRegex(ValueError, 'grid missing'):
                module.read_tagged_articles('Press')


if __name__ == '__main__':
    unittest.main()
