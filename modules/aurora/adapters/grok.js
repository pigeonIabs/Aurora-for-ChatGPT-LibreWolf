(() => {
  'use strict';
  const A = window.AuroraExt;
  Object.assign(A.site, {
    appRoot: '#grok-app-root, #__next',
    isSupportedRoute: path => path === '/' || /^\/(?:c|chat|project|projects|imagine)(?:\/|$)/.test(path),
    isNewConversation: path => path === '/',
    workflow: {
      editor: '.query-bar textarea, .query-bar [contenteditable="true"]',
      composer: 'form:has(.query-bar)',
      send: 'button[data-testid="chat-submit"], button[type="submit"][aria-label="Submit"]',
      stop: 'button[data-testid="chat-stop"], button[aria-label="Stop generating"], button[aria-label="Stop response"], button[aria-label="Stop"]',
      userMessage: '[data-message-author-role="user"], .message-bubble.bg-surface-l1, [data-testid="user-message"]',
      modelTrigger: '#model-select-trigger',
      modelOption: '[role="menuitemradio"]',
      modelLabel: '.truncate',
    },
    selectors: {
      composer: '.query-bar',
      editor: '.query-bar textarea, .query-bar [contenteditable="true"]',
      sidebar: 'aside, nav[aria-label], [data-testid="sidebar"], [data-sidebar="sidebar"]',
      menu: '[role="menu"], [role="listbox"], [role="dialog"], [role="tooltip"]',
      message: '[data-message-author-role="user"], .message-bubble.bg-surface-l1, [data-testid="user-message"]',
      history: 'a[href^="/c/"], a[href^="/chat/"]',
      avatar: '[data-testid="user-avatar"] img, button[aria-label*="account" i] img, [data-testid="user-menu"] img',
      plane: '#grok-app-root, #grok-content-area, [class~="@container/nav"] [aria-hidden="true"]',
      toolbar: '[class~="@container/nav"]',
      content: '.message-row, .message-content, #grok-content-area .mx-auto[class*="max-w-"]',
      code: 'pre, .code-block',
      upgrade: 'a[href="/plans"], a[href="/subscribe"], [data-testid="upgrade-button"]',
    },
  });
})();
