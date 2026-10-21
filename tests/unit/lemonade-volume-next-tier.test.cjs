'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('product quantity prompt stays in the same row as the native control with spacing and shows only the next tier', () => {
  const script = read('assets/bhd-lemonade-volume.js');
  const styles = read('assets/bhd-lemonade-volume.css');
  const snippet = read('snippets/bhd-lemonade-volume.liquid');
  const cartSnippet = read('snippets/bhd-lemonade-cart-offer.liquid');

  assert.match(script, /this\.input\?\.closest\('quantity-input'\)/);
  assert.match(script, /quantityControl\.after\(this\)/);
  assert.match(script, /container\.after\(details\)/);
  assert.match(script, /document\.getElementById\(this\.dataset\.detailsId\)/);
  assert.match(script, /if \(details\) details\.hidden = !eligible/);
  assert.match(script, /const remaining = 10 - prospective/);
  assert.match(script, /requiredSelected = selected \+ remaining/);
  assert.match(script, /data\.nextBulkTemplate|dataset\.nextBulkTemplate/);
  assert.match(script, /state\.dataset\.bulkPercent/);
  assert.match(script, /this\.dataset\.bulkPercent = String\(bulkPercent\)/);
  assert.doesNotMatch(script, /appliedDiscountText/);
  assert.doesNotMatch(script, /bulk discount applied/);
  assert.match(script, /const visibleText = displayText \|\| text/);
  assert.match(script, /element\.dataset\.displayText = visibleText/);
  assert.match(script, /element\.setAttribute\('aria-label', visibleText\)/);
  assert.match(script, /announcement\.textContent !== announcementText/);
  assert.match(script, /if \(button\.disabled === actionable\) button\.disabled = !actionable/);

  assert.match(styles, /\.price-per-item__container:has\(> \.bhd-volume\[data-positioned="true"\]\)\s*{[^}]*display:\s*flex[^}]*flex-wrap:\s*nowrap[^}]*gap:\s*1rem/s);
  assert.match(styles, /\.bhd-volume\s*{[^}]*flex:\s*1 1 0[^}]*min-width:\s*0/s);
  assert.match(styles, /\.bhd-volume\[data-positioned="true"\]:not\(\[hidden\]\)\s*{\s*display:\s*block/);
  assert.doesNotMatch(styles, /\.bhd-volume\[data-positioned="true"\][^{]*{[^}]*display:\s*contents/s);
  assert.match(styles, /\.bhd-volume__message\s*{[^}]*width:\s*100%[^}]*background:\s*transparent/s);
  assert.match(styles, /\.bhd-volume__prompt\s*{[^}]*border:\s*1px solid #8eacd1[^}]*background:\s*#eef5fc[^}]*color:\s*var\(--bhd-volume-navy\)/s);
  assert.doesNotMatch(styles, /\.bhd-volume__prompt\s*{[^}]*background:\s*var\(--bhd-volume-navy\)/s);
  assert.match(styles, /\.bhd-volume__details\s*{[^}]*width:\s*100%/s);
  assert.match(styles, /\.bhd-volume:has\(> \[data-volume-offers\]\[hidden\]\)/);
  assert.match(styles, /\[data-display-text\]::after/);
  assert.match(styles, /\.bhd-volume__terms::before\s*{\s*content:\s*attr\(data-prefix\)/);

  assert.match(snippet, /data-details-id="BhdVolumeDetails-\{\{ section_id \}\}"/);
  assert.match(snippet, /id="BhdVolumeDetails-\{\{ section_id \}\}"/);
  assert.match(snippet, /data-bulk-percent="\{\{ volume_bulk_percent \}\}"/);
  assert.doesNotMatch(snippet, /data-applied-template/);
  assert.match(snippet, /2 jars: 10% off · 3–9 jars: 15% off · 10\+ jars: 20% off\*/);
  assert.match(snippet, /data-prefix="\*One-time purchases only\. "/);
  assert.match(snippet, /id="BhdVolumeTerms-\{\{ section_id \}\}">One-time purchases only\. Offers do not combine\.<\/span>/);
  assert.match(snippet, /data-volume-announcement aria-live="polite"/);
  assert.match(snippet, /data-next-bulk-template="Add __COUNT__ more for 20% off"/);
  assert.match(cartSnippet, /data-bulk-percent="\{\{ lemonade_bulk_percent \}\}"/);
});
