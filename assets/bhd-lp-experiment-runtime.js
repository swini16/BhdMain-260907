(() => {
  'use strict';

  const root = document.documentElement;
  if (root.dataset.bhdLpExperimentRuntime === 'true') return;
  root.dataset.bhdLpExperimentRuntime = 'true';

  const registry = window.BHD_LP_EXPERIMENTS || {};
  const pageHandle = String(window.BHD_LP_PAGE_HANDLE || '').trim();
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
    'close.stickyCta': '[data-bhd-lp-close] [data-lp-cta="sticky"]'
  });

  const cleanId = value => String(value || '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 96);

  const active = experiments.filter(exp =>
    exp &&
    String(exp.status || '').toLowerCase() === 'active' &&
    String(exp.pageHandle || '') === pageHandle &&
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

  const storageKey = 'bhd_lp_exp:' + experimentId;
  if (!chosen) {
    try {
      const stored = cleanId(localStorage.getItem(storageKey));
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

  for (const [field, rawValue] of Object.entries(chosen.changes || {})) {
    const selector = TARGETS[field];
    if (!selector || typeof rawValue !== 'string') continue;
    const value = rawValue.trim().slice(0, 320);
    if (!value) continue;
    const element = document.querySelector(selector);
    if (!element) continue;
    element.textContent = value;
  }

  root.dataset.bhdExperimentId = experimentId;
  root.dataset.bhdExperimentVariant = chosen.id;
  root.dataset.bhdExperimentPage = pageHandle;

  const detail = Object.freeze({
    experiment_id: experimentId,
    variant_id: chosen.id,
    page_handle: pageHandle
  });
  window.BHD_LP_EXPERIMENT = detail;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'bhd_experiment_exposure', ...detail });
  if (window.amplitude && typeof window.amplitude.track === 'function') {
    window.amplitude.track('LP Experiment Exposed', detail);
  }

  document.dispatchEvent(new CustomEvent('bhd:experiment-ready', { detail }));
})();
