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

    ...(A.site?.config || {}),
  };
})();

