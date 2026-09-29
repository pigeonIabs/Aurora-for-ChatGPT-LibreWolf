// Semantic fallbacks accommodate Claude's older and current app shells.
(() => {
  'use strict';
  const A = window.AuroraExt;
  Object.assign(A.site, {
    appRoot: '#root, #__next',
    isSupportedRoute: path => /^\/(?:new|chat|project|projects)(?:\/|$)/.test(path) || path === '/',
    selectors: {
      composer: '[data-testid="chat-input"], [data-testid="composer"], [data-composer], fieldset:has([contenteditable="true"]), form:has(.ProseMirror)',
      editor: '.ProseMirror[contenteditable="true"], [contenteditable="true"][role="textbox"]',
      sidebar: 'nav[aria-label], aside, [data-testid="sidebar"], [data-testid="desktop-sidebar"]',
      menu: '[role="menu"], [role="listbox"], [role="dialog"], [data-radix-popper-content-wrapper] > div',
      message: '[data-testid="user-message"], [data-message-author-role="user"]',
      history: 'a[href^="/chat/"]',
      avatar: '[data-testid="user-menu-button"] img, [data-testid="user-menu"] img, button[aria-label*="account" i] img',
      plane: 'main, #root, #__next',
    },
  });
})();
