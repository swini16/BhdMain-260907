"""Generate Shopify alternate templates only in the disposable preview package.

Approved source is unchanged. Copies substitute only Page/request context and
namespace snippet calls, so Shopify renders the same Liquid/CSS on a visible
carrier Page. Hashes bind each copy to its exact original and transformation.
"""
import hashlib
import json
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1]).resolve()
if root == pathlib.Path.cwd().resolve():
    raise SystemExit('Fixtures must be generated outside the source checkout')
manifest = {}
names = ['bhd-page-dispatch', 'bhd-page-media-alliance', 'bhd-page-header', 'bhd-page-breadcrumbs', 'bhd-menu-descendants']
sha = lambda value: hashlib.sha256(value.encode()).hexdigest()
for kind, handle, title in [('folio', 'folio-hydration-feature', 'U of Alberta’s Folio: U of A researcher lends expertise to boost the science of oral hydration'), ('cbc', 'cbc-edmonton-am', "CBC Edmonton AM: A sports drink that could help with Crohn's disease")]:
    mapping = {name: f'qa-{kind}-{name}' for name in names}
    def context_copy(source):
        result = source
        # Substitute object-property expressions only inside Liquid tags/output;
        # never change copy, HTML, CSS or link destinations.
        def transform(match):
            tag = match[0]
            tag = re.sub(r'\bpage\.handle\b', "'" + handle + "'", tag)
            tag = re.sub(r'\bpage\.title\b', json.dumps(title, ensure_ascii=False), tag)
            tag = re.sub(r'\brequest\.path\b', "'/pages/" + handle + "'", tag)
            for original, target in mapping.items():
                tag = re.sub(r"(\brender\s+)(['\"])" + re.escape(original) + r'\2', lambda m: m[1] + m[2] + target + m[2], tag)
            return tag
        return re.sub(r'{[%{].*?[%}]}', transform, result, flags=re.S)
    files = {}
    for name in names:
        original = f'snippets/{name}.liquid'
        source = (root / original).read_text()
        target = f'snippets/{mapping[name]}.liquid'
        rendered = context_copy(source)
        (root / target).write_text(rendered)
        files[target] = {'source': original, 'sourceSha256': sha(source), 'fixtureSha256': sha(rendered)}
    original = 'sections/main-page.liquid'
    source = (root / original).read_text()
    rendered = context_copy(source)
    section = f'qa-media-{kind}'
    target = f'sections/{section}.liquid'
    (root / target).write_text(rendered)
    files[target] = {'source': original, 'sourceSha256': sha(source), 'fixtureSha256': sha(rendered)}
    template = json.loads((root / 'templates/page.json').read_text())
    assert template['sections']['main']['type'] == 'main-page'
    template['sections']['main']['type'] = section
    (root / f'templates/page.qa-media-{kind}.json').write_text(json.dumps(template))
    manifest[kind] = {'handle': handle, 'carrier': f'/pages/press?view=qa-media-{kind}', 'files': files}
pathlib.Path('artifacts/media-review').mkdir(parents=True, exist_ok=True)
pathlib.Path('artifacts/media-fixtures.json').write_text(json.dumps(manifest, indent=2))
pathlib.Path('artifacts/media-review/source-fixtures.json').write_text(json.dumps(manifest, indent=2))
print('Generated source-bound Folio/CBC alternate templates in disposable package')
