// Semantic fallbacks accommodate Claude's older and current app shells.
(() => {
  'use strict';
  const A = window.AuroraExt;
  Object.assign(A.site, {
    appRoot: '#root, #__next',
    isSupportedRoute: path => /^\/(?:new|chat|project|projects)(?:\/|$)/.test(path) || path === '/',
    isNewConversation: path => path === '/' || path === '/new' || /^\/project\/[^/]+\/?$/.test(path),
    workflow: {
      editor: '[data-testid="chat-input"] [contenteditable="true"], .ProseMirror[contenteditable="true"]',
      composer: '[data-testid="composer"], [data-composer], fieldset, form',
      send: 'button[aria-label="Send message"], button[data-testid="send-button"], button[type="submit"]',
      stop: 'button[aria-label="Stop response"], button[aria-label="Stop generating"], button[data-testid="stop-button"]',
      userMessage: '[data-testid="user-message"], [data-message-author-role="user"]',
      modelTrigger: '[data-testid="model-selector-dropdown"], button[data-testid="model-selector"], button[aria-label*="model" i][aria-haspopup]',
      modelOption: '[role="menuitemradio"], [role="option"], [role="menuitem"]',
      modelLabel: '[data-testid="model-name"], .truncate',
    },
    selectors: {
      composer: '[data-testid="chat-input"], [data-testid="composer"], [data-composer], fieldset:has([contenteditable="true"]), form:has(.ProseMirror)',
      editor: '.ProseMirror[contenteditable="true"], [contenteditable="true"][role="textbox"]',
      sidebar: 'nav[aria-label], aside, [data-testid="sidebar"], [data-testid="desktop-sidebar"]',
      menu: '[role="menu"], [role="listbox"], [role="dialog"], [data-radix-popper-content-wrapper] > div',
      message: '[data-testid="user-message"], [data-message-author-role="user"]',
      history: 'a[href^="/chat/"]',
      avatar: '[data-testid="user-menu-button"] img, [data-testid="user-menu"] img, button[aria-label*="account" i] img',
      plane: 'main, #root, #__next',
      toolbar: 'header, [data-testid="chat-header"]',
      content: '[data-testid="conversation"] > div, [data-testid="chat-messages"], main .mx-auto[class*="max-w-"]',
      code: 'pre, [data-testid="code-block"], .code-block',
      upgrade: '[data-testid="upgrade-button"], a[href="/upgrade"], a[href="/settings/billing"]',
    },
  });
})();
