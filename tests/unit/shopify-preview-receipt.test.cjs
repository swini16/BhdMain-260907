'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateShopifyPreviewReceipt } = require('../playwright/helpers/shopify-preview-receipt.cjs');

// Shape and fields captured from the successful Shopify CLI receipt in PR #244.
const themeId = '183930323228';
const valid = () => ({
  status: 'success', changed: true, issues: [],
  theme: {
    id: themeId, name: 'pr-244-proposed', role: 'development',
    storeDomain: 'best-hydrate.myshopify.com',
    previewUrl: `https://best-hydrate.myshopify.com?preview_theme_id=${themeId}`,
    editorUrl: `https://best-hydrate.myshopify.com/admin/themes/${themeId}/editor`,
  },
});

test('accepts the observed successful CLI receipt and normalizes its root URL', () => {
  assert.deepEqual(validateShopifyPreviewReceipt(valid(), themeId), {
    themeId, shop: 'best-hydrate.myshopify.com',
    previewUrl: `https://best-hydrate.myshopify.com/?preview_theme_id=${themeId}`,
  });
});

for (const [name, change] of [
  ['unsuccessful operation', r => { r.status = 'error'; }],
  ['live theme', r => { r.theme.role = 'main'; }],
  ['wrong run', r => { r.theme.id = '123'; }],
  ['missing shop', r => { delete r.theme.storeDomain; }],
  ['wrong shop', r => { r.theme.storeDomain = 'another.myshopify.com'; }],
  ['missing URL', r => { delete r.theme.previewUrl; }],
  ['wrong URL host', r => { r.theme.previewUrl = `https://another.myshopify.com/?preview_theme_id=${themeId}`; }],
  ['insecure URL', r => { r.theme.previewUrl = r.theme.previewUrl.replace('https:', 'http:'); }],
  ['URL credentials', r => { r.theme.previewUrl = r.theme.previewUrl.replace('https://', 'https://user:secret@'); }],
  ['custom port', r => { r.theme.previewUrl = r.theme.previewUrl.replace('.com?', '.com:8443?'); }],
  ['non-root path', r => { r.theme.previewUrl = r.theme.previewUrl.replace('.com?', '.com/cart?'); }],
  ['URL fragment', r => { r.theme.previewUrl += '#section'; }],
  ['missing theme selector', r => { r.theme.previewUrl = 'https://best-hydrate.myshopify.com/'; }],
  ['wrong theme selector', r => { r.theme.previewUrl = r.theme.previewUrl.replace(themeId, '123'); }],
  ['duplicate theme selector', r => { r.theme.previewUrl += `&preview_theme_id=${themeId}`; }],
]) {
  test(`rejects ${name} before browser navigation`, () => {
    const receipt = valid(); change(receipt);
    assert.throws(() => validateShopifyPreviewReceipt(receipt, themeId));
  });
}

test('a missing expected theme ID never falls back to live', () => {
  assert.throws(() => validateShopifyPreviewReceipt(valid(), ''));
});
