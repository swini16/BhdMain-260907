(() => {
  const initialize = (scope = document) => {
    const roots = scope.matches?.('product-info') ? [scope] : scope.querySelectorAll('product-info');
    for (const root of roots) {
      if (root.dataset.bhdBackorderStickyReady === 'true') continue;
      root.dataset.bhdBackorderStickyReady = 'true';
      const sync = () => {
        const sticky = root.querySelector('[data-bhd-mobile-sticky-buy]');
        if (!sticky) return;
        const source = root.querySelector('[id^="BhdBackorder-"] .bhd-backorder-notice');
        const text = source?.textContent.trim() || '';
        let notice = sticky.querySelector('.bhd-backorder-sticky-notice');
        if (!text) {
          notice?.remove();
          return;
        }
        if (!notice) {
          notice = document.createElement('p');
          notice.className = 'bhd-backorder-sticky-notice';
          notice.setAttribute('role', 'status');
          sticky.prepend(notice);
        }
        if (notice.textContent !== text) notice.textContent = text;
      };
      sync();
      new MutationObserver(sync).observe(root, { childList: true, subtree: true, characterData: true });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initialize(), { once: true });
  else initialize();
  document.addEventListener('shopify:section:load', event => initialize(event.target));
})();
