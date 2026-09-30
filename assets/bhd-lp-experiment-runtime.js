(() => {
  'use strict';

  const root = document.documentElement;
  if (root.dataset.bhdExperimentRuntime === 'true') return;
  root.dataset.bhdExperimentRuntime = 'true';

  const registry = window.BHD_LP_EXPERIMENTS || {};
  const legacyPageHandle = String(window.BHD_LP_PAGE_HANDLE || '').trim();
  const rawContext = window.BHD_EXPERIMENT_CONTEXT || {};
  const surface = String(rawContext.surface || (legacyPageHandle ? 'landing_page' : '')).trim().toLowerCase();
  const contextHandle = String(rawContext.handle || legacyPageHandle || '').trim().toLowerCase();
  const experiments = Array.isArray(registry.experiments) ? registry.experiments : [];

  const TARGETS = Object.freeze({
    'open.eyebrow': '[data-bhd-lp-open] .bhd-lp-open__eyebrow',
    'open.lead': '[data-bhd-lp-open] .bhd-lp-open__lead strong',
    'open.earlyCta': '[data-bhd-lp-open] [data-lp-cta="early"]',
    'open.lowSugarLink': '[data-bhd-lp-open] [data-lp-cta="low-sugar"]',
    'close.tasteEyebrow': '[data-lp-section="taste"] .bhd-lp-close__eyebrow',
    'close.tasteHeadline': '[data-lp-section="taste"] h2',
    'close.tasteBody': '[data-lp-section="taste"] > p:last-child',
    'close.offerEyebrow': '[data-lp-section="offer"] .bhd-lp-close__eyebrow',
    'close.offerHeadline': '[data-lp-section="offer"] h2',
    'close.offerBody': '[data-lp-section="offer"] > p:last-of-type',
    'close.finalCta': '[data-lp-section="offer"] [data-lp-cta="final"]',
    'close.stickyCta': '[data-bhd-lp-close] [data-lp-cta="sticky"]',
    'product.addToCart': '[id^="MainProduct-"] .product-form__submit[name="add"] > span',
    'product.deliveryNote': '[id^="MainProduct-"] .bhd-delivery-note',
    'product.purchaseChoiceTitle': '[id^="MainProduct-"] .bhd-purchase-choice strong',
    'product.purchaseChoiceBody': '[id^="MainProduct-"] .bhd-purchase-choice span',
    'product.reassurance': '[id^="MainProduct-"] .bhd-purchase-note',
    'product.stickyCta': '[id^="MainProduct-"] [data-bhd-mobile-sticky-buy] [data-bhd-sticky-submit]',
    'product.stickyShipping': '[id^="MainProduct-"] [data-bhd-mobile-sticky-buy] > span'
  });

  const PRODUCT_TARGETS = new Set([
    'product.addToCart','product.deliveryNote','product.purchaseChoiceTitle',
    'product.purchaseChoiceBody','product.reassurance','product.stickyCta','product.stickyShipping'
  ]);

  const cleanId = value => String(value || '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 96);
  const normalizedSurface = exp => String(exp?.surface || (exp?.pageHandle ? 'landing_page' : '')).trim().toLowerCase();
  const matchesContext = exp => {
    const expSurface = normalizedSurface(exp);
    if (expSurface !== surface) return false;
    if (surface === 'landing_page') return String(exp.pageHandle || '').trim().toLowerCase() === contextHandle;
    if (surface === 'product') return String(exp.productHandle || '').trim().toLowerCase() === contextHandle;
    return false;
  };

  const active = experiments.filter(exp =>
    exp &&
    String(exp.status || '').toLowerCase() === 'active' &&
    matchesContext(exp) &&
    Array.isArray(exp.variants) &&
    exp.variants.length >= 2
  );

  if (!active.length) return;

  const experiment = active[0];
  const experimentId = cleanId(experiment.id);
  if (!experimentId) return;

  const variants = experiment.variants
    .map((variant, index) => ({
      id: cleanId(variant?.id || String.fromCharCode(65 + index)),
      weight: Math.max(0, Number(variant?.weight ?? 1) || 0),
      changes: variant?.changes && typeof variant.changes === 'object' ? variant.changes : {}
    }))
    .filter(variant => variant.id && variant.weight > 0);

  if (variants.length < 2) return;

  const params = new URLSearchParams(location.search);
  const forcedExperiment = cleanId(params.get('bhd_exp'));
  const forcedVariant = cleanId(params.get('bhd_var'));
  let chosen = null;

  if (forcedExperiment === experimentId && forcedVariant) {
    chosen = variants.find(variant => variant.id === forcedVariant) || null;
  }

  const storageKey = 'bhd_exp:' + experimentId;
  if (!chosen) {
    try {
      const stored = cleanId(localStorage.getItem(storageKey) || localStorage.getItem('bhd_lp_exp:' + experimentId));
      chosen = variants.find(variant => variant.id === stored) || null;
    } catch (_) {}
  }

  if (!chosen) {
    const total = variants.reduce((sum, variant) => sum + variant.weight, 0);
    let cursor = Math.random() * total;
    chosen = variants[variants.length - 1];
    for (const variant of variants) {
      cursor -= variant.weight;
      if (cursor <= 0) {
        chosen = variant;
        break;
      }
    }
    try { localStorage.setItem(storageKey, chosen.id); } catch (_) {}
  }

  const safeProductTarget = (field, element) => {
    if (!PRODUCT_TARGETS.has(field)) return true;
    if (surface !== 'product') return false;
    if (field === 'product.addToCart') {
      const button = element.closest('button');
      if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return false;
    }
    return true;
  };

  const applyChanges = () => {
    for (const [field, rawValue] of Object.entries(chosen.changes || {})) {
      const selector = TARGETS[field];
      if (!selector || typeof rawValue !== 'string') continue;
      const value = rawValue.trim().slice(0, 320);
      if (!value) continue;
      const element = document.querySelector(selector);
      if (!element || !safeProductTarget(field, element)) continue;
      if (String(element.textContent || '').trim() !== value) element.textContent = value;
    }
  };

  const setHiddenProperty = (form, property, value) => {
    const name = 'properties[' + property + ']';
    let input = form.querySelector('input[type="hidden"][name="' + name + '"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    if (input.value !== value) input.value = value;
  };

  const syncProductAttribution = () => {
    if (surface !== 'product') return;
    const productRoot = document.querySelector('[id^="MainProduct-"]');
    if (!productRoot) return;
    productRoot.querySelectorAll('form[action*="/cart/add"]').forEach(form => {
      setHiddenProperty(form, '_bhd_experiment', experimentId);
      setHiddenProperty(form, '_bhd_variant', chosen.id);
      setHiddenProperty(form, '_bhd_surface', 'product');
    });
  };

  applyChanges();
  syncProductAttribution();

  if (surface === 'product' && 'MutationObserver' in window) {
    const productRoot = document.querySelector('[id^="MainProduct-"]');
    if (productRoot) {
      let queued = false;
      const resync = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          applyChanges();
          syncProductAttribution();
        });
      };
      new MutationObserver(resync).observe(productRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled','aria-disabled'] });
    }
  }

  root.dataset.bhdExperimentId = experimentId;
  root.dataset.bhdExperimentVariant = chosen.id;
  root.dataset.bhdExperimentSurface = surface;
  root.dataset.bhdExperimentContext = contextHandle;
  if (surface === 'landing_page') root.dataset.bhdExperimentPage = contextHandle;
  if (surface === 'product') root.dataset.bhdExperimentProduct = contextHandle;

  const detail = Object.freeze({
    experiment_id: experimentId,
    variant_id: chosen.id,
    surface,
    context_handle: contextHandle,
    ...(surface === 'landing_page' ? { page_handle: contextHandle } : {}),
    ...(surface === 'product' ? { product_handle: contextHandle } : {})
  });
  window.BHD_STOREFRONT_EXPERIMENT = detail;
  if (surface === 'landing_page') window.BHD_LP_EXPERIMENT = detail;
  if (surface === 'product') window.BHD_PRODUCT_EXPERIMENT = detail;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'bhd_experiment_exposure', ...detail });
  if (window.amplitude && typeof window.amplitude.track === 'function') {
    window.amplitude.track(surface === 'product' ? 'Product Experiment Exposed' : 'LP Experiment Exposed', detail);
  }

  document.dispatchEvent(new CustomEvent('bhd:experiment-ready', { detail }));
})();
