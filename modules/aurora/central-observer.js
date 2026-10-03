// modules/aurora/central-observer.js
// Centralized DOM Event Bus to prevent observer multiplication overhead.
(() => {
  'use strict';

  // Ensure namespace exists early
  const A = (window.AuroraExt = window.AuroraExt || {});
  const ownUI = A.ownedUI;

  class AuroraCentralObserver {
    constructor() {
      this.callbacks = new Set();
      this.attributeScopes = new Map();
      this.observer = new MutationObserver(this.handleMutations.bind(this));
      this.running = false;
    }

    subscribe(fn) {
      this.callbacks.add(fn);
      return () => this.unsubscribe(fn);
    }

    unsubscribe(fn) {
      this.callbacks.delete(fn);
    }

    // Await host state through the existing event bus. The timeout bounds the
    // operation, while cancellation immediately releases its subscription.
    waitFor(getter, { timeout = 1200, signal, valid = () => true } = {}) {
      return new Promise(resolve => {
        let timer;
        const finish = value => {
          clearTimeout(timer);
          this.unsubscribe(probe);
          signal?.removeEventListener('abort', abort);
          resolve(value);
        };
        const abort = () => finish(null);
        const probe = () => {
          if (signal?.aborted || !valid()) { finish(null); return; }
          const value = getter();
          if (value) finish(value);
        };
        this.subscribe(probe);
        signal?.addEventListener('abort', abort, { once: true });
        timer = setTimeout(abort, timeout);
        probe();
      });
    }

    observeTargets() {
      this.observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'contenteditable', 'hidden', 'aria-hidden', 'disabled', 'aria-disabled', 'aria-busy', 'aria-expanded', 'aria-checked', 'aria-valuenow', 'data-selected-reasoning-effort', 'aria-label', 'title'] });
      for (const { target, attributes } of this.attributeScopes.values()) {
        if (target.isConnected) this.observer.observe(target, { attributes: true, subtree: true, attributeFilter: attributes });
      }
    }

    setAttributeScope(name, target, attributes = [], filter = null) {
      const previous = this.attributeScopes.get(name);
      if (previous?.target === target || (!previous && !target)) return;
      if (target) this.attributeScopes.set(name, { target, attributes, filter });
      else this.attributeScopes.delete(name);
      if (!this.running) return;
      const pending = this.observer.takeRecords();
      this.observer.disconnect();
      this.observeTargets();
      if (pending.length) this.handleMutations(pending);
    }

    start() {
      if (!this.running) {
        const target = document.documentElement;
        if (target) {
            this.running = true;
            this.observeTargets();
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
      const addedElements = new Set();
      const addedTexts = new Set();

      for (const m of mutations) {
        const target = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if (target?.closest?.(ownUI)) continue;
        if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style')) {
          let relevantScope = false;
          for (const scope of this.attributeScopes.values()) {
            if (scope.target.contains(target) && scope.attributes.includes(m.attributeName) && (!scope.filter || scope.filter(target))) {
              relevantScope = true;
              break;
            }
          }
          if (!relevantScope) continue;
        }
        relevant.push(m);
        if (m.type === 'characterData' && m.target.nodeValue?.trim()) addedTexts.add(m.target);
        if (m.type === 'attributes') addedElements.add(m.target);
        for (const n of m.addedNodes) {
          if (n.nodeType === 1 && !n.matches(ownUI)) addedElements.add(n);
          else if (n.nodeType === 3 && n.nodeValue?.trim()) addedTexts.add(n);
        }
      }

      // Real removals still matter, but extension UI updates must never pulse themselves.
      if (!relevant.length) return;
      const event = { mutations: relevant, addedElements: [...addedElements], addedTexts: [...addedTexts] };
      this.callbacks.forEach(cb => {
        try {
          cb(event);
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
