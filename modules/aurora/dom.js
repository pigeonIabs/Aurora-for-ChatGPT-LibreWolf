// Shared selectors and input helpers for the current ChatGPT and Codex composers.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  if (A.dom) return;

  const selectors = Object.freeze({
    appRoot: '#root',
    sidebar: '#app-shell-sidebar',
    composerForm: 'form[data-chatgpt-composer]',
    composerEditor: 'form[data-chatgpt-composer] [contenteditable="true"][data-composer-markdown]',
    codexComposerEditor: '#prompt-textarea[contenteditable="true"]',
    modelSwitcher: 'button[data-codex-intelligence-trigger="true"]',
    legacyModelSwitcher: '[data-testid="model-switcher-dropdown-button"]',
  });

  function isVisible(element) {
    if (!element || !element.isConnected || element.hidden) return false;

    const rect = element.getBoundingClientRect?.();
    if (!rect || rect.width < 1 || rect.height < 1) return false;

    for (let node = element; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
      if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true') return false;
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.contentVisibility === 'hidden') {
        return false;
      }
    }

    return true;
  }

  function firstVisible(selector, root = document) {
    if (!selector || !root?.querySelectorAll) return null;
    for (const element of root.querySelectorAll(selector)) {
      if (isVisible(element)) return element;
    }
    return null;
  }

  function findActiveComposer() {
    const candidates = [
      selectors.composerEditor,
      selectors.codexComposerEditor,
      '[contenteditable="true"][data-composer-markdown]',
      'form[data-chatgpt-composer] textarea',
      'textarea#prompt-textarea',
      'textarea#mobile-composer-prompt',
      'textarea[id*="prompt"]',
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Send" i]',
    ];

    for (const selector of candidates) {
      const match = firstVisible(selector);
      if (match) return match;
    }
    return null;
  }

  function findModelSwitcher() {
    return firstVisible(selectors.modelSwitcher) || firstVisible(selectors.legacyModelSwitcher);
  }

  function getComposerForm(composer) {
    return composer?.closest?.(selectors.composerForm) || composer?.closest?.('form') || null;
  }

  function getComposerText(composer) {
    if (!composer) return '';
    if (composer.tagName === 'TEXTAREA' || composer.tagName === 'INPUT') return composer.value || '';
    return composer.innerText || composer.textContent || '';
  }

  function findComposerButton(composer, kind) {
    const form = getComposerForm(composer);
    if (!form) return null;
    const selector = kind === 'stop'
      ? 'button[data-testid="stop-button"],button[data-testid*="stop-generating"],button[aria-label="Stop generating"],button[aria-label="Stop streaming"],button[aria-label="Stop response"],button[aria-label="Stop"]'
      : 'button[data-testid="send-button"],button[type="submit"],button[aria-label="Send message"],button[aria-label="Send prompt"],button[aria-label="Send"]';
    return firstVisible(selector, form);
  }

  function dispatchInput(composer, inputType, data) {
    let event;
    try {
      event = new InputEvent('input', { bubbles: true, inputType, data });
    } catch (e) {
      event = new Event('input', { bubbles: true });
    }
    composer.dispatchEvent(event);
  }

  function setComposerText(composer, value) {
    if (!composer) return;
    const text = value == null ? '' : String(value);

    if (composer.tagName === 'TEXTAREA' || composer.tagName === 'INPUT') {
      const prototype = composer.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (setter) setter.call(composer, text);
      else composer.value = text;
      dispatchInput(composer, 'insertText', text);
      return;
    }

    try {
      composer.focus();
      const selection = window.getSelection?.();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(composer);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      const command = text ? 'insertText' : 'delete';
      const inserted = document.execCommand?.(command, false, text || null);
      if (!inserted || getComposerText(composer) !== text) composer.textContent = text;
    } catch (e) {
      composer.textContent = text;
    }
    dispatchInput(composer, text ? 'insertText' : 'deleteContentBackward', text || null);
  }

  A.dom = Object.freeze({
    selectors,
    isVisible,
    firstVisible,
    findActiveComposer,
    findModelSwitcher,
    getComposerForm,
    getComposerText,
    findComposerButton,
    setComposerText,
  });
})();
