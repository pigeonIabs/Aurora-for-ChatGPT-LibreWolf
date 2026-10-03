// modules/aurora/utils.js
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.utils = A.utils || {};

  A.utils.getCachedElement = A.utils.getCachedElement || ((key, queryFn) => {
    const cache = A.cache?.ui;
    if (cache && cache[key] && cache[key].isConnected) return cache[key];
    const element = queryFn();
    if (element && cache) cache[key] = element;
    return element;
  });

  A.utils.debounce = A.utils.debounce || ((func, wait) => {
    let timeout;
    const debounced = function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => { timeout = null; func(...args); }, wait);
    };
    debounced.cancel = () => { clearTimeout(timeout); timeout = null; };
    return debounced;
  });

  A.utils.setAttribute = (node, name, value) => {
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  };

  A.utils.setStyle = (node, name, value) => {
    if (node.style.getPropertyValue(name) !== value) node.style.setProperty(name, value);
  };

  A.utils.toggleClass = (node, name, enabled) => {
    if (node.classList.contains(name) !== !!enabled) node.classList.toggle(name, !!enabled);
  };

  A.utils.toggleAttribute = (node, name, enabled) => {
    if (node.hasAttribute(name) !== !!enabled) node.toggleAttribute(name, !!enabled);
  };

  A.utils.matchingElements = (root, selector) => {
    if (!selector || !root?.querySelectorAll) return [];
    const nodes = [...root.querySelectorAll(selector)];
    if (root.matches?.(selector)) nodes.unshift(root);
    return nodes;
  };

  // Keep only changed branches. Walking ancestors avoids pairwise contains()
  // checks when the host mounts hundreds of nodes in one render.
  A.utils.minimalRoots = nodes => {
    const connected = new Set([...nodes].filter(node => node.isConnected));
    return [...connected].filter(node => {
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        if (connected.has(parent)) return false;
      }
      return true;
    });
  };

  A.utils.toggleClassForElements = A.utils.toggleClassForElements || ((elements, className, force) => {
    elements.forEach((el) => {
      if (el) el.classList.toggle(className, force);
    });
  });

  A.utils.safeRequestIdleCallback =
    A.utils.safeRequestIdleCallback ||
    ((callback, options) => {
      return window.requestIdleCallback ? window.requestIdleCallback(callback, options) : setTimeout(callback, 16);
    });
  A.utils.cancelIdleCallback = handle => {
    if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
    else clearTimeout(handle);
  };

  A.utils.normalizeToken =
    A.utils.normalizeToken ||
    ((value) => (value || '').toLowerCase().replace(/\s+/g, ' ').trim());

})();
