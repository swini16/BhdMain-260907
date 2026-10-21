'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('product quantity prompt uses available inline space, wraps when needed, and reports confirmed bulk savings', () => {
  const script = read('assets/bhd-lemonade-volume.js');
  const styles = read('assets/bhd-lemonade-volume.css');
  const snippet = read('snippets/bhd-lemonade-volume.liquid');
  const cartSnippet = read('snippets/bhd-lemonade-cart-offer.liquid');

  assert.match(script, /this\.input\?\.closest\('quantity-input'\)/);
  assert.match(script, /quantityControl\.after\(this\)/);
  assert.match(script, /const remaining = 10 - prospective/);
  assert.match(script, /requiredSelected = selected \+ remaining/);
  assert.match(script, /data\.nextBulkTemplate|dataset\.nextBulkTemplate/);
  assert.match(script, /state\.dataset\.bulkPercent/);
  assert.match(script, /this\.dataset\.bulkPercent = String\(bulkPercent\)/);
  assert.match(script, /appliedDiscountText\(\)/);
  assert.match(script, /__PERCENT__% bulk discount applied/);
  assert.match(script, /`\$\{appliedText\} · \$\{visibleText\}`/);
  assert.match(script, /element\.dataset\.displayText = visibleText/);
  assert.match(script, /element\.setAttribute\('aria-label', visibleText\)/);
  assert.match(script, /announcement\.textContent !== announcementText/);
  assert.match(script, /if \(button\.disabled === actionable\) button\.disabled = !actionable/);

  assert.match(styles, /\.price-per-item__container:has\(> \.bhd-volume\[data-positioned="true"\]\)\s*{[^}]*flex-wrap:\s*wrap/s);
  assert.match(styles, /\.bhd-volume\[data-positioned="true"\]:not\(\[hidden\]\)\s*{\s*display:\s*contents/);
  assert.match(styles, /\.bhd-volume > \[data-volume-offers\]:not\(\[hidden\]\)\s*{\s*display:\s*contents/);
  assert.match(styles, /\.bhd-volume__message\s*{[^}]*flex:\s*1 1 20rem/s);
  assert.match(styles, /\.bhd-volume__details\s*{[^}]*flex:\s*1 0 100%/s);
  assert.match(styles, /\[data-display-text\]::after/);
  assert.match(styles, /\.bhd-volume__terms::before\s*{\s*content:\s*attr\(data-prefix\)/);

  assert.match(snippet, /data-bulk-percent="\{\{ volume_bulk_percent \}\}"/);
  assert.match(snippet, /data-applied-template="__PERCENT__% bulk discount applied"/);
  assert.match(snippet, /2 jars: 10% off · 3–9 jars: 15% off · 10\+ jars: 20% off\*/);
  assert.match(snippet, /data-prefix="\*One-time purchases only\. "/);
  assert.match(snippet, /id="BhdVolumeTerms-\{\{ section_id \}\}">One-time purchases only\. Offers do not combine\.<\/span>/);
  assert.match(snippet, /data-volume-announcement aria-live="polite"/);
  assert.match(snippet, /data-next-bulk-template="Add __COUNT__ more for 20% off"/);
  assert.match(cartSnippet, /data-bulk-percent="\{\{ lemonade_bulk_percent \}\}"/);
});
