// Small shared registry used by content scripts and the settings popup.
(() => {
  'use strict';
  // Firefox gives content scripts a globalThis distinct from their window.
  // Share the same window namespace used by every feature module.
  const A = (window.AuroraExt = window.AuroraExt || {});
  const chatgptOnly = new Set([
    'legacyComposer', 'voiceColor', 'cuteVoiceUI', 'hideGpt5Limit',
  ]);
  const sites = [
    { id: 'chatgpt', name: 'ChatGPT', host: 'chatgpt.com' },
    { id: 'claude', name: 'Claude', host: 'claude.ai' },
    { id: 'gemini', name: 'Gemini', host: 'gemini.google.com' },
    { id: 'grok', name: 'Grok', host: 'grok.com' },
  ];
  A.sites = {
    all: sites,
    fromUrl(url) {
      try { return sites.find(site => site.host === new URL(url).hostname) || null; }
      catch { return null; }
    },
    supports(site, setting) { return site?.id === 'chatgpt' || !chatgptOnly.has(setting); },
    readTheme() {
      const root = document.documentElement;
      const mode = root.getAttribute('data-mode') || root.getAttribute('data-theme') || root.getAttribute('data-appearance-theme');
      if (mode === 'light' || mode === 'dark') return mode;
      for (const node of [root, document.body]) {
        if (node?.matches('.dark, .dark-mode, .dark-theme')) return 'dark';
        if (node?.matches('.light, .light-mode, .light-theme')) return 'light';
      }
      return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
  };
  A.site = A.sites.fromUrl(location.href);
  A.isActive = () => A.isEnabled?.() && !!A.site?.isSupportedRoute(location.pathname);
})();
