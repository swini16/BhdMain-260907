'use strict';

const EXPECTED_SHOP = 'best-hydrate.myshopify.com';

// Validate the CLI operation receipt before opening a hosted preview or changing a cart.
// Receipt fields come from theme push --json; never infer a missing shop or preview URL.
function validateShopifyPreviewReceipt(receipt, expectedThemeId) {
  const theme = receipt?.theme;
  if (receipt?.status !== 'success' || !theme || theme.role !== 'development') {
    throw new Error('A successful development-theme operation receipt is required.');
  }
  const themeId = String(theme.id ?? '');
  if (!/^[1-9]\d*$/.test(expectedThemeId) || !/^[1-9]\d*$/.test(themeId)
      || themeId !== expectedThemeId) {
    throw new Error('The development-theme receipt must match this run.');
  }
  if (theme.storeDomain !== EXPECTED_SHOP) {
    throw new Error('The development-theme receipt must name the expected shop.');
  }
  let previewUrl;
  try { previewUrl = new URL(theme.previewUrl); } catch {
    throw new Error('The development-theme receipt must include a valid preview URL.');
  }
  if (previewUrl.protocol !== 'https:' || previewUrl.hostname !== EXPECTED_SHOP
      || previewUrl.username || previewUrl.password || previewUrl.port || previewUrl.hash
      || previewUrl.pathname !== '/') {
    throw new Error('The generated preview URL is outside the expected shop.');
  }
  const ids = previewUrl.searchParams.getAll('preview_theme_id');
  if (ids.length !== 1 || ids[0] !== themeId) {
    throw new Error('The generated preview URL must select this development theme.');
  }
  return Object.freeze({ themeId, shop: theme.storeDomain, previewUrl: previewUrl.href });
}

module.exports = { validateShopifyPreviewReceipt };
