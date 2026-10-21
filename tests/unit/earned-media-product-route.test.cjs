const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'snippets/bhd-page-edmonton-journal-feature.liquid'), 'utf8');
const locale = JSON.parse(fs.readFileSync(path.join(root, 'locales/en.default.json'), 'utf8'));
const marker = 'data-bhd-ej-cta="early-product"';

test('exactly one early product link is placed before article outbound action', () => {
  assert.equal(source.split(marker).length - 1, 1);
  assert.ok(source.indexOf(marker) < source.indexOf('>Read the original article'));
  assert.ok(source.indexOf(marker) < source.indexOf('bhd-page__prose-grid'));
});
test('early link uses the established market-aware product route', () => {
  assert.match(source, /assign product_url = '\/products\/lemonade-best-hydrate'/);
  assert.match(source, /if localization.country.iso_code == 'US'[\s\S]*?assign product_url = '\/products\/lemonade-electrolyte-best-hydrate'/);
  assert.match(source, /href="\{\{ product_url \}\}" data-bhd-ej-cta="early-product"/);
});
test('localized copy is exact, descriptive, and contains no offer claim', () => {
  assert.equal(locale.bhd_earned_media.shop_product, 'Shop Best Hydrate');
  assert.match(source, /\{\{ 'bhd_earned_media.shop_product' \| t \}\}/);
});
test('existing product, source and learning actions remain', () => {
  assert.match(source, /href="\{\{ product_url \}\}">Buy Now<\/a>/);
  assert.match(source, /href="https:\/\/edmontonjournal.com\/news\/local-news\/thisty-edmonton-sports-drink-market" target="_blank" rel="noopener"/);
  assert.match(source, /href="\/pages\/our-formula">Learn More/);
});
test('early product action is same-tab semantic navigation without query rewrite', () => {
  const link = source.split('\n').find(line => line.includes(marker));
  assert.match(link, /<a /);
  assert.doesNotMatch(link, /target=|onclick|utm_|gclid|fbclid|<button/);
});
test('existing signup semantics remain unchanged and non-nested', () => {
  assert.equal((source.match(/\{% form /g) || []).length, 1);
  assert.equal((source.match(/\{% endform %\}/g) || []).length, 1);
  assert.ok(source.indexOf(marker) < source.indexOf("{% form 'customer'"));
});
