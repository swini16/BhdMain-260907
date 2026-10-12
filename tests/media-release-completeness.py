import importlib.util
import unittest
from unittest.mock import patch
from pathlib import Path

spec = importlib.util.spec_from_file_location('media_check', Path(__file__).resolve().parents[1] / 'scripts/check-media-release-completeness.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Completeness(unittest.TestCase):
    def setUp(self):
        self.routes = {'/pages/folio-hydration-feature', '/pages/cbc-edmonton-am'}
        self.articles = [{'handle': str(i), 'publishedAt': f'2026-10-12T22:09:{i:02d}Z',
                          'isPublished': True, 'tags': ['Press', 'Media'],
                          'body': f'<a href="{route}">Story</a>'} for i, route in enumerate(sorted(self.routes))]
        self.press = ''.join(a['body'] for a in self.articles)
        self.news = '<a class="bhd-blog-intro__featured" href="/blogs/news/1">Latest article</a>'

    def check(self):
        return module.evaluate(self.routes, self.articles, self.press, self.news)

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
        self.articles[0]['tags'] = ['Media']
        self.assertTrue(any('tags' in e for e in self.check()))

    def test_stale_hero(self):
        self.news = '<a class="bhd-blog-intro__featured" href="/blogs/news/old">Old</a>'
        self.assertTrue(any('hero' in e for e in self.check()))

    def test_missing_press_discovery(self):
        self.press = ''
        self.assertTrue(any('Press & Media links' in e for e in self.check()))

    def test_empty_inventory_fails(self):
        self.assertTrue(module.evaluate(set(), [], '', ''))

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


if __name__ == '__main__':
    unittest.main()
