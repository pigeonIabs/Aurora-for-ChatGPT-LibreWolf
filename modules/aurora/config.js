// modules/aurora/config.js
// Constants/config shared by Aurora modules.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});

  function runtimeUrl(path) {
    try {
      if (chrome?.runtime?.getURL) return chrome.runtime.getURL(path);
    } catch (e) {
      // ignore
    }
    return path;
  }

  A.config = A.config || {
    // DOM IDs
    ID: 'cgpt-ambient-bg',
    STYLE_ID: 'cgpt-ambient-styles',
    QS_BUTTON_ID: 'cgpt-qs-btn',
    QS_PANEL_ID: 'cgpt-qs-panel',

    // <html> classes
    HTML_CLASS: 'cgpt-ambient-on',
    LEGACY_CLASS: 'cgpt-legacy-composer',
    LIGHT_CLASS: 'cgpt-light-mode',
    ANIMATIONS_DISABLED_CLASS: 'cgpt-animations-disabled',
    CLEAR_APPEARANCE_CLASS: 'cgpt-appearance-clear',

    // Storage / misc
    LOCAL_BG_KEY: 'customBgData',
    HIDE_LIMIT_CLASS: 'cgpt-hide-gpt5-limit',
    HIDE_UPGRADE_CLASS: 'cgpt-hide-upgrade',
    TIMESTAMP_KEY: 'gpt5LimitHitTimestamp',
    FIVE_MINUTES_MS: 5 * 60 * 1000,

    // Preset URLs / assets
    BLUE_WALLPAPER_URL:
      'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80',
    GROK_HORIZON_URL: runtimeUrl('assets/grok-4.webp'),

    // Selectors
    SELECTORS: {
      APP_ROOT: '#root',
      APP_SIDEBAR: '#app-shell-sidebar',
      CHATGPT_COMPOSER_FORM: 'form[data-chatgpt-composer]',
      CHATGPT_COMPOSER_EDITOR: 'form[data-chatgpt-composer] [contenteditable="true"][data-composer-markdown]',
      CODEX_COMPOSER_EDITOR: '#prompt-textarea[contenteditable="true"]',
      MODEL_SWITCHER_BUTTON: 'button[data-codex-intelligence-trigger="true"]',
      LEGACY_MODEL_SWITCHER_BUTTON: '[data-testid="model-switcher-dropdown-button"]',
      GPT5_LIMIT_POPUP: 'div[class*="text-token-text-primary"]',
      UPGRADE_MENU_ITEM: 'a.__menu-item',
      UPGRADE_TOP_BUTTON_CONTAINER: '.start-1\\/2.absolute',
      UPGRADE_PROFILE_BUTTON_TRAILING_ICON: '[data-testid="accounts-profile-button"] .__menu-item-trailing-btn',
      UPGRADE_SIDEBAR_BUTTON: 'div.gap-1\\.5.__menu-item.group',
      UPGRADE_TINY_SIDEBAR_ICON: '#stage-sidebar-tiny-bar > div:nth-of-type(4)',
      UPGRADE_SETTINGS_ROW_CONTAINER: 'div.py-2.border-b',
      UPGRADE_BOTTOM_BANNER: 'div[role="button"]',
      PROFILE_BUTTON: 'button[aria-label="Open profile menu"]',
    },

    // Default model selection hints (robust to UI text variations)
    MODEL_LABEL_HINTS: {
      'gpt-5.5-instant': ['gpt-5.5 instant', 'instant'],
      'gpt-5.6-sol-medium': ['gpt-5.6 sol medium', 'medium'],
      'gpt-5.6-sol-high': ['gpt-5.6 sol high', 'high'],
    },
  };
})();

