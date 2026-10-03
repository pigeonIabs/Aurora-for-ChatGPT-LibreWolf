// modules/aurora/orchestrator.js
// Coordinates feature modules; keeps heavy logic outside of content.js.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});

  const cfg = A.config || {};
  const ID = cfg.ID || 'cgpt-ambient-bg';
  const LOCAL_BG_KEY = cfg.LOCAL_BG_KEY || 'customBgData';

  const debounce = A.utils?.debounce || ((fn) => fn);

  const isEnabled = () => (A.isEnabled ? A.isEnabled() : true);
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  class AuroraOrchestrator {
    constructor() {
      this.observersStarted = false;
      this.settingsLoaded = false;
      this.welcomeScreenChecked = false;
      this.settingsRequestRevision = 0;
      this.settingsReadPending = false;
      this.pendingSettings = {};

      this.appliedBody = null;
      this.renderFrameId = null;
      this.pendingNodes = new Set();
      this.needsResumeScan = false;

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

      // Fetch preferences while the host parses. Root material can be applied
      // immediately, and body-dependent features reconcile as soon as it mounts.
      this.startObservers();
      A.centralObserver?.start?.();
      this.refreshSettingsAndApply();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.reconcile(), { once: true });
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
      this.settingsReadPending = true;

      const applyFreshSettings = (freshSettings) => {
        if (revision !== this.settingsRequestRevision || !freshSettings) return;

        // Keep a stable settings object reference.
        A.state = A.state || {};
        A.state.settings = A.state.settings || {};
        Object.assign(A.state.settings, A.preferences.normalize({ ...freshSettings, ...this.pendingSettings }));
        this.pendingSettings = {};
        this.settingsReadPending = false;
        this.settingsLoaded = true;

        this.applyAllSettings();
      };

      const readStorageFallback = () => {
        try {
          extensionApi?.storage?.sync?.get?.(A.preferences.defaults, (storedSettings) => {
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
      if (!this.settingsLoaded) return;
      if (!this.isSupportedRoute() || !isEnabled()) {
        this.suspend();
        return;
      }

      A.rootFlags?.apply?.();
      if (!document.body) return;
      this.clearPendingRender();
      this.appliedBody = document.body;
      this.ensureOwnedUI();

      const s = getSettings();
      if (s.hideQuickSettings) A.quickSettings?.remove?.();
      A.background?.applyStyles?.();
      A.background?.update?.();

      A.interface?.tagElements?.(document);
      A.glass?.tagFast?.(document);
      A.glass?.scheduleFullScan?.();

      A.defaultModel?.maybeApply?.();

      // Optional engines.
      this.applyAudio();
      this.applyContrast();
      A.masking?.applyInitial?.();
      if (!s.hideQuickSettings) A.quickSettings?.ensure?.();

      A.queue?.pulse?.();

      if (!this.welcomeScreenChecked) {
        this.welcomeScreenChecked = true;
        if (!s.hasSeenWelcomeScreen) A.welcome?.show?.(() => this.applyAllSettings());
      }
    }

    applyAudio() {
      if (getSettings().soundEnabled) {
        A.audio?.ensureContext?.();
        A.audio?.attachIfEnabled?.();
      } else A.audio?.detach?.();
    }

    applyContrast() {
      if (!getSettings().autoContrast) {
        document.documentElement.style.removeProperty('--bg-opacity');
        return;
      }
      const image = document.getElementById(ID)?.querySelector('.media-layer.active img');
      if (image?.complete) A.contrast?.engine?.analyze?.(image);
    }

    ensureOwnedUI() {
      if (!document.body) return;
      if (!document.getElementById(ID)) A.background?.show?.();
      else A.background?.ensureAppOnTop?.();
      if (!getSettings().hideQuickSettings && !document.getElementById(cfg.QS_BUTTON_ID || 'cgpt-qs-btn')) {
        A.quickSettings?.ensure?.();
      }
    }

    reconcile() {
      if (!this.settingsLoaded || document.hidden || !isEnabled() || !this.isSupportedRoute()) return;
      if (this.appliedBody !== document.body) {
        this.applyAllSettings();
        return true;
      }
      this.ensureOwnedUI();
      if (!document.documentElement.classList.contains(cfg.HTML_CLASS || 'cgpt-ambient-on') ||
          !document.documentElement.style.getPropertyValue('--aurora-glass-fill-opacity')) A.rootFlags?.apply?.();
    }

    clearPendingRender() {
      if (this.renderFrameId !== null) cancelAnimationFrame(this.renderFrameId);
      this.renderFrameId = null;
      this.pendingNodes.clear();
    }

    suspend() {
      this.clearPendingRender();
      this.otherChecks?.cancel?.();
      this.appliedBody = null;
      A.disable?.all?.();
    }

    resume() {
      if (document.hidden) return;
      const bodyApplied = this.reconcile();
      if (this.needsResumeScan && isEnabled() && this.isSupportedRoute()) {
        this.needsResumeScan = false;
        if (!bodyApplied) {
          A.glass?.tagFast?.(document);
          A.glass?.scheduleFullScan?.();
          A.masking?.applyInitial?.();
          A.interface?.tagElements?.(document);
          if (!getSettings().hideQuickSettings) A.quickSettings?.ensure?.();
          this.applyAudio();
        }
      }
      A.defaultModel?.maybeApply?.();
      A.queue?.schedulePulse?.(0);
    }

    isSupportedRoute() {
      const path = window.location.pathname.replace(/\/+$/, '') || '/';
      return !!A.site?.isSupportedRoute(path);
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
          if (document.hidden) this.needsResumeScan = true;
          else this.resume();
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

      window.addEventListener('focus', () => this.resume(), { passive: true });

      this.lastUrl = location.href;
      const checkUrl = this.checkUrl = debounce(() => {
        if (location.href === this.lastUrl) return;
        this.lastUrl = location.href;
        A.defaultModel?.cancel?.();
        A.queue?.pulse?.();
        this.applyAllSettings();
      }, 50);

      window.addEventListener('popstate', checkUrl, { passive: true });
      window.navigation?.addEventListener('currententrychange', checkUrl);
      window.addEventListener('pageshow', () => this.resume(), { passive: true });
      window.addEventListener('pagehide', () => {
        this.needsResumeScan = true;
        A.queue?.shutdown?.();
        A.defaultModel?.cancel?.();
        A.masking?.stop?.();
      }, { passive: true });

      if (!window.navigation) {
        for (const method of ['pushState', 'replaceState']) {
          const original = history[method];
          history[method] = function (...args) {
            const result = original.apply(this, args);
            checkUrl();
            return result;
          };
        }
      }

      // Debounce less-critical UI checks that don't cause flicker.
      this.otherChecks = debounce(() => {
        A.defaultModel?.maybeApply?.();
      }, 150);

      this.domObserverCallback = event => this.onDOMChanged(event);

      A.centralObserver.subscribe(this.domObserverCallback);

      // Native stylesheets can finish after early material activation. Refresh
      // ownership from that signal and coalesce multiple loads into one frame.
      document.addEventListener('load', event => {
        if (event.target?.tagName !== 'LINK' || event.target.rel !== 'stylesheet') return;
        A.material.invalidate();
        if (document.body) this.domObserverCallback({ addedElements: [document.body] });
      }, true);

      this.observeTheme();
    }

    onDOMChanged({ mutations, addedElements, addedTexts }) {
      if (location.href !== this.lastUrl) this.checkUrl();
      if (!this.settingsLoaded || document.hidden || !isEnabled() || !this.isSupportedRoute()) return;
      for (const node of addedElements || []) {
        if (node.isConnected) this.pendingNodes.add(node);
      }
      for (const text of addedTexts || []) {
        const control = A.upgrade?.changedOwner?.(text.parentElement);
        if (control?.isConnected) this.pendingNodes.add(control);
      }
      // Removed labels and emptied text still need their native owner checked.
      for (const mutation of mutations || []) {
        if (mutation.type === 'characterData' && mutation.target.nodeValue?.trim()) continue;
        if (mutation.type !== 'characterData' &&
            !(mutation.type === 'childList' && mutation.removedNodes.length)) continue;
        const node = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
        const control = A.upgrade?.changedOwner?.(node);
        if (control?.isConnected) this.pendingNodes.add(control);
      }
      if (A.queue?.isEnabled?.() || A.queue?.hasWork?.()) A.queue?.schedulePulse?.(0);
      if (!this.pendingNodes.size && !mutations?.some(mutation => mutation.type === 'childList')) return;
      if (this.renderFrameId !== null) return;
      this.renderFrameId = requestAnimationFrame(() => this.flushDOMChanges());
    }

    flushDOMChanges() {
      this.renderFrameId = null;
      const nodes = A.utils.minimalRoots(this.pendingNodes);
      this.pendingNodes.clear();
      if (document.hidden || !isEnabled() || !this.isSupportedRoute()) return;
      const previousBody = this.appliedBody;
      this.reconcile();
      if (previousBody !== this.appliedBody) return;
      for (const node of nodes) {
        A.glass?.tagFast?.(node);
        A.interface?.tagElements?.(node);
        if (A.glass?.hasSlowHints?.(node)) A.glass?.tagAncestorsForSlowHints?.(node);
      }
      if (nodes.length) this.otherChecks();
      A.quickSettings?.refreshCapabilities?.();
    }

    observeTheme() {
      const hostTheme = () => A.sites.readTheme() === 'light';
      let lastHostLight = hostTheme();
      const themeObserver = new MutationObserver(() => {
        if (!this.settingsLoaded || !isEnabled() || !this.isSupportedRoute()) return;
        const s = getSettings();
        const root = document.documentElement;
        const hostLight = hostTheme();
        const changed = hostLight !== lastHostLight;
        lastHostLight = hostLight;
        if (!root.classList.contains(cfg.HTML_CLASS || 'cgpt-ambient-on') ||
            !root.style.getPropertyValue('--aurora-glass-fill-opacity') ||
            (s.theme === 'auto' && changed)) A.rootFlags?.apply?.();
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-mode', 'data-theme', 'data-appearance-theme'] });
      let observedBody = null;
      const observeBody = () => {
        if (document.body === observedBody) return;
        observedBody = document.body;
        themeObserver.disconnect();
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-mode', 'data-theme', 'data-appearance-theme'] });
        if (observedBody) themeObserver.observe(observedBody, { attributes: true, attributeFilter: ['class'] });
      };
      observeBody();
      A.centralObserver?.subscribe(observeBody);
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (isEnabled() && this.isSupportedRoute()) A.rootFlags?.apply?.();
      });
    }

    onStorageChanged(changes, area) {
      if (area === 'sync') {
        const changedKeys = Object.keys(changes);
        const settings = getSettings();

        changedKeys.forEach((key) => {
          if (!changes[key]) return;
          const value = A.preferences.value(key, changes[key].newValue);
          settings[key] = value;
          if (this.settingsReadPending) this.pendingSettings[key] = value;
        });

        const disabledHere = value => Array.isArray(value) && value.includes(A.site.id);
        const siteEnableChanged = changes.disabledSites &&
          disabledHere(changes.disabledSites.oldValue) !== disabledHere(changes.disabledSites.newValue);
        if (changes.extensionEnabled || siteEnableChanged) {
          this.settingsRequestRevision += 1;
          A.queue?.shutdown?.();
          if (!isEnabled()) {
            this.suspend();
            return;
          }
          // Re-hydrate authoritative state from background cache (includes defaults).
          this.refreshSettingsAndApply();
          return;
        }

        if (!isEnabled() || !this.isSupportedRoute()) return;

        if (changes.queueWhileGenerating) A.queue?.schedulePulse?.(0);

        const rootFlagKeys = [
          'legacyComposer',
          'disableAnimations',
          'focusMode',
          'cuteVoiceUI',
          'blurChatHistory',
          'blurAvatar',
          'hideUpgradeButtons',
          'hideRateLimitMessages',
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
          A.rootFlags?.apply?.();
        }

        if (changes.customBgUrl || changes.backgroundBlur || changes.backgroundScaling) {
          A.background?.update?.();
          A.background?.applyStyles?.();
        }

        if (changes.hideUpgradeButtons || changes.hideRateLimitMessages) A.upgrade?.applyUpgradeButtons?.();

        if (changes.hideQuickSettings !== undefined) {
          if (!settings.hideQuickSettings) A.quickSettings?.ensure?.();
          else A.quickSettings?.remove?.();
        }

        const siteModelChanged = changes.siteDefaultModels &&
          changes.siteDefaultModels.oldValue?.[A.site.id] !== changes.siteDefaultModels.newValue?.[A.site.id];
        if ((A.site.id === 'chatgpt' && changes.defaultModel) || siteModelChanged) {
          A.defaultModel?.cancel?.();
          A.defaultModel?.maybeApply?.(true);
        }
        if (changes.dataMaskingEnabled || changes.maskingRandomMode) {
          A.masking?.applyInitial?.();
          A.queue?.schedulePulse?.();
        }
        if (changes.autoContrast) this.applyContrast();
        if (!settings.hideQuickSettings && changedKeys.some(key => ['focusMode', 'blurChatHistory', 'blurAvatar', 'cinemaMode', 'hideUpgradeButtons', 'hideRateLimitMessages', 'queueWhileGenerating', 'appearance', 'dataMaskingEnabled'].includes(key))) A.quickSettings?.ensure?.();

        if (changes.soundEnabled || changes.soundVolume) {
          this.applyAudio();
        }
      } else if (area === 'local' && changes[LOCAL_BG_KEY]) {
        if (isEnabled() && this.isSupportedRoute()) A.background?.update?.(true);
      }
    }
  }

  A.orchestrator = A.orchestrator || {};
  A.orchestrator.AuroraOrchestrator = A.orchestrator.AuroraOrchestrator || AuroraOrchestrator;
})();

