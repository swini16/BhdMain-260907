'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'assets/bhd-lemonade-volume.js'), 'utf8');
const normalNow = Date.parse('2026-10-20T12:00:00Z');
const bfcmNow = Date.parse('2026-11-28T12:00:00Z');

async function fixture({ now = normalNow, bfcm = false } = {}) {
  const dom = new JSDOM(`
    <product-info>
      <form id="product-form-test">
        <input name="id" value="123">
        <input name="selling_plan" value="">
      </form>
      <div class="price-per-item__container">
        <quantity-input>
          <input id="Quantity-test" form="product-form-test" name="quantity" min="1" step="1" value="1" data-cart-quantity="0">
        </quantity-input>
      </div>
      <bhd-lemonade-volume
        id="BhdLemonadeVolume-test"
        data-section-id="test"
        data-variant-id="123"
        data-available="true"
        data-stock-limit="30"
        data-initial-subscription="false"
        data-requires-selling-plan="false"
        data-cart-quantity="0"
        data-known-percent="0"
        data-bulk-percent="0"
        data-unknown-discount="false"
        data-bfcm="${bfcm}"
        data-bfcm-start="1795762800"
        data-bfcm-end="1796108400"
        data-nudge-one="Add 1 for 10% off"
        data-nudge-two="Add 1 more for 15% off"
        data-confirmation="15% off on 3–9 jars"
        data-confirmation-bulk="20% off on 10+ jars"
        data-nudge-bfcm="Add 1 for 25% off"
        data-confirmation-bfcm="25% off on 2+ jars"
        data-better-offer="Best offer shown in cart."
        data-generic="Best offer shown in cart."
        data-applied-template="__PERCENT__% bulk discount applied"
        data-next-bulk-template="Add __COUNT__ more for 20% off"
      >
        <div data-volume-offers>
          <p data-volume-message>
            <button type="button" data-volume-add hidden disabled></button>
            <span data-volume-confirmation></span>
          </p>
          <span data-volume-announcement aria-live="polite"></span>
        </div>
      </bhd-lemonade-volume>
    </product-info>
  `, { runScripts: 'outside-only' });

  const events = {};
  dom.window.Date.now = () => now;
  dom.window.subscribe = (name, listener) => {
    events[name] = listener;
    return () => delete events[name];
  };
  dom.window.PUB_SUB_EVENTS = {
    variantChange: 'variant',
    quantityUpdate: 'quantity',
    cartUpdate: 'cart',
  };
  dom.window.eval(source);
  await new Promise(resolve => setImmediate(resolve));

  const host = dom.window.document.querySelector('bhd-lemonade-volume');
  const input = dom.window.document.getElementById('Quantity-test');
  return { dom, host, input, events };
}

function setQuantity(fixture, quantity) {
  fixture.input.value = String(quantity);
  fixture.input.dispatchEvent(new fixture.dom.window.Event('change', { bubbles: true }));
}

function visibleCopy(host) {
  const button = host.querySelector('[data-volume-add]');
  const confirmation = host.querySelector('[data-volume-confirmation]');
  const visible = button.hidden ? confirmation : button;
  const announcement = host.querySelector('[data-volume-announcement]');
  return {
    display: visible.dataset.displayText,
    aria: visible.getAttribute('aria-label'),
    announcement: announcement.textContent,
    underlying: visible.textContent,
  };
}

test('standard tiers show the current bulk discount before the next threshold', async t => {
  const f = await fixture();
  t.after(() => f.dom.window.close());

  const expectations = [
    [1, 'Add 1 for 10% off', 'Add 1 for 10% off'],
    [2, '10% bulk discount applied · Add 1 more for 15% off', 'Add 1 more for 15% off'],
    [3, '15% bulk discount applied · Add 7 more for 20% off', '15% off on 3–9 jars'],
    [9, '15% bulk discount applied · Add 1 more for 20% off', '15% off on 3–9 jars'],
    [10, '20% bulk discount applied', '20% off on 10+ jars'],
    [11, '20% bulk discount applied', '20% off on 10+ jars'],
  ];

  for (const [quantity, expectedDisplay, expectedUnderlying] of expectations) {
    setQuantity(f, quantity);
    const copy = visibleCopy(f.host);
    assert.equal(copy.display, expectedDisplay);
    assert.equal(copy.aria, expectedDisplay);
    assert.equal(copy.announcement, expectedDisplay);
    assert.equal(copy.underlying, expectedUnderlying);
  }
});

test('BFCM tiers identify the current 20% or 25% bulk discount', async t => {
  const f = await fixture({ now: bfcmNow, bfcm: true });
  t.after(() => f.dom.window.close());

  setQuantity(f, 1);
  assert.equal(visibleCopy(f.host).display, '20% bulk discount applied · Add 1 for 25% off');
  setQuantity(f, 2);
  assert.equal(visibleCopy(f.host).display, '25% bulk discount applied');
});

test('stronger or uncertain competing offers suppress the bulk-applied claim', async t => {
  const f = await fixture();
  t.after(() => f.dom.window.close());

  f.host.dataset.knownPercent = '15';
  setQuantity(f, 2);
  assert.equal(visibleCopy(f.host).display, 'Best offer shown in cart.');

  f.host.dataset.knownPercent = '0';
  f.host.dataset.unknownDiscount = 'true';
  setQuantity(f, 3);
  assert.equal(visibleCopy(f.host).display, 'Best offer shown in cart.');
});
