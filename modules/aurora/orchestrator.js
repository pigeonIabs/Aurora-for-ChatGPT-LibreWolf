// modules/aurora/orchestrator.js
// Coordinates feature modules; keeps heavy logic outside of content.js.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});

  const cfg = A.config || {};
  const ID = cfg.ID || 'cgpt-ambient-bg';
  const LOCAL_BG_KEY = cfg.LOCAL_BG_KEY || 'customBgData';
  const SELECTORS = cfg.SELECTORS || {};

  const debounce = A.utils?.debounce || ((fn) => fn);

  const isEnabled = () => (A.isEnabled ? A.isEnabled() : true);
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  class AuroraBackgroundController {
    ensure() {
      A.background?.show?.();
    }
    applyStyles() {
      A.background?.applyStyles?.();
    }
    update() {
      A.background?.update?.();
    }
  }

  class AuroraQuickSettingsController {
    ensure() {
      A.quickSettings?.ensure?.();
    }
    remove() {
      A.quickSettings?.remove?.();
    }
  }

  class AuroraRootFlagsController {
    apply() {
      A.rootFlags?.apply?.();
    }
  }

  class AuroraUpgradeController {
    applyLimitPopup() {
      A.upgrade?.applyLimitPopup?.();
    }
    applyUpgradeButtons() {
      A.upgrade?.applyUpgradeButtons?.();
    }
  }

  class AuroraGlassController {
    tagFast(root = document) {
      A.glass?.tagFast?.(root);
    }
    tagAll(root = document) {
      A.glass?.tagAll?.(root);
    }
    scheduleFullScan() {
      A.glass?.scheduleFullScan?.();
    }
    hasSlowHints(node) {
      return !!A.glass?.hasSlowHints?.(node);
    }
    tagAncestorsForSlowHints(root) {
      A.glass?.tagAncestorsForSlowHints?.(root);
    }
  }

  class AuroraDefaultModelController {
    maybeApply(force = false) {
      A.defaultModel?.maybeApply?.(force);
    }
  }

  class AuroraAudioController {
    ensureContext() {
      const s = getSettings();
      if (s.soundEnabled) A.audio?.ensureContext?.();
    }
    attachOrDetach() {
      const s = getSettings();
      if (s.soundEnabled) A.audio?.attachIfEnabled?.();
      else A.audio?.detach?.();
    }
  }

  class AuroraContrastController {
    apply() {
      const s = getSettings();
      if (!s.autoContrast) {
        document.documentElement.style.removeProperty('--bg-opacity');
        return;
      }

      const bgNode = document.getElementById(ID);
      if (!bgNode) return;
      const activeImg = bgNode.querySelector('.media-layer.active img');
      if (activeImg && activeImg.complete) {
        A.contrast?.engine?.analyze?.(activeImg);
      }
    }
  }

  class AuroraDataMaskingController {
    applyInitial() {
      A.masking?.applyInitial?.();
    }
  }

  class AuroraMessageQueueController {
    pulse() {
      A.queue?.pulse?.();
    }
    schedulePulse(delay = 0) {
      A.queue?.schedulePulse?.(delay);
    }
    shutdown() {
      A.queue?.shutdown?.();
    }
    isEnabled() {
      return !!A.queue?.isEnabled?.();
    }
    hasWork() {
      return !!A.queue?.hasWork?.();
    }
  }

  class AuroraOrchestrator {
    constructor() {
      this.observersStarted = false;
      this.welcomeScreenChecked = false;
      this.settingsRequestRevision = 0;

      this.background = new AuroraBackgroundController();
      this.quickSettings = new AuroraQuickSettingsController();
      this.rootFlags = new AuroraRootFlagsController();
      this.upgrade = new AuroraUpgradeController();
      this.glass = new AuroraGlassController();
      this.defaultModel = new AuroraDefaultModelController();
      this.audio = new AuroraAudioController();
      this.contrast = new AuroraContrastController();
      this.dataMasking = new AuroraDataMaskingController();
      this.queue = new AuroraMessageQueueController();
    }

    init() {
      const extensionApi = globalThis.chrome;
      if (!extensionApi?.runtime?.sendMessage && !extensionApi?.storage?.sync?.get) return false;

      // Initialize i18n system with ChatGPT language detection (optional).
      (async () => {
        try {
          await A.i18n?.initialize?.();
        } catch (e) {
          // ignore
        }
      })();

      const initialLoad = () => {
        this.refreshSettingsAndApply();
        this.startObservers();
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialLoad, { once: true });
      } else {
        initialLoad();
      }

      try {
        extensionApi.storage?.onChanged?.addListener((changes, area) => this.onStorageChanged(changes, area));
      } catch (e) {
        // Content features can still start when storage events are unavailable.
      }
      return true;
    }

    refreshSettingsAndApply() {
      const extensionApi = globalThis.chrome;
      const revision = ++this.settingsRequestRevision;

      const applyFreshSettings = (freshSettings) => {
        if (revision !== this.settingsRequestRevision || !freshSettings) return;

        // Welcome screen once per session.
        if (!this.welcomeScreenChecked) {
          if (freshSettings.extensionEnabled !== false && !freshSettings.hasSeenWelcomeScreen) {
            try {
              A.welcome?.show?.(() => this.applyAllSettings());
            } catch (e) {
              // ignore
            }
          }
          this.welcomeScreenChecked = true;
        }

        // Keep a stable settings object reference.
        A.state = A.state || {};
        A.state.settings = A.state.settings || {};
        Object.assign(A.state.settings, freshSettings);

        this.applyAllSettings();
      };

      const readStorageFallback = () => {
        try {
          extensionApi?.storage?.sync?.get?.(null, (storedSettings) => {
            if (extensionApi?.runtime?.lastError || !storedSettings) return;
            applyFreshSettings({
              ...storedSettings,
              extensionEnabled: storedSettings.extensionEnabled !== false,
            });
          });
        } catch (e) {
          // Keep the page usable if the extension context has been invalidated.
        }
      };

      if (!extensionApi?.runtime?.sendMessage) {
        readStorageFallback();
        return;
      }

      try {
        extensionApi.runtime.sendMessage({ type: 'GET_SETTINGS' }, (freshSettings) => {
          if (extensionApi.runtime.lastError || !freshSettings) {
            readStorageFallback();
            return;
          }
          applyFreshSettings(freshSettings);
        });
      } catch (e) {
        readStorageFallback();
      }
    }

    applyAllSettings() {
      if (!this.isSupportedRoute()) {
        this.queue.shutdown();
        A.disable?.all?.();
        return;
      }

      if (!isEnabled()) {
        this.queue.shutdown();
        A.disable?.all?.();
        return;
      }

      this.background.ensure();

      const s = getSettings();
      if (!s.hideQuickSettings) this.quickSettings.ensure();
      else this.quickSettings.remove();

      this.rootFlags.apply();
      this.background.applyStyles();
      this.background.update();

      this.upgrade.applyLimitPopup();
      this.upgrade.applyUpgradeButtons();

      this.glass.tagFast(document);
      this.glass.scheduleFullScan();

      this.defaultModel.maybeApply();

      // Optional engines.
      this.audio.ensureContext();
      this.audio.attachOrDetach();
      this.contrast.apply();
      this.dataMasking.applyInitial();

      this.queue.pulse();
    }

    isSupportedRoute() {
      const path = window.location.pathname.replace(/\/+$/, '') || '/';
      return path !== '/codex';
    }

    startObservers() {
      if (this.observersStarted) return;
      this.observersStarted = true;

      // Pause animations and video when tab is not visible.
      document.addEventListener(
        'visibilitychange',
        () => {
          if (!isEnabled()) {
            document.documentElement.classList.remove('cgpt-tab-hidden');
            return;
          }

          const bgNode = document.getElementById(ID);
          document.documentElement.classList.toggle('cgpt-tab-hidden', document.hidden);
          if (!bgNode) return;

          const videos = bgNode.querySelectorAll('video');
          videos.forEach((video) => {
            if (document.hidden) {
              video.pause();
            } else if (video.style.display !== 'none') {
              video.play().catch(() => {});
            }
          });
        },
        { passive: true }
      );

      window.addEventListener('focus', () => this.applyAllSettings(), { passive: true });

      let lastUrl = location.href;
      const checkUrl = debounce(() => {
        if (location.href === lastUrl) return;
        lastUrl = location.href;
        if (this.isSupportedRoute()) this.refreshSettingsAndApply();
        else this.applyAllSettings();
      }, 50);

      window.addEventListener('popstate', checkUrl, { passive: true });

      const originalPushState = history.pushState;
      history.pushState = function (...args) {
        originalPushState.apply(this, args);
        setTimeout(checkUrl, 0);
      };

      const originalReplaceState = history.replaceState;
      history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        setTimeout(checkUrl, 0);
      };

      // Debounce less-critical UI checks that don't cause flicker.
      const debouncedOtherChecks = debounce(() => {
        this.upgrade.applyLimitPopup();
        this.defaultModel.maybeApply();
        this.upgrade.applyUpgradeButtons();
      }, 150);

      let renderFrameId = null;
      const pendingNodes = new Set();
      this.domObserverCallback = ({ addedElements }) => {
        checkUrl();
        if (document.hidden || !isEnabled() || !this.isSupportedRoute()) return;
        for (const node of addedElements || []) {
          if (node.isConnected) pendingNodes.add(node);
        }
        if (renderFrameId) return;
        renderFrameId = requestAnimationFrame(() => {
          renderFrameId = null;
          const nodes = [...pendingNodes];
          pendingNodes.clear();
          if (!isEnabled()) return;
          // The app hydrates after DOMContentLoaded and can replace body nodes.
          if (!document.getElementById(ID)) this.background.ensure();
          if (!document.documentElement.classList.contains(cfg.HTML_CLASS || 'cgpt-ambient-on') ||
              !document.documentElement.style.getPropertyValue('--aurora-glass-fill-opacity')) {
            this.rootFlags.apply();
          }
          for (const node of nodes) {
            if (!node.isConnected || nodes.some(parent => parent !== node && parent.contains(node))) continue;
            this.glass.tagFast(node);
            if (this.glass.hasSlowHints(node)) this.glass.tagAncestorsForSlowHints(node);
          }
          if (this.queue.isEnabled() || this.queue.hasWork()) this.queue.schedulePulse(0);
          debouncedOtherChecks();
        });
      };

      if (window.AuroraExt?.centralObserver) {
          window.AuroraExt.centralObserver.subscribe(this.domObserverCallback);
      }

      const hostTheme = () => document.documentElement.classList.contains('light') || document.documentElement.classList.contains('light-mode');
      let lastHostLight = hostTheme();
      const themeObserver = new MutationObserver(() => {
        if (!isEnabled() || !this.isSupportedRoute()) return;
        const s = getSettings();
        const root = document.documentElement;
        const hostLight = hostTheme();
        const changed = hostLight !== lastHostLight;
        lastHostLight = hostLight;
        if (!root.classList.contains(cfg.HTML_CLASS || 'cgpt-ambient-on') ||
            !root.style.getPropertyValue('--aurora-glass-fill-opacity') ||
            (s.theme === 'auto' && changed)) this.rootFlags.apply();
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    }

    onStorageChanged(changes, area) {
      if (area === 'sync') {
        const changedKeys = Object.keys(changes);
        const settings = getSettings();

        changedKeys.forEach((key) => {
          if (changes[key]) settings[key] = changes[key].newValue;
        });

        if (changedKeys.includes('extensionEnabled')) {
          this.settingsRequestRevision += 1;
          this.queue.shutdown();
          if (!isEnabled()) {
            A.disable?.all?.();
            return;
          }
          // Re-hydrate authoritative state from background cache (includes defaults).
          this.refreshSettingsAndApply();
          return;
        }

        if (!isEnabled()) return;

        if (changes.queueWhileGenerating) this.queue.schedulePulse(0);

        const rootFlagKeys = [
          'legacyComposer',
          'disableAnimations',
          'focusMode',
          'cuteVoiceUI',
          'blurChatHistory',
          'blurAvatar',
          'theme',
          'customFont',
          'voiceColor',
          'appearance',
          'glassIntensity',
          'backgroundBlur',
          'cinemaMode',
          'glassUserMessages',
        ];
        if (changedKeys.some((k) => rootFlagKeys.includes(k))) {
          this.rootFlags.apply();
        }

        if (changes.customBgUrl || changes.backgroundBlur || changes.backgroundScaling) {
          this.background.update();
          this.background.applyStyles();
        }

        if (changes.hideGpt5Limit) this.upgrade.applyLimitPopup();
        if (changes.hideUpgradeButtons) this.upgrade.applyUpgradeButtons();

        if (changes.hideQuickSettings !== undefined) {
          if (!settings.hideQuickSettings) this.quickSettings.ensure();
          else this.quickSettings.remove();
        }

        if (changes.defaultModel) this.defaultModel.maybeApply();

        if (changes.soundEnabled || changes.soundVolume) {
          this.audio.ensureContext();
          this.audio.attachOrDetach();
        }
      } else if (area === 'local' && changes[LOCAL_BG_KEY]) {
        if (isEnabled()) this.background.update();
      }
    }
  }

  A.orchestrator = A.orchestrator || {};
  A.orchestrator.AuroraOrchestrator = A.orchestrator.AuroraOrchestrator || AuroraOrchestrator;
})();

