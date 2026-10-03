// Current CDS components with semantic fallbacks for older Claude layouts.
(() => {
  'use strict';
  const A = window.AuroraExt;
  Object.assign(A.site, {
    appRoot: '#root, #__next',
    isSupportedRoute: path => /^\/(?:new|chat|project|projects)(?:\/|$)/.test(path) || path === '/',
    isNewConversation: path => path === '/' || path === '/new' || /^\/project\/[^/]+\/?$/.test(path),
    // The message test ID belongs to its text. Its enclosing native fill owns
    // the bubble's padding and corners, including on incrementally added text.
    surfaceTargets: {
      message: '.bg-bg-user-message, .bg-user-message, .bg-bg-300, [data-cds="UserMessage"]',
    },
    workflow: {
      editor: '[data-testid="chat-input"][contenteditable="true"], [data-testid="chat-input"] [contenteditable="true"], .ProseMirror[contenteditable="true"]',
      composer: '[data-cds="ChatComposer"], [data-testid="composer"], [data-composer], fieldset, form',
      send: 'button[data-testid="chat-input-send"], button[aria-label="Send message"], button[data-testid="send-button"], button[type="submit"]',
      stop: 'button[data-testid="chat-input-stop"], button[aria-label="Stop response"], button[aria-label="Stop generating"], button[data-testid="stop-button"]',
      userMessage: '[data-testid="user-message"], [data-message-author-role="user"]',
      modelTrigger: 'button[data-cds="ModelSelector"], [data-testid="model-selector-dropdown"], button[data-testid="model-selector"], button[aria-label*="model" i][aria-haspopup]',
      modelOption: '[role="menuitemradio"], [role="option"], [role="menuitem"]',
      modelLabel: '[data-testid="model-name"], .truncate',
    },
    selectors: {
      composer: '[data-cds="ChatComposer"] > .rounded-composer, :is([data-testid="chat-input"]:not([contenteditable]), [data-testid="composer"], [data-composer], fieldset:has([contenteditable="true"]), form:has(.ProseMirror)):not(:has([data-cds="ChatComposer"]))',
      editor: '.ProseMirror[contenteditable="true"], [contenteditable="true"][role="textbox"]',
      sidebar: 'nav[aria-label], aside, [data-testid="sidebar"], [data-testid="desktop-sidebar"]',
      menu: '[role="menu"], [role="listbox"], [role="dialog"], [data-radix-popper-content-wrapper] > div',
      message: '[data-testid="user-message"], [data-message-author-role="user"]',
      history: ':is(nav[aria-label], aside, [data-testid="sidebar"], [data-testid="desktop-sidebar"]) :is(a[href*="/chat/"], a[href^="/project/"], a[href^="/projects/"], [data-testid="chat-item"], [data-testid="conversation-item"], [data-testid="chat-title"], [data-testid="conversation-title"])',
      avatar: '[data-testid="user-menu-button"] [data-cds="Avatar"], [data-testid="user-menu-button"] img, [data-testid="user-menu"] img, button[aria-label*="account" i] img',
      plane: 'main, #root, #__next',
      toolbar: 'header, [data-testid="chat-header"], main .sticky.top-0',
      content: '[data-testid="conversation"], [data-testid="chat-messages"], main .mx-auto[class*="max-w-"]',
      code: 'pre, [data-testid="code-block"], .code-block',
      upgrade: '[data-testid="upgrade-button"], a[href="/upgrade"]',
      upgradeContainer: '[data-testid="upgrade-banner"], [data-testid="upsell-banner"]',
      rateLimit: '[data-testid="usage-limit-banner"], [data-testid="rate-limit-banner"]',
      notice: '[data-testid="usage-limit-notice"], [data-cds="Toast"], [data-cds="Banner"], [data-testid="chat-input-banner"]',
    },
  });
})();
