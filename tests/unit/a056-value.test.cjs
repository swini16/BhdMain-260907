const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const snippet = read('snippets/bhd-a056-value.liquid');
const home = read('sections/bhd-hero-v4.liquid');
const pdp = read('sections/main-product.liquid');
const strings = JSON.parse(read('locales/en.default.json')).a056;
test('all substantiation gates are present in the shared Liquid snippet', () => {
  for (const condition of ["localization.country.iso_code == 'CA'", "localization.country.currency.iso_code == 'CAD'", "cart.currency.iso_code == 'CAD'", 'claim_product.id == 8904882422044', 'claim_variant.id == 47373155631388', 'claim_variant.price == 3999', 'claim_variant.available', 'cart.taxes_included', 'claim_product.quantity_price_breaks_configured?', 'claim_product.selected_selling_plan']) assert.ok(snippet.includes(condition), condition);
  assert.ok(snippet.includes('mM-bhd-a056-value-claim-261008@v2'));
});
test('proposed exact strings and rounding remain intact', () => {
  assert.deepEqual(strings, {
    home_heading: '32 servings. One jar.',
    home_body: 'About C$1.25 per prepared 500 mL serving.',
    product_heading: 'More hydration value in every jar.',
    product_body: '32 servings per jar. About C$1.25 per prepared 500 mL serving.',
    qualification: 'Based on a C$39.99 jar, prepared as directed. Before tax, delivery and water cost. Canadian pricing; prices may change.'
  });
  assert.equal((39.99 / 32).toFixed(2), '1.25');
  assert.ok(!/cheaper|save|saving|competitor|RTD|percent|%/i.test(Object.values(strings).join(' ')));
});
test('homepage renders once after CTA group and before proof cards', () => {
  assert.equal((home.match(/render 'bhd-a056-value'/g) || []).length, 1);
  const pos = home.indexOf("render 'bhd-a056-value'");
  assert.ok(pos > home.indexOf('See the SGLT science'));
  assert.ok(pos < home.indexOf('<div class="bhd-hero-v4__proof"'));
  assert.ok(home.includes("placement: 'A056-P01'"));
});
test('PDP value lives inside both server-refreshed price containers', () => {
  for (const id of ['BhdMobilePrice', 'price']) {
    const start = pdp.indexOf(`id="${id}-{{ section.id }}"`);
    const close = pdp.indexOf('</div>', start);
    const wrapper = pdp.slice(start, close);
    assert.ok(wrapper.includes("render 'bhd-a056-value', claim_product: product, placement: 'A056-P02'"));
    assert.ok(read('assets/product-info.js').includes(`updateSourceFromDestination('${id}')`));
  }
});
test('component inherits brand appearance and contains no asset or purchasing changes', () => {
  assert.ok(snippet.includes('color: inherit'));
  assert.ok(!/<img|<script|<form|#[0-9a-f]{3,8}\b/i.test(snippet));
});
