// modules/aurora/default-model.js
// Apply a user-selected default model in ChatGPT's model switcher UI.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.defaultModel = A.defaultModel || {};

  const cfg = A.config || {};
  const MODEL_LABEL_HINTS = cfg.MODEL_LABEL_HINTS || {};

  const normalizeToken = A.utils?.normalizeToken || ((v) => (v || '').toLowerCase().replace(/\s+/g, ' ').trim());
  const isEnabled = () => !!A.isActive?.();
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  let lastDefaultModelApplied = null;
  let modelApplyCooldownUntil = 0;
  let defaultModelApplyPromise = null;
  let applyingDefaultModel = false;
  let revision = 0;
  let controller = null;
  let activeGuard = () => false;
  const cancel = (manual = false) => {
    revision++;
    controller?.abort();
    A.centralObserver.setAttributeScope('model-picker', null);
    if (manual) lastDefaultModelApplied = `${location.pathname}|${getSettings().defaultModel || ''}`;
  };
  document.addEventListener('pointerdown', event => { if (event.isTrusted) cancel(true); }, true);
  document.addEventListener('keydown', event => { if (event.isTrusted) cancel(true); }, true);

  function modelTextMatches(text, slug) {
    const normalizedText = normalizeToken(text);
    if (!slug) return false;
    if (slug === 'gpt-5.6-sol-high' && normalizedText.includes('extra high')) return false;
    const hints = MODEL_LABEL_HINTS[slug] || [slug.replace(/-/g, ' ')];
    return hints.some((hint) => normalizedText.includes(normalizeToken(hint)));
  }

  function isElementVisible(el) {
    if (A.dom) return A.dom.isVisible(el);
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
    const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(el => isElementVisible(el) && (!button?.id || el.getAttribute('aria-labelledby') === button.id));
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
    return A.centralObserver.waitFor(getter, { timeout, signal: controller?.signal, valid: () => activeGuard() });
  }

  async function applyDefaultModelOnce(slug) {
    const button = A.dom?.findModelSwitcher() || document.querySelector('[data-testid="model-switcher-dropdown-button"]');
    if (!button || !activeGuard()) return false;
    if (button.hasAttribute('data-codex-intelligence-trigger')) return applyCurrentModel(button, slug);

    const currentLabel = button.getAttribute('aria-label') || button.textContent || '';
    if (modelTextMatches(currentLabel, slug)) {
      lastDefaultModelApplied = slug;
      return true;
    }

    applyingDefaultModel = true;
    try {
      if (button.getAttribute('aria-expanded') !== 'true') button.click();

      let menu = await waitFor(() => findModelMenu(button), 1200);
      if (!menu || !activeGuard()) return false;

      const option = await waitFor(() => findMenuOption(menu, slug));
      if (!option || !activeGuard() || option.getAttribute('aria-disabled') === 'true') return false;

      option.click();
      lastDefaultModelApplied = slug;
      return true;
    } finally {
      applyingDefaultModel = false;
      requestAnimationFrame(() => {
        if (activeGuard() && button.getAttribute('aria-expanded') === 'true') button.click();
      });
    }
  }

  function openPicker(button) {
    if (button.getAttribute('aria-expanded') === 'true') return;
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }));
    button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse' }));
  }

  async function applyCurrentModel(button, slug) {
    const isCurrent = () => activeGuard() && getSettings().defaultModel === slug;
    if (!isCurrent() || !button.closest('form[data-chatgpt-composer]')) return false;
    const choice = {
      'gpt-5.5-instant': { model: 'gpt-5.5', effort: null },
      'gpt-5.6-sol-medium': { model: 'gpt-5.6 sol', effort: 'medium', step: 1 },
      'gpt-5.6-sol-high': { model: 'gpt-5.6 sol', effort: 'high', step: 2 },
    }[slug];
    if (!choice) return false;
    applyingDefaultModel = true;
    let menu;
    try {
      openPicker(button);
      menu = await waitFor(() => findModelMenu(button));
      if (!menu || !isCurrent()) return false;
      if (!A.dom.firstVisible('[role="menuitemradio"]', menu)) {
        A.dom.firstVisible('[data-model-picker-view-toggle]', menu)?.click();
      }
      const option = await waitFor(() => [...menu.querySelectorAll('[role="menuitemradio"]')].find(el => isElementVisible(el) && normalizeToken(el.textContent).startsWith(choice.model)));
      if (!option || !isCurrent() || option.getAttribute('aria-disabled') === 'true') return false;
      // Selecting the current model also returns the picker to its power view.
      option.click();
      if (!await waitFor(() => !option.isConnected || option.getAttribute('aria-checked') === 'true' ||
          button.getAttribute('aria-expanded') !== 'true')) return false;
      if (!isCurrent()) return false;
      if (choice.effort && button.getAttribute('data-selected-reasoning-effort') !== choice.effort) {
        openPicker(button);
        menu = await waitFor(() => findModelMenu(button));
        let control = await waitFor(() => A.dom.firstVisible('[data-reasoning-slider]:not([aria-disabled="true"])', menu));
        if (!control || !isCurrent()) return false;
        control.focus();
        const slider = control.querySelector('[role="slider"]');
        const current = Number(slider?.getAttribute('aria-valuenow'));
        if (!Number.isFinite(current)) return false;
        const key = current > choice.step ? 'ArrowLeft' : 'ArrowRight';
        for (let index = 0; index < Math.abs(current - choice.step); index += 1) {
          if (!isCurrent()) return false;
          control.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true }));
          const expected = current + (key === 'ArrowLeft' ? -1 : 1) * (index + 1);
          control = await waitFor(() => {
            const updated = A.dom.firstVisible('[data-reasoning-slider]:not([aria-disabled="true"])', menu);
            return Number(updated?.querySelector('[role="slider"]')?.getAttribute('aria-valuenow')) === expected && updated;
          });
          if (!control) return false;
        }
        if (!await waitFor(() => button.getAttribute('data-selected-reasoning-effort') === choice.effort)) return false;
      }
      lastDefaultModelApplied = slug;
      return true;
    } finally {
      if (isCurrent() && button.getAttribute('aria-expanded') === 'true') menu?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      applyingDefaultModel = false;
    }
  }

  function maybeApply(force = false) {
    if (!isEnabled() || document.hidden || !A.site.isNewConversation(location.pathname)) return;

    const s = getSettings();
    const slug = String(s.defaultModel || '').trim();
    if (!slug) {
      lastDefaultModelApplied = null;
      modelApplyCooldownUntil = 0;
      return;
    }

    if (!force && Date.now() < modelApplyCooldownUntil) return;
    if (!force && lastDefaultModelApplied === `${location.pathname}|${slug}`) return;
    if (applyingDefaultModel || defaultModelApplyPromise) return;
    if (A.dom.getComposerText(A.dom.findActiveComposer()).trim()) return;

    const ownRevision = revision;
    const ownPath = location.pathname;
    const ownController = new AbortController();
    controller = ownController;
    A.centralObserver.setAttributeScope('model-picker', document.body, ['class', 'style'], node =>
      !!node.closest('[role="menu"], [role="listbox"], [data-codex-intelligence-trigger], [data-testid="model-switcher-dropdown-button"]'));
    activeGuard = () => ownRevision === revision && ownPath === location.pathname && isEnabled() && !document.hidden &&
      getSettings().defaultModel === slug && !A.dom.getComposerText(A.dom.findActiveComposer()).trim();
    const attempt = async () => {
      if (!await waitFor(() => A.dom.findModelSwitcher(), 2500)) return false;
      const success = activeGuard() && await applyDefaultModelOnce(slug);
      if (success) {
        lastDefaultModelApplied = `${location.pathname}|${slug}`;
        modelApplyCooldownUntil = Date.now() + 1500;
        return true;
      }
      modelApplyCooldownUntil = Date.now() + 6000;
      return false;
    };

    defaultModelApplyPromise = attempt().finally(() => {
      if (controller === ownController) {
        controller = null;
        A.centralObserver.setAttributeScope('model-picker', null);
      }
      defaultModelApplyPromise = null;
    });
  }

  A.defaultModel.cancel = cancel;
  A.defaultModel.maybeApply = A.defaultModel.maybeApply || maybeApply;
})();
