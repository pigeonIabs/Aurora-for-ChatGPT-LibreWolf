// Native model menus supply the catalog so account availability stays authoritative.
(() => {
  'use strict';
  const A = window.AuroraExt;
  const workflow = A.site.workflow;
  const catalogKey = `modelCatalog:${A.site.id}`;
  const normalize = text => String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  let catalog = [];
  let session = null;
  let attemptKey = '';
  let timer = null;
  let openTimer = null;
  let inspectionQueued = false;
  let route = location.pathname;

  function label(node) {
    const name = node?.querySelector(workflow.modelLabel);
    return normalize(name?.textContent || node?.getAttribute('data-model-name') || node?.textContent?.split('\n')[0]);
  }

  function currentModel() {
    const trigger = A.dom.findModelSwitcher();
    return trigger ? normalize(workflow.currentLabel?.(trigger) || label(trigger)) : '';
  }

  const visibleMenus = () => [...document.querySelectorAll('[role="menu"], [role="listbox"], [role="dialog"]')]
    .filter(node => !node.closest('#cgpt-qs-panel') && A.dom.isVisible(node));

  function cancel(close = true) {
    clearTimeout(timer);
    clearTimeout(openTimer);
    timer = null;
    openTimer = null;
    const previous = session;
    session = null;
    A.centralObserver.setAttributeScope('model-picker', null);
    // Close only the picker this module opened, provided focus stayed within it.
    if (close && previous?.owned && previous.trigger.isConnected && previous.menu?.isConnected) {
      const focused = document.activeElement;
      if (focused === previous.trigger || previous.menu.contains(focused)) {
        previous.menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      }
    }
  }

  function remember(names) {
    const next = [...new Set(names.filter(Boolean))].slice(0, 32);
    if (!next.length || JSON.stringify(next) === JSON.stringify(catalog)) return;
    catalog = next;
    chrome.storage.local.set({ [catalogKey]: catalog }).catch(() => {});
  }

  function scheduleInspection() {
    if (!session || inspectionQueued) return;
    inspectionQueued = true;
    queueMicrotask(() => {
      inspectionQueued = false;
      inspectMenu();
    });
  }

  function startSession(value) {
    session = value;
    A.centralObserver.setAttributeScope('model-picker', document.body, ['class', 'style'], node =>
      !!node.closest(`[role="menu"], [role="listbox"], [role="dialog"], ${workflow.modelTrigger}`));
    timer = setTimeout(() => cancel(), 2500);
    scheduleInspection();
  }

  A.centralObserver.subscribe(scheduleInspection);

  function inspectMenu() {
    if (!session || !A.isActive() || document.hidden || route !== location.pathname) { cancel(); return; }
    const controlledId = session.trigger.getAttribute('aria-controls');
    const controlled = controlledId && document.getElementById(controlledId);
    const menus = visibleMenus();
    const menu = (controlled && A.dom.isVisible(controlled) && controlled) ||
      menus.find(node => !session.before.has(node)) || session.menu;
    if (menu?.isConnected && A.dom.isVisible(menu)) {
      session.menu = menu;
      const options = [...menu.querySelectorAll(workflow.modelOption)]
        .filter(node => A.dom.isVisible(node) && !node.disabled && node.getAttribute('aria-disabled') !== 'true' && !node.hasAttribute('data-disabled'));
      const choices = options.map(node => ({ node, name: label(node) })).filter(item => item.name);
      remember(choices.map(item => item.name));
      if (session.owned) {
        const match = choices.find(item => item.name.toLocaleLowerCase() === session.preferred.toLocaleLowerCase());
        if (match && !A.dom.getComposerText(A.dom.findActiveComposer()).trim()) {
          // A preference changes the native picker only. The host owns model access.
          session = null;
          A.centralObserver.setAttributeScope('model-picker', null);
          clearTimeout(timer);
          clearTimeout(openTimer);
          timer = null;
          openTimer = null;
          match.node.click();
          return;
        }
      }
    }
  }

  function maybeApply(force = false) {
    if (route !== location.pathname) { cancel(); route = location.pathname; attemptKey = ''; }
    if (!A.isActive() || document.hidden) { cancel(); return; }
    if (session) { inspectMenu(); return; }
    const preferred = normalize(A.getSettings().siteDefaultModels?.[A.site.id]);
    if (!preferred || !A.site.isNewConversation(route)) return;
    const key = `${route}|${preferred}`;
    if (!force && attemptKey === key) return;
    const trigger = A.dom.findModelSwitcher();
    const composer = A.dom.findActiveComposer();
    if (!trigger || trigger.disabled || !composer || A.dom.getComposerText(composer).trim() || A.dom.isGenerating()) return;
    if (trigger.getAttribute('aria-expanded') === 'true' || visibleMenus().length) return;
    attemptKey = key;
    if (currentModel().toLocaleLowerCase() === preferred.toLocaleLowerCase()) return;
    startSession({ trigger, preferred, before: new Set(visibleMenus()), owned: true });
    const openedSession = session;
    trigger.click();
    openTimer = setTimeout(() => {
      if (session !== openedSession) return;
      openTimer = null;
      if (!visibleMenus().some(node => !session.before.has(node))) {
        trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse', isPrimary: true }));
        trigger.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse', isPrimary: true }));
      }
      inspectMenu();
    }, 100);
  }

  document.addEventListener('pointerdown', event => {
    if (!event.isTrusted) return;
    if (session?.owned) cancel(false);
    const trigger = event.target.closest(workflow.modelTrigger);
    if (!trigger || !A.isActive()) return;
    route = location.pathname;
    attemptKey = `${route}|${normalize(A.getSettings().siteDefaultModels?.[A.site.id])}`;
    cancel(false);
    startSession({ trigger, before: new Set(visibleMenus()), owned: false });
  }, true);
  document.addEventListener('keydown', event => {
    if (event.isTrusted && session?.owned) cancel(false);
  }, true);
  document.addEventListener('click', event => {
    if (!event.isTrusted || !A.isActive()) return;
    const trigger = event.target.closest(workflow.modelTrigger);
    if (!trigger || session?.trigger === trigger) return;
    route = location.pathname;
    attemptKey = `${route}|${normalize(A.getSettings().siteDefaultModels?.[A.site.id])}`;
    cancel(false);
    startSession({ trigger, before: new Set(visibleMenus()), owned: false });
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  chrome.storage.local.get(catalogKey).then(data => {
    if (!catalog.length && Array.isArray(data[catalogKey])) catalog = data[catalogKey].filter(item => typeof item === 'string').map(normalize).slice(0, 32);
  }).catch(() => {});
  A.defaultModel = { maybeApply, cancel, snapshot: () => ({ currentModel: currentModel(), models: catalog }) };
})();
