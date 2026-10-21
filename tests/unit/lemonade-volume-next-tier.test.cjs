'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('product quantity prompt sits beside the native control and shows only the next threshold', () => {
  const script = read('assets/bhd-lemonade-volume.js');
  const styles = read('assets/bhd-lemonade-volume.css');
  const snippet = read('snippets/bhd-lemonade-volume.liquid');

  assert.match(script, /this\.input\?\.closest\('quantity-input'\)/);
  assert.match(script, /quantityControl\.after\(this\)/);
  assert.match(script, /const remaining = 10 - prospective/);
  assert.match(script, /requiredSelected = selected \+ remaining/);
  assert.match(script, /data\.nextBulkTemplate|dataset\.nextBulkTemplate/);
  assert.match(script, /element\.dataset\.displayText = visibleText/);
  assert.match(script, /element\.setAttribute\('aria-label', visibleText\)/);
  assert.match(script, /announcement\.textContent !== announcementText/);

  assert.match(styles, /\.bhd-volume\s*{[^}]*flex:\s*1 1 0/s);
  assert.match(styles, /\[data-display-text\]::after/);
  assert.match(styles, /\.bhd-volume__terms::before\s*{\s*content:\s*attr\(data-prefix\)/);

  assert.match(snippet, /2 jars: 10% off · 3–9 jars: 15% off · 10\+ jars: 20% off\*/);
  assert.match(snippet, /data-prefix="\*One-time purchases only\. "/);
  assert.match(snippet, /id="BhdVolumeTerms-\{\{ section_id \}\}">One-time purchases only\. Offers do not combine\.<\/span>/);
  assert.match(snippet, /data-volume-announcement aria-live="polite"/);
  assert.match(snippet, /data-next-bulk-template="Add __COUNT__ more for 20% off"/);
});
