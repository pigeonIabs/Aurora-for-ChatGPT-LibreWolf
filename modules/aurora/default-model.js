// modules/aurora/default-model.js
// Apply a user-selected default model in ChatGPT's model switcher UI.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.defaultModel = A.defaultModel || {};

  const cfg = A.config || {};
  const MODEL_LABEL_HINTS = cfg.MODEL_LABEL_HINTS || {};

  const normalizeToken = A.utils?.normalizeToken || ((v) => (v || '').toLowerCase().replace(/\s+/g, ' ').trim());
  const isEnabled = () => (A.isEnabled ? A.isEnabled() : true);
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  let lastDefaultModelApplied = null;
  let modelApplyCooldownUntil = 0;
  let defaultModelApplyPromise = null;
  let applyingDefaultModel = false;

  function modelTextMatches(text, slug) {
    const normalizedText = normalizeToken(text);
    if (!slug) return false;
    if (slug === 'gpt-5.6-sol-high' && normalizedText.includes('extra high')) return false;
    const hints = MODEL_LABEL_HINTS[slug] || [slug.replace(/-/g, ' ')];
    return hints.some((hint) => normalizedText.includes(normalizeToken(hint)));
  }

  function isElementVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect?.();
    return !!rect && rect.width > 0 && rect.height > 0;
  }

  function findModelMenu(button) {
    const ariaControls = button?.getAttribute?.('aria-controls');
    if (ariaControls) {
      const controlled = document.getElementById(ariaControls);
      if (controlled && isElementVisible(controlled)) return controlled;
    }
    const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(isElementVisible);
    return menus[menus.length - 1] || null;
  }

  function findMenuOption(menu, slug) {
    const hints = MODEL_LABEL_HINTS[slug] || [slug.replace(/-/g, ' ')];
    const normalizedHints = hints.map(normalizeToken).filter(Boolean);
    const candidates = Array.from(menu.querySelectorAll('[role="menuitemradio"], [role="menuitem"], button')).filter(
      (el) => isElementVisible(el) && el.closest?.('[role="menu"]') === menu
    );

    const candidateText = candidates
      .map((el) => ({
        el,
        text: normalizeToken(el.getAttribute('aria-label') || el.textContent || ''),
      }))
      .filter(({ text }) => text)
      .filter(({ text }) => slug !== 'gpt-5.6-sol-high' || !text.includes('extra high'));

    const matchers = [
      (text, hint) => text === hint,
      (text, hint) => text.startsWith(`${hint} `),
      (text, hint) => text.endsWith(` ${hint}`),
      (text, hint) => text.includes(hint),
    ];

    for (const matches of matchers) {
      for (const { el, text } of candidateText) {
        if (normalizedHints.some((hint) => matches(text, hint))) return el;
      }
    }

    return null;
  }

  function waitFor(getter, timeout = 1200) {
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = () => {
        const value = typeof getter === 'function' ? getter() : document.querySelector(getter);
        if (value) return resolve(value);
        if (performance.now() - start >= timeout) return resolve(null);
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  async function applyDefaultModelOnce(slug) {
    const button = document.querySelector('[data-testid="model-switcher-dropdown-button"]');
    if (!button) return false;

    const currentLabel = button.getAttribute('aria-label') || button.textContent || '';
    if (modelTextMatches(currentLabel, slug)) {
      lastDefaultModelApplied = slug;
      return true;
    }

    applyingDefaultModel = true;
    try {
      if (button.getAttribute('aria-expanded') !== 'true') button.click();

      let menu = await waitFor(() => findModelMenu(button), 1200);
      if (!menu) return false;

      const option = findMenuOption(menu, slug);
      if (!option) return false;

      option.click();
      lastDefaultModelApplied = slug;
      return true;
    } finally {
      applyingDefaultModel = false;
      requestAnimationFrame(() => {
        if (button.getAttribute('aria-expanded') === 'true') button.click();
      });
    }
  }

  function maybeApply(force = false) {
    if (!isEnabled()) return;

    const s = getSettings();
    const slug = String(s.defaultModel || '').trim();
    if (!slug) {
      lastDefaultModelApplied = null;
      modelApplyCooldownUntil = 0;
      return;
    }

    if (!force && Date.now() < modelApplyCooldownUntil) return;
    if (applyingDefaultModel || defaultModelApplyPromise) return;

    const attempt = async (remaining) => {
      const success = await applyDefaultModelOnce(slug);
      if (success) {
        modelApplyCooldownUntil = Date.now() + 1500;
        return true;
      }
      if (remaining <= 0) {
        modelApplyCooldownUntil = Date.now() + 6000;
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
      return attempt(remaining - 1);
    };

    defaultModelApplyPromise = attempt(2).finally(() => {
      defaultModelApplyPromise = null;
    });
  }

  A.defaultModel.maybeApply = A.defaultModel.maybeApply || maybeApply;
})();
