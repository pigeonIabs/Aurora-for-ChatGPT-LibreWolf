// modules/aurora/central-observer.js
// Centralized DOM Event Bus to prevent observer multiplication overhead.
(() => {
  'use strict';

  // Ensure namespace exists early
  const A = (window.AuroraExt = window.AuroraExt || {});

  class AuroraCentralObserver {
    constructor() {
      this.callbacks = new Set();
      this.observer = new MutationObserver(this.handleMutations.bind(this));
      this.running = false;
    }

    subscribe(fn) {
      this.callbacks.add(fn);
    }

    unsubscribe(fn) {
      this.callbacks.delete(fn);
    }

    start() {
      if (!this.running) {
        const target = document.documentElement;
        if (target) {
            this.running = true;
            this.observer.observe(target, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'contenteditable', 'hidden', 'aria-hidden', 'disabled', 'aria-disabled', 'aria-busy', 'aria-expanded'] });
        }
      }
    }

    stop() {
      if (this.running) {
        this.observer.disconnect();
        this.running = false;
      }
    }

    handleMutations(mutations) {
      if (this.callbacks.size === 0) return;

      const relevant = [];
      const addedElements = [];
      const addedTexts = [];

      for (const m of mutations) {
        const target = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if (target?.closest?.('#cgpt-ambient-bg,#cgpt-qs-panel,#aurora-queue-panel,#aurora-queue-btn,#aurora-queue-toast')) continue;
        relevant.push(m);
        if (m.type === 'characterData' && m.target.nodeValue.trim()) addedTexts.push(m.target);
        if (m.type === 'attributes') addedElements.push(m.target);
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) addedElements.push(n);
          else if (n.nodeType === 3 && n.nodeValue.trim()) addedTexts.push(n);
        }
      }

      // Real removals still matter, but extension UI updates must never pulse themselves.
      if (!relevant.length) return;
      this.callbacks.forEach(cb => {
        try {
          cb({ mutations: relevant, addedElements, addedTexts });
        } catch (e) {
          // ignore
        }
      });
    }
  }

  A.centralObserver ||= new AuroraCentralObserver();

  // Auto-start on load
  const startObserver = () => A.centralObserver.start();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }
})();
