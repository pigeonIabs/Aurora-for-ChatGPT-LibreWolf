// Gemini uses stable custom element names rather than generated Angular classes.
(() => {
  'use strict';
  const A = window.AuroraExt;
  Object.assign(A.site, {
    appRoot: 'chat-app-orchestrator, #app-root',
    isSupportedRoute: path => path === '/' || /^\/(?:app|gem|gems)(?:\/|$)/.test(path),
    selectors: {
      composer: 'input-area-v2 .text-input-field',
      editor: 'rich-textarea .ql-editor[contenteditable="true"]',
      sidebar: 'bard-sidenav, mat-sidenav',
      menu: '[role="menu"], [role="listbox"], .mat-mdc-dialog-surface, gem-popover [role="dialog"]',
      message: 'user-query .user-query-bubble-container, user-query .query-text',
      history: 'bard-sidenav a[href^="/app/"], bard-sidenav [data-test-id="conversation"], .conversation-title',
      avatar: 'user-profile-picture img, sidenav-mavatar-footer img, a[aria-label*="Google Account"] img',
      plane: 'chat-window, chat-window-content, infinite-scroller.chat-history, top-bar-actions, side-navigation-content',
    },
  });
})();
