// Local fixture checks; install jsdom and liquidjs in a separate tools directory.
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
function variant(overrides = {}) {
  return { id: 123, price: 3999, available: true, inventory_management: 'shopify', inventory_policy: 'deny', inventory_quantity: 10, quantity_rule: { min: 1, max: null, increment: 1 }, quantity_price_breaks: [], ...overrides };
}
async function render(name, context = {}, { currency = 'CAD', now = '2026-10-20T12:00:00Z' } = {}) {
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
  return engine.parseAndRender(read(`snippets/${name}.liquid`).replace(/{% doc %}[\s\S]*?{% enddoc %}/g, '').replace(/{% stylesheet %}[\s\S]*?{% endstylesheet %}/g, ''), context);
}
async function fixture(overrides = {}) {
  const v = variant(overrides);
  const html = await render('bhd-lemonade-volume', { product: { id: ca, selected_or_first_available_variant: v }, section_id: 'test' });
  const dom = new JSDOM(`<product-info><form id="product-form-test"><input name="id" value="${v.id}"><input name="selling_plan" value=""></form><input id="Quantity-test" form="product-form-test" name="quantity" min="1" step="1" value="1" data-cart-quantity="0">${html}</product-info>`, { runScripts: 'outside-only' });
  const events = {};
  dom.window.subscribe = (name, fn) => { events[name] = fn; return () => delete events[name]; };
  dom.window.PUB_SUB_EVENTS = { variantChange: 'variant', quantityUpdate: 'quantity' };
  dom.window.eval(source);
  const host = dom.window.document.querySelector('bhd-lemonade-volume');
  return { dom, host, input: host.input, buttons: [...host.querySelectorAll('button')], events };
}
for (const [id, price, currency, totals] of [[ca,3999,'CAD',['39.99','71.98','101.97']],[us,3199,'USD',['31.99','57.58','81.57']],[ca,4299,'CAD',['42.99','77.38','109.62']]]) {
  test(`presentment price ${price} ${currency} drives each tier`, async () => {
    const html = await render('bhd-lemonade-volume', { product: { id, selected_or_first_available_variant: variant({ price }) }, section_id: 'test' }, { currency });
    const doc = new JSDOM(html).window.document;
    assert.deepEqual([...doc.querySelectorAll('.bhd-volume__total')].map(x => x.textContent), totals.map(x => `${x} ${currency}`));
    assert.match(doc.querySelector('.bhd-volume__terms').textContent, /FIRST15/);
  });
}
test('1 → 2 → 3 → 1 updates the native form and emits both native events', async () => {
  const { dom, host, input, buttons } = await fixture();
  const events = []; for (const name of ['input','change']) input.addEventListener(name, () => events.push(name));
  for (const q of [1,2,3,1]) { buttons[q-1].click(); assert.equal(input.value,String(q)); assert.equal(new dom.window.FormData(host.form).get('quantity'),String(q)); assert.equal(buttons[q-1].getAttribute('aria-pressed'),'true'); }
  assert.deepEqual(events, ['input','change','input','change','input','change','input','change']); dom.window.close();
});
test('native input, quantity refresh, max exhaustion, stock and increments are respected', async () => {
  const { dom, host, input, buttons, events } = await fixture({ inventory_quantity: 3 });
  input.value='2'; input.dispatchEvent(new dom.window.Event('change',{bubbles:true})); assert.equal(buttons[1].getAttribute('aria-pressed'),'true');
  input.dataset.cartQuantity='2'; events.quantity(); assert.deepEqual(buttons.map(x=>x.disabled),[false,true,true]);
  input.dataset.max='2'; input.removeAttribute('max'); host.sync(); assert.ok(buttons.every(x=>x.disabled));
  input.dataset.cartQuantity='0'; delete input.dataset.max; input.min='2'; input.step='2'; host.sync(); assert.deepEqual(buttons.map(x=>x.disabled),[true,false,true]);
  input.disabled=true; host.sync(); assert.ok(buttons.every(x=>x.disabled)); dom.window.close();
});
test('subscriptions and variant mismatches fail closed, then recover', async () => {
  const { dom, host, buttons } = await fixture();
  const plan=host.form.querySelector('[name="selling_plan"]'); plan.value='456'; plan.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.ok(buttons.every(x=>x.disabled)); assert.ok(host.querySelector('[data-volume-offers]').hidden);
  plan.value=''; host.sync(); assert.ok(buttons.every(x=>!x.disabled));
  host.form.querySelector('[name="id"]').value='999'; host.sync(); assert.ok(buttons.every(x=>x.disabled)); dom.window.close();
});
test('unavailable variants and missing quantity input cannot be selected', async () => {
  const { dom, host, buttons, input }=await fixture({available:false}); assert.ok(buttons.every(x=>x.disabled)); host.dataset.available='true';input.remove();host.sync();assert.ok(buttons.every(x=>x.disabled)); dom.window.close();
});
test('server-selected subscription remains guarded before an app adds its selling-plan input', async () => {
  const { dom, host, buttons } = await fixture();
  host.dataset.initialSubscription='true'; host.form.querySelector('[name="selling_plan"]').remove(); host.sync();
  assert.ok(buttons.every(x=>x.disabled)); dom.window.close();
});
test('variant pub/sub replaces currency output; disconnection unsubscribes', async () => {
  const { dom,host,events }=await fixture();
  const html=await render('bhd-lemonade-volume',{product:{id:us,selected_or_first_available_variant:variant({price:3199})},section_id:'test'},{currency:'USD'});
  events.variant({data:{sectionId:'test',variant:{id:123},html:new JSDOM(html).window.document}});
  assert.match(host.textContent,/57.58 USD/);host.remove();assert.equal(Object.keys(events).length,0);dom.window.close();
});
for (const [now,expected] of [['2026-11-27T06:59:59Z','71.98'],['2026-11-27T07:00:00Z','59.98'],['2026-12-01T06:59:59Z','59.98'],['2026-12-01T07:00:00Z','71.98']]) {
  test(`BFCM boundary ${now}`,async()=>{const html=await render('bhd-lemonade-volume',{product:{id:ca,selected_or_first_available_variant:variant()},section_id:'test'},{now});assert.match(html,new RegExp(expected+' CAD'));});
}
function item(quantity, overrides={}) { return {product_id:ca,quantity,variant:variant(),line_level_discount_allocations:[],...overrides}; }
async function cart(items, applications=[]) { return render('bhd-lemonade-cart-offer',{cart:{items,cart_level_discount_applications:applications}}); }
test('cart refresh 1/2/3/back to 1/empty shows exactly the matching nudge',async()=>{
  for(const [q,text] of [[1,'2-jar'],[2,'3-jar'],[3,null],[1,'2-jar'],[0,null]]){const html=await cart(q?[item(q)]:[]);const doc=new JSDOM(html).window.document;const prompts=doc.querySelectorAll('.bhd-lemonade-cart-offer__nudge');assert.equal(prompts.length,text?1:0);if(text)assert.match(prompts[0].textContent,new RegExp(text));if(!q)assert.equal(doc.querySelector('aside'),null);}
});
test('FIRST15, other discounts, subscriptions and sold-out increases suppress nudge',async()=>{
  const first15={discount_application:{title:'FIRST15',type:'discount_code'}};
  for(const [items,apps] of [[[item(1,{line_level_discount_allocations:[first15]})],[]],[[item(1)],[{title:'FIRST15'}]],[[item(1,{selling_plan_allocation:{id:1}})],[]],[[item(1,{variant:variant({inventory_quantity:1})})],[]],[[item(1,{variant:variant({quantity_rule:{min:1,max:1,increment:1}})})],[]],[[item(2,{variant:variant({quantity_rule:{min:2,max:null,increment:2}})})],[]]])assert.doesNotMatch(await cart(items,apps),/class="bhd-lemonade-cart-offer__nudge"/);
  assert.match(await cart([item(2,{line_level_discount_allocations:[{discount_application:{title:'Lemonade: Buy 2+, save 10%',type:'automatic'}}]})]),/3-jar/);
});
test('unrelated products, native price breaks and subscription-only products',async()=>{
  for(const product of [{id:1},{id:ca,'quantity_price_breaks_configured?':true}])assert.doesNotMatch(await render('bhd-lemonade-volume',{product:{...product,selected_or_first_available_variant:variant()},section_id:'test'}),/<bhd-lemonade-volume/);
  const html=await render('bhd-lemonade-volume',{product:{id:ca,requires_selling_plan:true,selected_or_first_available_variant:variant()},section_id:'test'});assert.match(html,/data-volume-offers hidden/);
});
test('both cart surfaces render inside the sections refreshed by native cart code',()=>{
 assert.match(read('sections/main-cart-footer.liquid'),/class="js-contents"[^>]*>\s*{% render 'bhd-lemonade-cart-offer' %}/);
 assert.match(read('snippets/cart-drawer.liquid'),/class="cart-drawer__footer"[^>]*>\s*{% render 'bhd-lemonade-cart-offer' %}/);
 assert.match(read('assets/cart.js'),/main-cart-footer/);
 assert.match(read('assets/cart-drawer.js'),/cart-drawer/);
});
test('all existing storefront locales provide the exact approved English fallback keys',()=>{
  const files=fs.readdirSync(path.join(root,'locales')).filter(name=>name.endsWith('.json')&&!name.endsWith('.schema.json')&&name!=='en.default.json');
  assert.equal(files.length,30);
  for(const name of files) assert.deepEqual(JSON.parse(read(`locales/${name}`)).bhd.volume,locale.bhd.volume,`${name}: English fallback changed`);
});
test('quantity offer renders once from the native section rather than template settings',()=>{
  const section=read('sections/main-product.liquid');
  assert.match(section,/{%- when 'quantity_selector' -%}\s*{% render 'bhd-lemonade-volume', product: product, section_id: section.id %}/);
  assert.equal(section.split("render 'bhd-lemonade-volume'").length-1,1);
  assert.doesNotMatch(read('templates/product.json'),/bhd-lemonade-volume|lemonade_volume/);
});
