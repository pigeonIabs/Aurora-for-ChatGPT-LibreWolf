// Shared surface tagging for lightweight website adapters.
// The orchestrator supplies added subtrees, so streaming text needs no full-page scan.
(() => {
  'use strict';
  const A = window.AuroraExt;
  const selectors = A.site?.selectors || {};
  const ownUI = '#cgpt-ambient-bg, #cgpt-qs-panel, #cgpt-qs-btn';
  const surfaceRoles = ['composer', 'sidebar', 'menu', 'message'];

  function each(root, selector, apply) {
    if (!selector || !root?.querySelectorAll) return;
    if (root.matches?.(selector)) apply(root);
    root.querySelectorAll(selector).forEach(apply);
  }

  function flattenParents(node) {
    for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      if (parent.hasAttribute('data-aurora-surface')) break;
      parent.setAttribute('data-aurora-plane', '');
    }
  }

  function tagSurface(node, role) {
    if (node.closest(ownUI)) return;
    // One backdrop per surface avoids stacking filters on nested wrappers.
    const parentSurface = node.parentElement?.closest('[data-aurora-surface]');
    if (parentSurface?.getAttribute('data-aurora-surface') === role) return;
    if (node.getAttribute('data-aurora-surface') === role) return;
    node.setAttribute('data-aurora-surface', role);
    node.removeAttribute('data-aurora-plane');
    node.querySelectorAll(`[data-aurora-surface="${role}"]`).forEach(child => child.removeAttribute('data-aurora-surface'));
    if (role === 'composer' || role === 'sidebar') flattenParents(node);
  }

  function tagFast(root = document) {
    if (!A.isEnabled() || !A.site.isSupportedRoute(location.pathname)) return;
    if (root.closest?.(ownUI)) return;
    for (const role of surfaceRoles) each(root, selectors[role], node => tagSurface(node, role));
    each(root, selectors.editor, editor => {
      if (editor.closest(ownUI)) return;
      const composer = editor.closest(selectors.composer) || editor.parentElement;
      if (composer) tagSurface(composer, 'composer');
    });
    for (const role of ['history', 'avatar', 'plane']) {
      each(root, selectors[role], node => {
        if (!node.closest(ownUI) && !node.hasAttribute('data-aurora-surface')) node.setAttribute(`data-aurora-${role}`, '');
      });
    }
  }

  A.glass = {
    tagFast,
    tagAll: tagFast,
    untag() {
      const attrs = ['data-aurora-surface', 'data-aurora-plane', 'data-aurora-history', 'data-aurora-avatar'];
      document.querySelectorAll(attrs.map(attr => `[${attr}]`).join(',')).forEach(node => {
        attrs.forEach(attr => node.removeAttribute(attr));
      });
    },
  };
})();
