// modules/aurora/background.js
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  const cfg = A.config || {};

  const ID = cfg.ID || 'cgpt-ambient-bg';
  const LOCAL_BG_KEY = cfg.LOCAL_BG_KEY || 'customBgData';

  function isEnabled() {
    return A.isEnabled ? A.isEnabled() : true;
  }

  const positionedApps = new Map();

  function restoreApp() {
    for (const [node, original] of positionedApps) {
      for (const [property, value] of Object.entries(original)) {
        if (node.style.getPropertyValue(property) === value.applied) {
          if (value.value) node.style.setProperty(property, value.value, value.priority);
          else node.style.removeProperty(property);
        }
      }
    }
    positionedApps.clear();
  }

  function ensureAppOnTop() {
    if (!document.body) return;
    // Skip extension-inserted elements to avoid targeting the background container or quick settings as the app container
    let firstChild = document.body.firstElementChild;
    while (firstChild && (
      firstChild.id === cfg.ID || 
      firstChild.id === cfg.STYLE_ID || 
      firstChild.id === cfg.QS_BUTTON_ID || 
      firstChild.id === cfg.QS_PANEL_ID || 
      firstChild.id === 'aurora-welcome-overlay'
    )) {
      firstChild = firstChild.nextElementSibling;
    }
    const app =
      (A.site?.appRoot && document.querySelector(A.site.appRoot)) ||
      document.getElementById('__next') ||
      document.querySelector('#root') ||
      document.querySelector('main') ||
      firstChild;
    if (!app) return;
    const cs = getComputedStyle(app);
    const set = (property, applied) => {
      if (!positionedApps.has(app)) positionedApps.set(app, {});
      const saved = positionedApps.get(app);
      if (!saved[property]) saved[property] = { value: app.style.getPropertyValue(property), priority: app.style.getPropertyPriority(property), applied };
      app.style.setProperty(property, applied);
    };
    if (cs.position === 'static') set('position', 'relative');
    if (!app.style.zIndex || parseInt(app.style.zIndex || '0', 10) < 0) set('z-index', '0');
  }

  function makeBgNode() {
    const wrap = document.createElement('div');
    wrap.id = ID;
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.setProperty('--cgpt-bg-blur-radius', '60px');
    wrap.style.setProperty('--cgpt-object-fit', 'cover');
    Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '-1', pointerEvents: 'none', overflow: 'hidden' });

    const createLayer = (layerId, active = false) => {
      const layer = document.createElement('div');
      layer.className = `media-layer${active ? ' active' : ''}`;
      layer.dataset.layerId = layerId;

      const animatedBg = document.createElement('div');
      animatedBg.className = 'animated-bg';
      for (let index = 0; index < 3; index += 1) {
        const blob = document.createElement('div');
        blob.className = 'blob';
        animatedBg.appendChild(blob);
      }

      const video = document.createElement('video');
      video.playsInline = true;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;

      const picture = document.createElement('picture');
      const source = document.createElement('source');
      source.type = 'image/webp';
      const image = document.createElement('img');
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.sizes = '100vw';
      image.loading = 'eager';
      image.setAttribute('fetchpriority', 'high');
      picture.append(source, image);

      layer.append(animatedBg, video, picture);
      return layer;
    };

    const haze = document.createElement('div');
    haze.className = 'haze';
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    wrap.append(createLayer('a', true), createLayer('b'), haze, overlay);
    return wrap;
  }

  // ========================================================================
  // BACKGROUND MANAGER - State Machine for Reliable Background Switching
  // ========================================================================
  const BackgroundManager = {
    // State: 'idle' | 'loading' | 'transitioning'
    state: 'idle',
    activeLayerId: 'a',
    currentUrl: null,
    pendingUrl: null,
    abortController: null,
    transitionTimeout: null,
    generation: 0,
    TRANSITION_MS: 750,
    LOAD_TIMEOUT_MS: 5000,

    // Default background URLs
    DEFAULT_SRCSET: A.site?.id === 'chatgpt' ?
      'https://persistent.oaistatic.com/burrito-nux/640.webp 640w, https://persistent.oaistatic.com/burrito-nux/1280.webp 1280w, https://persistent.oaistatic.com/burrito-nux/1920.webp 1920w' : '',
    DEFAULT_SRC: A.site?.id === 'chatgpt' ? 'https://persistent.oaistatic.com/burrito-nux/640.webp' : cfg.GROK_HORIZON_URL,
    VIDEO_EXTENSIONS: ['.mp4', '.webm', '.ogv'],

    getContainer() {
      return document.getElementById(ID);
    },

    getLayer(layerId) {
      const container = this.getContainer();
      return container?.querySelector(`.media-layer[data-layer-id="${layerId}"]`);
    },

    getActiveLayer() {
      return this.getLayer(this.activeLayerId);
    },

    getInactiveLayer() {
      const inactiveId = this.activeLayerId === 'a' ? 'b' : 'a';
      return this.getLayer(inactiveId);
    },

    // Completely clean a layer of all content and classes
    cleanLayer(layer) {
      if (!layer) return;
      layer.classList.remove('active', 'gpt5-active', 'pure-black-active');

      const img = layer.querySelector('img');
      const video = layer.querySelector('video');
      const source = layer.querySelector('source');

      if (img) {
        img.src = '';
        img.srcset = '';
        img.style.display = 'none';
      }
      if (video) {
        video.pause();
        video.src = '';
        video.style.display = 'none';
      }
      if (source) {
        source.srcset = '';
      }
    },

    abort() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      if (this.transitionTimeout) {
        clearTimeout(this.transitionTimeout);
        this.transitionTimeout = null;
      }
      this.pendingUrl = null;
    },

    isVideo(url) {
      if (!url) return false;
      const lower = url.toLowerCase();
      return this.VIDEO_EXTENSIONS.some((ext) => lower.includes(ext)) || lower.startsWith('data:video');
    },

    loadMedia(layer, url) {
      return new Promise((resolve, reject) => {
        if (!layer) {
          reject(new Error('No layer'));
          return;
        }

        const img = layer.querySelector('img');
        const video = layer.querySelector('video');
        const source = layer.querySelector('source');
        const isVideoUrl = this.isVideo(url);

        // Set up abort handling
        const abortController = new AbortController();
        this.abortController = abortController;

        // Timeout fallback
        const timeoutId = setTimeout(() => {
          if (!abortController.signal.aborted) {
            console.warn('Aurora: Media load timeout, proceeding anyway');
            resolve();
          }
        }, this.LOAD_TIMEOUT_MS);

        const cleanup = () => {
          clearTimeout(timeoutId);
          if (abortController.signal.aborted) {
            reject(new Error('Aborted'));
          }
        };

        if (isVideoUrl) {
          img.style.display = 'none';
          video.style.display = 'block';

          const onReady = () => {
            video.removeEventListener('loadeddata', onReady);
            video.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) resolve();
          };
          const onError = () => {
            video.removeEventListener('loadeddata', onReady);
            video.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) resolve(); // Still transition on error
          };

          video.addEventListener('loadeddata', onReady, { once: true });
          video.addEventListener('error', onError, { once: true });
          video.src = url;
          video.load();
          video.play().catch(() => {}); // Ignore autoplay errors

          img.src = '';
          img.srcset = '';
          source.srcset = '';
        } else {
          video.style.display = 'none';
          img.style.display = 'block';

          const onReady = () => {
            img.removeEventListener('load', onReady);
            img.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) {
              const s = A.getSettings?.() || {};
              if (s.autoContrast && A.contrast?.engine?.analyze) {
                A.contrast.engine.analyze(img);
              }
              resolve();
            }
          };
          const onError = () => {
            img.removeEventListener('load', onReady);
            img.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) resolve();
          };

          img.addEventListener('load', onReady, { once: true });
          img.addEventListener('error', onError, { once: true });
          img.src = url;
          img.srcset = '';
          source.srcset = '';

          video.src = '';
        }
      });
    },

    loadDefault(layer) {
      return new Promise((resolve) => {
        if (!layer) {
          resolve();
          return;
        }

        const img = layer.querySelector('img');
        const video = layer.querySelector('video');
        const source = layer.querySelector('source');

        video.style.display = 'none';
        video.src = '';
        img.style.display = 'block';

        const onReady = () => {
          img.removeEventListener('load', onReady);
          img.removeEventListener('error', onReady);
          const s = A.getSettings?.() || {};
          if (s.autoContrast && A.contrast?.engine?.analyze) {
            A.contrast.engine.analyze(img);
          }
          resolve();
        };

        img.addEventListener('load', onReady, { once: true });
        img.addEventListener('error', onReady, { once: true });

        img.src = this.DEFAULT_SRC;
        img.srcset = this.DEFAULT_SRCSET;
        source.srcset = this.DEFAULT_SRCSET;
      });
    },

    crossfade(toLayer, fromLayer) {
      return new Promise((resolve) => {
        if (!toLayer || !fromLayer) {
          resolve();
          return;
        }

        const onTransitionEnd = (e) => {
          if (e.propertyName === 'opacity' && e.target === toLayer) {
            toLayer.removeEventListener('transitionend', onTransitionEnd);
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
            resolve();
          }
        };

        this.transitionTimeout = setTimeout(() => {
          toLayer.removeEventListener('transitionend', onTransitionEnd);
          this.transitionTimeout = null;
          resolve();
        }, this.TRANSITION_MS + 100);

        toLayer.addEventListener('transitionend', onTransitionEnd);

        requestAnimationFrame(() => {
          toLayer.classList.add('active');
          fromLayer.classList.remove('active');
        });
      });
    },

    async switchTo(url) {
      if (this.state !== 'idle') {
        this.pendingUrl = url;
        return;
      }

      if (url === this.currentUrl && this.state === 'idle') return;

      const container = this.getContainer();
      if (!container) return;

      const activeLayer = this.getActiveLayer();
      const inactiveLayer = this.getInactiveLayer();
      if (!activeLayer || !inactiveLayer) return;
      const generation = this.generation;

      try {
        this.state = 'loading';
        this.cleanLayer(inactiveLayer);

        if (url === '__gpt5_animated__') {
          inactiveLayer.classList.add('gpt5-active');
        } else if (url === '__pure_black__') {
          inactiveLayer.classList.add('pure-black-active');
        } else if (url === '__local__') {
          if (chrome?.runtime?.id && chrome?.storage?.local) {
            const localData = await new Promise((resolve) => {
              chrome.storage.local.get(LOCAL_BG_KEY, (res) => {
                if (chrome.runtime.lastError || !res || !res[LOCAL_BG_KEY]) resolve(null);
                else resolve(res[LOCAL_BG_KEY]);
              });
            });

            if (localData) await this.loadMedia(inactiveLayer, localData);
            else await this.loadDefault(inactiveLayer);
          } else {
            await this.loadDefault(inactiveLayer);
          }
        } else if (url) {
          await this.loadMedia(inactiveLayer, url);
        } else {
          await this.loadDefault(inactiveLayer);
        }

        if (generation !== this.generation) return;
        container.classList.toggle('pure-black-mode', url === '__pure_black__');
        this.state = 'transitioning';
        await this.crossfade(inactiveLayer, activeLayer);
        if (generation !== this.generation) return;

        this.cleanLayer(activeLayer);

        this.activeLayerId = inactiveLayer.dataset.layerId;
        this.currentUrl = url;
        this.state = 'idle';

        if (this.pendingUrl !== null) {
          const pending = this.pendingUrl;
          this.pendingUrl = null;
          this.switchTo(pending);
        }
      } catch (err) {
        if (generation !== this.generation) return;
        this.state = 'idle';
        if (err.message !== 'Aborted') console.error('Aurora BG switch error:', err);
      }
    },

    update() {
      const s = A.getSettings?.() || {};
      this.switchTo(s.customBgUrl);
    },
  };

  function updateBackgroundImage() {
    if (!isEnabled()) return;
    BackgroundManager.update();
  }

  function applyCustomStyles() {
    if (!isEnabled()) return;
    const bgNode = document.getElementById(ID);
    if (!bgNode) return;

    const s = A.getSettings?.() || {};
    const blurPx = `${s.backgroundBlur ?? '60'}px`;
    const scaling = s.backgroundScaling || 'cover';

    bgNode.style.setProperty('--cgpt-bg-blur-radius', blurPx);
    bgNode.style.setProperty('--cgpt-object-fit', scaling);
  }

  function showBg() {
    if (!isEnabled()) return;
    let node = document.getElementById(ID);
    if (!node) {
      A.background.reset?.();
      node = makeBgNode();
      const add = () => {
        document.body.prepend(node);
        ensureAppOnTop();
        applyCustomStyles();
        updateBackgroundImage();
        setTimeout(() => node.classList.add('bg-visible'), 50);
      };
      if (document.body) add();
      else document.addEventListener('DOMContentLoaded', add, { once: true });
    } else {
      node.classList.add('bg-visible');
      ensureAppOnTop();
      updateBackgroundImage();
    }
  }

  A.background = A.background || {};
  A.background.restoreApp = restoreApp;
  A.background.manager = BackgroundManager;
  A.background.show = A.background.show || showBg;
  A.background.applyStyles = A.background.applyStyles || applyCustomStyles;
  A.background.update = A.background.update || updateBackgroundImage;

  A.background.reset =
    A.background.reset ||
    (() => {
      BackgroundManager.generation += 1;
      try {
        BackgroundManager.abort();
      } catch (e) {
        // ignore
      }
      BackgroundManager.currentUrl = null;
      BackgroundManager.activeLayerId = 'a';
      BackgroundManager.state = 'idle';
      BackgroundManager.pendingUrl = null;
    });
})();
