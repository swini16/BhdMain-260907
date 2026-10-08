const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'assets/product-info.js'), 'utf8');
const liquid = fs.readFileSync(path.join(root, 'sections/main-product.liquid'), 'utf8');
const locale = JSON.parse(fs.readFileSync(path.join(root, 'locales/en.default.json'), 'utf8'));

function element(innerHTML) {
  const classes = new Set();
  return {
    innerHTML,
    classList: {
      add: value => classes.add(value),
      contains: value => classes.has(value),
      toggle(value, enabled) { enabled ? classes.add(value) : classes.delete(value); },
    },
  };
}

function fixture({ variant = { id: 12 }, withMobile = true, currency = 'USD' } = {}) {
  let ProductInfo;
  const ids = ['price', ...(withMobile ? ['BhdMobilePrice', 'BhdMobileServingPrice'] : [])];
  const destination = new Map(ids.map(id => [`#${id}-test`, element(`old ${id}`)]));
  const html = {
    getElementById(id) {
      if (id === 'price-test' || id === 'BhdMobilePrice-test') return element(`$31.99 ${currency}`);
      if (id === 'BhdMobileServingPrice-test') return element(`~$1.00 ${currency}/serving`);
      return null;
    },
  };
  const document = {
    querySelectorAll(selectors) { return selectors.split(', ').map(key => destination.get(key)).filter(Boolean); },
  };
  vm.runInNewContext(source, {
    HTMLElement: class {},
    customElements: { get: () => undefined, define(name, value) { assert.equal(name, 'product-info'); ProductInfo = value; } },
    document,
    window: { variantStrings: { soldOut: 'Sold out', unavailable: 'Unavailable' } },
    PUB_SUB_EVENTS: { variantChange: 'variantChange' },
    publish() {},
  });
  const host = Object.create(ProductInfo.prototype);
  host.dataset = { section: 'test' };
  host.querySelector = selector => destination.get(selector) ?? null;
  host.getVariantSelects = () => null;
  host.getSelectedVariant = () => variant;
  for (const method of ['updateOptionValues', 'updateURL', 'updateVariantInputs', 'updateMedia', 'updateQuantityRules']) host[method] = () => {};
  return { host, html, destination };
}

test('Liquid price uses the selected contextual variant, 32 servings, nearest cent and explicit currency', () => {
  // Source-contract test. Shopify Liquid rendering is still a preview QA step.
  assert.ok(liquid.includes('product.selected_or_first_available_variant.price | divided_by: 32.0 | round | money_with_currency'));
  assert.ok(liquid.includes("'products.product.mobile_intro_value' | t: price: bhd_mobile_price_per_serving"));
  assert.ok(liquid.includes('id="BhdMobilePrice-{{ section.id }}"'));
  assert.ok(liquid.includes('id="BhdMobileServingPrice-{{ section.id }}"'));
  assert.equal(locale.products.product.mobile_intro_value, '~{{ price }}/serving');
  assert.ok(!locale.products.product.mobile_intro_value.includes('C$1.25'));
});

for (const currency of ['USD', 'CAD']) {
  test(`variant update copies contextual ${currency} main/mobile/serving prices from Shopify-rendered HTML`, () => {
    const { host, html, destination } = fixture({ currency });
    host.handleUpdateProductInfo('/products/lemonade-best-hydrate')(html);
    assert.equal(destination.get('#price-test').innerHTML, `$31.99 ${currency}`);
    assert.equal(destination.get('#BhdMobilePrice-test').innerHTML, `$31.99 ${currency}`);
    assert.equal(destination.get('#BhdMobileServingPrice-test').innerHTML, `~$1.00 ${currency}/serving`);
  });
}

test('an unavailable variant hides both mobile price surfaces', () => {
  const { host, html, destination } = fixture({ variant: null });
  host.handleUpdateProductInfo('/products/lemonade-best-hydrate')(html);
  for (const id of ['price', 'BhdMobilePrice', 'BhdMobileServingPrice']) {
    assert.equal(destination.get(`#${id}-test`).classList.contains('hidden'), true);
  }
});

test('a subsequent available variant restores mobile contextual prices', () => {
  const { host, html, destination } = fixture();
  host.setUnavailable();
  host.handleUpdateProductInfo('/products/lemonade-best-hydrate')(html);
  for (const id of ['BhdMobilePrice', 'BhdMobileServingPrice']) {
    assert.equal(destination.get(`#${id}-test`).classList.contains('hidden'), false);
    assert.ok(!destination.get(`#${id}-test`).innerHTML.startsWith('old'));
  }
});

test('products without the mobile lemonade intro remain compatible', () => {
  const { host, html, destination } = fixture({ withMobile: false });
  assert.doesNotThrow(() => host.handleUpdateProductInfo('/products/other')(html));
  assert.equal(destination.get('#price-test').innerHTML, '$31.99 USD');
});
