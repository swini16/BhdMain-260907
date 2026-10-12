// Run with liquidjs, @shopify/liquid-html-parser and postcss available in NODE_PATH.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Liquid } = require('liquidjs');
const { toLiquidHtmlAST } = require('@shopify/liquid-html-parser');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bhd-backorder-'));
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const clean = text => text.replace(/{% doc %}[\s\S]*?{% enddoc %}/g, '');
const copy = JSON.parse(read('locales/en.default.json')).products.product.backorder_delay;
const engine = new Liquid({ root: temp, extname: '.liquid' });
engine.registerFilter('t', key => key === 'products.product.backorder_delay' ? copy : key);
engine.registerFilter('inline_asset_content', () => '');
fs.writeFileSync(path.join(temp, 'bhd-backorder-notice.liquid'), clean(read('snippets/bhd-backorder-notice.liquid')));
fs.writeFileSync(path.join(temp, 'loading-spinner.liquid'), '');
const buttons = read('snippets/buy-buttons.liquid').replace(/{%-?\s*form\b[\s\S]*?-?%}/g, '').replace(/{%-?\s*endform\s*-?%}/g, '');
(async () => {
  let count = 0;
  for (const [label, overrides, notice, enabled] of [
    ['in stock', { inventory_quantity: 6 }, false, true],
    ['zero deny', { inventory_policy: 'deny', available: false }, false, false],
    ['zero continue', {}, true, true],
    ['negative continue', { inventory_quantity: -2 }, true, true],
    ['untracked', { inventory_management: null }, false, true],
    ['other market', { id: 51937870741788 }, false, true],
    ['not purchasable', { available: false }, true, false],
  ]) {
    const variant = { id: 47373155631388, inventory_management: 'shopify', inventory_quantity: 0, inventory_policy: 'continue', available: true, quantity_rule: { min: 1 }, ...overrides };
    engine.options.globals = { settings: { bhd_backorder_variant_ids: '47373155631388' } };
    const vars = { variant, product: { selected_or_first_available_variant: variant }, block: { settings: {} }, section_id: 'test' };
    const html = await engine.parseAndRender(buttons, vars);
    assert.equal(html.includes(copy), notice, label + ' disclosure');
    const button = html.match(/<button\b[\s\S]*?<\/button>/)[0];
    assert.equal(!/\sdisabled[\s>]/.test(button), enabled, label + ' purchase availability');
    count++;
  }
  // Same renderer is invoked for each cart line; mixed carts disclose only the eligible line.
  const item = id => ({ id, inventory_management: 'fba-shipping', inventory_quantity: 0, inventory_policy: 'continue' });
  const mixed = await engine.parseAndRender("{% for item in items %}{% render 'bhd-backorder-notice', variant: item %}{% endfor %}", { items: [item(47373155631388), item(51937870741788)] });
  assert.equal(mixed.split(copy).length - 1, 1);
  engine.options.globals = { settings: { bhd_backorder_variant_ids: 'none' } };
  assert.equal((await engine.parseAndRender("{% render 'bhd-backorder-notice', variant: variant %}", { variant: item(47373155631388) })).trim(), '');
  for (const file of ['snippets/bhd-backorder-notice.liquid', 'snippets/buy-buttons.liquid', 'snippets/cart-drawer.liquid', 'sections/main-cart-items.liquid', 'sections/main-product.liquid', 'layout/theme.liquid']) toLiquidHtmlAST(read(file));
  for (const file of ['locales/en.default.json', 'config/settings_schema.json']) JSON.parse(read(file));
  require('postcss').parse(read('assets/bhd-backorder.css'));
  assert(!read('sections/main-product.liquid').includes('inventory_low_stock_show_count'));
  assert(!read('sections/main-product.liquid').includes('inventory_in_stock_show_count'));
  assert(read('assets/product-info.js').includes("updateSourceFromDestination('BhdBackorder')"));
  console.log(`PASS ${count} rendered purchase states; mixed-cart and eligibility-disable fixtures; Liquid/JSON/CSS parsing; stock count removal and variant-update hook.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => fs.rmSync(temp, { recursive: true, force: true }));
