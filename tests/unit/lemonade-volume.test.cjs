// Run with npm run test:unit after installing the repository's declared dependencies.
// These checks do not replace a Shopify-rendered preview or checkout validation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { Liquid } = require('liquidjs');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const locale = JSON.parse(read('locales/en.default.json'));
const source = read('assets/bhd-lemonade-volume.js');
const ca = 8904882422044, us = 10168145281308;
const normalNow = '2026-10-20T12:00:00Z';
const copy = locale.bhd.volume;
function variant(overrides = {}) {
  return { id: 123, price: 3999, available: true, inventory_management: 'shopify', inventory_policy: 'deny', inventory_quantity: 30, quantity_rule: { min: 1, max: null, increment: 1 }, quantity_price_breaks: [], ...overrides };
}
function item(quantity, overrides = {}) {
  return { product_id: ca, quantity, variant: variant(), line_level_discount_allocations: [], ...overrides };
}
function cartData(items = [], applications = []) {
  return { items, item_count: items.reduce((sum, line) => sum + line.quantity, 0), cart_level_discount_applications: applications };
}
async function render(name, context = {}, { currency = 'CAD', now = normalNow } = {}) {
  const engine = new Liquid();
  engine.registerFilter('t', (key, ...args) => {
    let value = key.split('.').reduce((o, k) => o[k], locale);
    for (const [key, val] of args) value = value.replaceAll(`{{ ${key} }}`, val);
    return value;
  });
  engine.registerFilter('money_with_currency', value => `${(value / 100).toFixed(2)} ${currency}`);
  engine.registerFilter('asset_url', value => value);
  engine.registerFilter('stylesheet_tag', () => '');
  engine.registerFilter('item_count_for_variant', (cart, id) => cart.items.filter(x => x.variant.id === id).reduce((sum, x) => sum + x.quantity, 0));
  engine.registerFilter('date', (value, format) => { assert.equal(format, '%s'); return Math.floor(Date.parse(value === 'now' ? now : value) / 1000); });
  return engine.parseAndRender(read(`snippets/${name}.liquid`).replace(/{% doc %}[\s\S]*?{% enddoc %}/g, '').replace(/{% stylesheet %}[\s\S]*?{% endstylesheet %}/g, ''), { cart: cartData(), ...context });
}
async function fixture(overrides = {}, { cart = cartData(), now = normalNow, product = {} } = {}) {
  const v = variant(overrides);
  const html = await render('bhd-lemonade-volume', { product: { id: ca, selected_or_first_available_variant: v, ...product }, section_id: 'test', cart }, { now });
  const variantCartQuantity = cart.items.filter(line => line.variant?.id === v.id).reduce((sum, line) => sum + line.quantity, 0);
  const max = v.quantity_rule.max == null ? '' : `data-max="${v.quantity_rule.max}"`;
  const dom = new JSDOM(`<product-info><form id="product-form-test"><input name="id" value="${v.id}"><input name="selling_plan" value=""></form><input id="Quantity-test" form="product-form-test" name="quantity" min="${v.quantity_rule.min}" step="${v.quantity_rule.increment}" value="${v.quantity_rule.min}" data-cart-quantity="${variantCartQuantity}" ${max}>${html}</product-info>`, { runScripts: 'outside-only' });
  const events = {};
  dom.window.Date.now = () => Date.parse(now);
  dom.window.subscribe = (name, fn) => { events[name] = fn; return () => delete events[name]; };
  dom.window.PUB_SUB_EVENTS = { variantChange: 'variant', quantityUpdate: 'quantity', cartUpdate: 'cart' };
  dom.window.eval(source);
  const host = dom.window.document.querySelector('bhd-lemonade-volume');
  return { dom, host, input: host.input, button: host.querySelector('[data-volume-add]'), events };
}
function message(host) {
  const button = host.querySelector('[data-volume-add]');
  const confirmation = host.querySelector('[data-volume-confirmation]');
  assert.notEqual(button.hidden, confirmation.hidden, 'only one context line is visible');
  return (button.hidden ? confirmation : button).textContent.trim();
}
function select(fixture, quantity) {
  fixture.input.value = String(quantity);
  fixture.input.dispatchEvent(new fixture.dom.window.Event('change', { bubbles: true }));
}
function stateMarkup(quantity, percent = 0, unknown = false) {
  return `<span hidden data-volume-cart-state data-quantity="${quantity}" data-known-percent="${percent}" data-unknown-discount="${unknown}"></span>`;
}
async function cart(items, applications = [], options = {}) {
  return render('bhd-lemonade-cart-offer', { cart: cartData(items, applications) }, options);
}
function cartMessage(html) {
  return new JSDOM(html).window.document.querySelector('.bhd-lemonade-cart-offer__nudge')?.textContent.trim();
}
for (const [id, price, currency] of [[ca, 3999, 'CAD'], [us, 3199, 'USD'], [ca, 4299, 'CAD']]) {
  test(`supported product ${id} at ${price} ${currency} renders one compact prompt without a price table`, async () => {
    const html = await render('bhd-lemonade-volume', { product: { id, selected_or_first_available_variant: variant({ price }) }, section_id: 'test' }, { currency });
    const doc = new JSDOM(html).window.document;
    assert.equal(doc.querySelectorAll('[data-volume-message]').length, 1);
    assert.equal(doc.querySelector('[data-volume-confirmation]').textContent, copy.nudge_one);
    assert.equal(doc.querySelector('.bhd-volume__terms').textContent, 'Offers do not combine.');
    assert.equal(doc.querySelector('table, .bhd-volume__card, .bhd-volume__total'), null);
    assert.equal(doc.querySelector('[data-volume-add]').type, 'button');
  });
}
test('native quantities 1, 2, 3, 9, 10, 11 and back to 1 use the exact approved line', async t => {
  const f = await fixture(); t.after(() => f.dom.window.close());
  for (const [quantity, text] of [[1, copy.nudge_one], [2, copy.nudge_two], [3, copy.confirmation], [9, copy.confirmation], [10, copy.confirmation_bulk], [11, copy.confirmation_bulk], [1, copy.nudge_one]]) {
    select(f, quantity);
    assert.equal(message(f.host), text);
    assert.equal(f.button.hidden, quantity >= 3);
    assert.equal(f.button.disabled, quantity >= 3);
  }
});
test('clicking the prompt increments the existing form 1 → 2 → 3 and emits native events', async t => {
  const f = await fixture(); t.after(() => f.dom.window.close());
  const emitted = [];
  for (const name of ['input', 'change']) f.input.addEventListener(name, () => emitted.push(name));
  for (const quantity of [2, 3]) {
    f.button.click();
    assert.equal(f.input.value, String(quantity));
    assert.equal(new f.dom.window.FormData(f.host.form).get('quantity'), String(quantity));
  }
  assert.deepEqual(emitted, ['input', 'change', 'input', 'change']);
  assert.equal(f.dom.window.document.activeElement, f.input);
  f.button.click(); assert.equal(f.input.value, '3');
  select(f, 1); assert.equal(message(f.host), copy.nudge_one);
});
test('native stock, max-minus-cart, minimum, increment and disabled guards remain intact', async t => {
  const f = await fixture({ inventory_quantity: 3 }); t.after(() => f.dom.window.close());
  select(f, 2); assert.equal(message(f.host), copy.nudge_two);
  f.input.dataset.cartQuantity = '2'; f.events.quantity();
  assert.equal(f.host.accepts(1), true); assert.equal(f.host.accepts(2), false);
  assert.equal(f.host.querySelector('[data-volume-offers]').hidden, true);
  select(f, 1); assert.equal(message(f.host), copy.generic); assert.equal(f.button.hidden, true);
  f.input.dataset.max = '2'; f.input.removeAttribute('max'); f.host.sync();
  assert.equal(f.host.accepts(1), false);
  f.input.dataset.cartQuantity = '0'; delete f.input.dataset.max;
  f.input.min = '2'; f.input.step = '2'; select(f, 2);
  assert.equal(f.host.accepts(1), false); assert.equal(f.host.accepts(2), true); assert.equal(f.host.accepts(3), false);
  assert.equal(message(f.host), copy.generic); assert.equal(f.button.hidden, true);
  f.input.min = '1'; f.input.step = '1'; f.input.max = '1'; select(f, 1);
  assert.equal(f.host.accepts(2), false); assert.equal(f.button.hidden, true);
  f.input.disabled = true; f.host.sync();
  assert.equal(f.host.querySelector('[data-volume-offers]').hidden, true);
});
test('subscriptions, required plans and missing or mismatched variant IDs fail closed, then recover', async t => {
  const f = await fixture(); t.after(() => f.dom.window.close());
  const plan = f.host.form.querySelector('[name="selling_plan"]');
  plan.value = '456'; plan.dispatchEvent(new f.dom.window.Event('change', { bubbles: true }));
  assert.equal(f.button.disabled, true); assert.equal(f.host.querySelector('[data-volume-offers]').hidden, true);
  plan.value = ''; f.host.sync(); assert.equal(f.button.disabled, false);
  f.host.dataset.requiresSellingPlan = 'true'; f.host.sync(); assert.equal(f.button.disabled, true);
  f.host.dataset.requiresSellingPlan = 'false';
  const id = f.host.form.querySelector('[name="id"]');
  id.value = '999'; f.host.sync(); assert.equal(f.button.disabled, true);
  id.remove(); f.host.sync(); assert.equal(f.button.disabled, true);
  f.button.click(); assert.equal(f.input.value, '1');
});
test('unavailable variants, missing input and incorrect form association cannot be selected', async t => {
  const f = await fixture({ available: false }); t.after(() => f.dom.window.close());
  assert.equal(f.button.disabled, true);
  f.host.dataset.available = 'true'; f.input.setAttribute('form', 'another-form'); f.host.sync();
  assert.equal(f.button.disabled, true);
  f.input.remove(); f.host.sync(); assert.equal(f.button.disabled, true);
});
test('server-selected subscription is guarded before an app adds its selling-plan input', async t => {
  const f = await fixture(); t.after(() => f.dom.window.close());
  f.host.dataset.initialSubscription = 'true'; f.host.form.querySelector('[name="selling_plan"]').remove(); f.host.sync();
  assert.equal(f.button.disabled, true); assert.equal(f.host.querySelector('[data-volume-offers]').hidden, true);
});
test('variant pub/sub refreshes stock and full cart context; disconnection unsubscribes all events', async t => {
  const f = await fixture(); t.after(() => f.dom.window.close());
  const html = await render('bhd-lemonade-volume', { product: { id: us, selected_or_first_available_variant: variant({ id: 456, price: 3199, inventory_quantity: 18 }) }, section_id: 'test', cart: cartData([item(9)]) }, { currency: 'USD' });
  f.host.form.querySelector('[name="id"]').value = '456';
  f.events.variant({ data: { sectionId: 'test', variant: { id: 456 }, html: new JSDOM(html).window.document } });
  assert.equal(f.host.dataset.variantId, '456'); assert.equal(f.host.dataset.stockLimit, '18');
  assert.equal(message(f.host), copy.confirmation_bulk);
  f.events.variant({ data: { sectionId: 'test', variant: null, html: new JSDOM('').window.document } });
  assert.equal(f.host.hidden, true);
  f.host.remove(); assert.equal(Object.keys(f.events).length, 0);
});
test('the product tier includes both eligible cart products and excludes subscription units', async t => {
  const items = [item(4), item(5, { product_id: us, variant: variant({ id: 456 }) }), item(8, { selling_plan_allocation: { id: 1 } })];
  const f = await fixture({}, { cart: cartData(items) }); t.after(() => f.dom.window.close());
  assert.equal(f.host.dataset.cartQuantity, '9');
  assert.equal(message(f.host), copy.confirmation_bulk);
});
test('known equal discounts suppress upgrade prompts but preserve equal tier confirmations', async t => {
  const f = await fixture(); t.after(() => f.dom.window.close());
  for (const [quantity, percent, expected] of [[1, 5, copy.generic], [1, 15, copy.generic], [2, 5, copy.nudge_two], [2, 10, copy.generic], [3, 10, copy.confirmation], [9, 10, copy.confirmation], [3, 15, copy.generic], [9, 15, copy.generic], [10, 15, copy.confirmation_bulk], [10, 25, copy.generic]]) {
    f.host.dataset.knownPercent = String(percent); select(f, quantity); assert.equal(message(f.host), expected);
  }
  f.host.dataset.unknownDiscount = 'true'; select(f, 3); assert.equal(message(f.host), copy.generic);
});
test('Liquid initial copy uses the same equal-discount and bulk-tier rules', async () => {
  for (const [quantity, percent, expected] of [[1, 5, copy.generic], [2, 10, copy.generic], [3, 10, copy.confirmation], [9, 10, copy.confirmation], [3, 15, copy.generic], [9, 15, copy.generic], [10, 15, copy.confirmation_bulk], [10, 25, copy.generic]]) {
    const html = await render('bhd-lemonade-volume', { product: { id: ca, selected_or_first_available_variant: variant({ quantity_rule: { min: quantity, max: null, increment: 1 } }) }, section_id: 'test', cart: cartData([], [{ title: 'KNOWN', type: 'discount_code', value_type: 'percentage', value: percent }]) });
    assert.equal(new JSDOM(html).window.document.querySelector('[data-volume-confirmation]').textContent, expected);
  }
});
test('full cart refreshes recognize the 15% automatic and exclude subscription quantity', async t => {
  const f = await fixture(); t.after(() => f.dom.window.close());
  f.events.cart({ cartData: cartData([item(9), item(5, { selling_plan_allocation: { id: 1 } })], [{ type: 'automatic', title: 'Lemonade: Buy 10+, save 15%' }]) });
  assert.equal(f.host.dataset.cartQuantity, '9'); assert.equal(f.host.dataset.knownPercent, '15');
  assert.equal(message(f.host), copy.confirmation_bulk);
  f.events.cart({ cartData: cartData([], [{ title: 'FIRST15', type: 'discount_code', value_type: 'percentage', value: '15.0' }]) });
  assert.equal(message(f.host), copy.generic);
  f.events.cart({ cartData: cartData([], [{ title: 'OTHER', type: 'discount_code' }]) });
  assert.equal(f.host.dataset.unknownDiscount, 'true'); assert.equal(message(f.host), copy.generic);
});
test('partial add payload fails safely; returned section evidence restores cart context including empty cart', async t => {
  const f = await fixture(); t.after(() => f.dom.window.close());
  f.events.cart({ cartData: { items: [item(1)] } }); assert.equal(message(f.host), copy.generic);
  f.events.cart({ cartData: { items: [item(1)], sections: { 'cart-drawer': stateMarkup(9, 15), 'main-cart-footer': stateMarkup(9, 15) } } });
  assert.equal(message(f.host), copy.confirmation_bulk); assert.equal(f.host.cartUncertain, false);
  f.events.cart({ cartData: { sections: { 'cart-drawer': stateMarkup(0) } } });
  f.input.setAttribute('data-cart-quantity', '0');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(message(f.host), copy.nudge_one);
  f.events.cart({ cartData: { sections: { first: stateMarkup(0), second: stateMarkup(9) } } });
  assert.equal(message(f.host), copy.generic);
  f.events.cart({ cartData: { sections: { first: stateMarkup('invalid') } } });
  assert.equal(message(f.host), copy.generic);
});
test('cart response cannot invite an unavailable third jar before native stock bounds refresh', async t => {
  const f = await fixture({ inventory_quantity: 2 }); t.after(() => f.dom.window.close());
  f.events.cart({ cartData: { sections: { 'cart-drawer': stateMarkup(1) } } });
  assert.equal(f.input.dataset.cartQuantity, '0');
  assert.equal(message(f.host), copy.generic); assert.equal(f.button.hidden, true);
  f.events.quantity(); assert.equal(f.button.hidden, true);
  f.input.setAttribute('data-cart-quantity', '1');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.host.quantityRulesPending, false);
  assert.equal(message(f.host), copy.generic); assert.equal(f.button.hidden, true);
  f.events.cart({ cartData: { sections: { 'cart-drawer': stateMarkup(0) } } });
  f.input.setAttribute('data-cart-quantity', '0');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(message(f.host), copy.nudge_one); assert.equal(f.button.hidden, false);
});
for (const [now, bfcm] of [['2026-11-27T06:59:59Z', false], ['2026-11-27T07:00:00Z', true], ['2026-12-01T06:59:59Z', true], ['2026-12-01T07:00:00Z', false]]) {
  test(`BFCM boundary ${now} agrees in Liquid and the dynamic component`, async t => {
    const f = await fixture({}, { now }); t.after(() => f.dom.window.close());
    assert.equal(f.host.dataset.bfcm, String(bfcm));
    assert.equal(message(f.host), bfcm ? copy.nudge_bfcm : copy.nudge_one);
    for (const quantity of [2, 3, 10, 11]) {
      select(f, quantity);
      assert.equal(message(f.host), bfcm ? copy.confirmation_bfcm : quantity === 2 ? copy.nudge_two : quantity >= 10 ? copy.confirmation_bulk : copy.confirmation);
    }
  });
}
test('BFCM keeps the stronger 25% tier, including equal discounts; stale seasonal state is generic', async t => {
  const f = await fixture({}, { now: '2026-11-28T12:00:00Z' }); t.after(() => f.dom.window.close());
  f.host.dataset.knownPercent = '20'; assert.equal(message(f.host), copy.nudge_bfcm);
  f.host.dataset.knownPercent = '25'; f.host.sync(); assert.equal(message(f.host), copy.generic);
  select(f, 2); assert.equal(message(f.host), copy.confirmation_bfcm);
  select(f, 10); assert.equal(message(f.host), copy.confirmation_bfcm);
  f.dom.window.Date.now = () => Date.parse('2026-12-01T07:00:00Z'); f.host.sync(); assert.equal(message(f.host), copy.generic);
});
test('cart refresh 1/2/3/9/10/11/back to 1/empty shows exactly the matching line and state', async () => {
  for (const [quantity, expected] of [[1, copy.nudge_one], [2, copy.nudge_two], [3, copy.confirmation], [9, copy.confirmation], [10, copy.confirmation_bulk], [11, copy.confirmation_bulk], [1, copy.nudge_one], [0, undefined]]) {
    const html = await cart(quantity ? [item(quantity)] : []);
    const doc = new JSDOM(html).window.document;
    assert.equal(doc.querySelectorAll('.bhd-lemonade-cart-offer__nudge').length, quantity ? 1 : 0);
    assert.equal(cartMessage(html), expected);
    assert.equal(doc.querySelector('[data-volume-cart-state]').dataset.quantity, String(quantity));
    if (!quantity) assert.equal(doc.querySelector('aside'), null);
  }
});
test('cart competing discounts and unavailable increases use the generic line; subscriptions are excluded', async () => {
  const first15 = { discount_application: { title: 'FIRST15', type: 'discount_code' } };
  for (const [items, apps] of [[[item(1, { line_level_discount_allocations: [first15] })], []], [[item(1)], [{ title: 'FIRST15' }]], [[item(1, { variant: variant({ inventory_quantity: 1 }) })], []], [[item(1, { variant: variant({ quantity_rule: { min: 1, max: 1, increment: 1 } }) })], []], [[item(2, { variant: variant({ quantity_rule: { min: 2, max: null, increment: 2 } }) })], []]]) {
    assert.equal(cartMessage(await cart(items, apps)), copy.generic);
  }
  assert.equal(cartMessage(await cart([item(1, { selling_plan_allocation: { id: 1 } })])), undefined);
  assert.equal(cartMessage(await cart([item(2, { line_level_discount_allocations: [{ discount_application: { title: 'Lemonade: Buy 2+, save 5%', type: 'automatic' } }] })])), copy.nudge_two);
});
test('cart known-equal comparison and BFCM use the same product rules', async () => {
  for (const [quantity, percent, expected] of [[1, 5, copy.generic], [2, 10, copy.generic], [3, 10, copy.confirmation], [9, 10, copy.confirmation], [3, 15, copy.generic], [9, 15, copy.generic], [10, 15, copy.confirmation_bulk], [10, 25, copy.generic]]) {
    assert.equal(cartMessage(await cart([item(quantity)], [{ type: 'discount_code', value_type: 'percentage', value: percent }])), expected);
  }
  assert.equal(cartMessage(await cart([item(1)], [], { now: '2026-11-28T12:00:00Z' })), copy.nudge_bfcm);
  assert.equal(cartMessage(await cart([item(10)], [{ type: 'automatic', title: 'BHD BFCM 2026 · 25% · 2+ jars' }], { now: '2026-11-28T12:00:00Z' })), copy.confirmation_bfcm);
});
test('unrelated products, native price breaks and subscription-only products retain their guards', async () => {
  for (const product of [{ id: 1 }, { id: ca, 'quantity_price_breaks_configured?': true }]) assert.doesNotMatch(await render('bhd-lemonade-volume', { product: { ...product, selected_or_first_available_variant: variant() }, section_id: 'test' }), /<bhd-lemonade-volume/);
  for (const product of [{ requires_selling_plan: true }, { selected_selling_plan: { id: 456 } }]) {
    assert.match(await render('bhd-lemonade-volume', { product: { id: ca, ...product, selected_or_first_available_variant: variant() }, section_id: 'test' }), /data-volume-offers hidden/);
  }
});
test('both cart surfaces render inside the sections refreshed by native cart code', () => {
  assert.match(read('sections/main-cart-footer.liquid'), /class="js-contents"[^>]*>\s*{% render 'bhd-lemonade-cart-offer' %}/);
  assert.match(read('snippets/cart-drawer.liquid'), /class="cart-drawer__footer"[^>]*>\s*{% render 'bhd-lemonade-cart-offer' %}/);
  assert.match(read('assets/cart.js'), /main-cart-footer/);
  assert.match(read('assets/cart-drawer.js'), /cart-drawer/);
});
test('all existing storefront locales provide the exact approved English fallback keys', () => {
  const files = fs.readdirSync(path.join(root, 'locales')).filter(name => name.endsWith('.json') && !name.endsWith('.schema.json') && name !== 'en.default.json');
  assert.equal(files.length, 30);
  for (const name of files) assert.deepEqual(JSON.parse(read(`locales/${name}`)).bhd.volume, copy, `${name}: English fallback changed`);
});
test('quantity offer renders once from the native section rather than template settings', () => {
  const section = read('sections/main-product.liquid');
  assert.match(section, /{%- when 'quantity_selector' -%}\s*{% render 'bhd-lemonade-volume', product: product, section_id: section.id %}/);
  assert.equal(section.split("render 'bhd-lemonade-volume'").length - 1, 1);
  assert.doesNotMatch(read('templates/product.json'), /bhd-lemonade-volume|lemonade_volume/);
});

