// Gemini uses stable custom element names rather than generated Angular classes.
(() => {
  'use strict';
  const A = window.AuroraExt;
  Object.assign(A.site, {
    appRoot: 'chat-app-orchestrator, #app-root',
    isSupportedRoute: path => path === '/' || /^\/(?:app|gem|gems)(?:\/|$)/.test(path),
    isNewConversation: path => path === '/' || path === '/app' || /^\/gem\/[^/]+\/?$/.test(path),
    workflow: {
      editor: 'rich-textarea .ql-editor[contenteditable="true"]',
      composer: 'input-container, input-area-v2',
      send: 'button[data-test-id="send-button"], button.send-button, button[aria-label="Send message"]',
      stop: 'button[data-test-id="stop-button"], button.stop-button, button[aria-label="Stop response"]',
      userMessage: 'user-query',
      modelTrigger: '[data-test-id="bard-mode-menu-button"] button, button[data-test-id="bard-mode-menu-button"], bard-mode-switcher button[aria-label*="mode picker"]',
      modelOption: '[role="menuitemradio"], [role="option"], [role="menuitem"]',
      modelLabel: '.mode-title, .model-name, [data-test-id="mode-name"], .mdc-list-item__primary-text',
      currentLabel: button => button.querySelector('.conversation-title')?.textContent || button.getAttribute('aria-label')?.match(/currently\s+(.+)$/i)?.[1] || button.textContent,
    },
    selectors: {
      composer: 'input-area-v2 .text-input-field',
      editor: 'rich-textarea .ql-editor[contenteditable="true"]',
      sidebar: 'bard-sidenav, mat-sidenav',
      menu: '[role="menu"], [role="listbox"], .mat-mdc-dialog-surface, gem-popover [role="dialog"]',
      message: 'user-query .user-query-bubble-with-background, user-query .user-query-bubble-container',
      history: 'bard-sidenav a[href^="/app/"], bard-sidenav [data-test-id="conversation"], bard-sidenav .conversation-title',
      avatar: 'user-profile-picture img, sidenav-mavatar-footer img, a[aria-label*="Google Account"] img',
      plane: 'chat-window, chat-window-content, infinite-scroller.chat-history, top-bar-actions, side-navigation-content',
      content: '.conversation-container, .conversation-content, .chat-history-scroll-container, .conversation-turn, user-query, model-response',
      code: 'code-block, pre',
      toolbar: 'top-bar-actions',
      upgrade: 'a[href*="one.google.com/ai"], [data-test-id="upgrade-button"], upsell-button button',
    },
  });
})();
