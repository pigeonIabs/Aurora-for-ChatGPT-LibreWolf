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

  function restoreApp(keep = null) {
    for (const [node, original] of positionedApps) {
      if (node === keep) continue;
      for (const [property, value] of Object.entries(original)) {
        if (node.style.getPropertyValue(property) === value.applied) {
          if (value.value) node.style.setProperty(property, value.value, value.priority);
          else node.style.removeProperty(property);
        }
      }
      positionedApps.delete(node);
    }
  }

  function ensureAppOnTop() {
    if (!document.body) return;
    for (const [node] of positionedApps) if (!node.isConnected) positionedApps.delete(node);
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
    restoreApp(app);
    const saved = positionedApps.get(app);
    if (saved && Object.entries(saved).every(([property, value]) => app.style.getPropertyValue(property) === value.applied)) return;
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
    wrap.className = 'bg-visible';
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

  const spaceObservers = new Map();

  function makeSpaceBackground() {
    const sky = document.createElement('div');
    sky.className = 'space-bg';
    const firmament = document.createElement('div');
    firmament.className = 'space-firmament';
    firmament.style.setProperty('--aurora-space-stars', `url("${chrome.runtime.getURL('assets/space-stars.svg')}")`);
    firmament.style.setProperty('--space-angle', `${Math.random() * 360}deg`);
    // An off-center celestial pole gives every star the same slow circular path.
    const poleX = 0.36 + Math.random() * 0.28;
    const poleY = 0.18 + Math.random() * 0.16;
    firmament.style.left = `${poleX * 100}%`;
    firmament.style.top = `${poleY * 100}%`;
    const fit = (width, height) => {
      const radius = Math.hypot(width * Math.max(poleX, 1 - poleX), height * Math.max(poleY, 1 - poleY));
      firmament.style.setProperty('--space-diameter', `${Math.ceil(radius * 2 + 8)}px`);
    };
    fit(window.innerWidth, window.innerHeight);
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width && height) fit(width, height);
    });
    observer.observe(sky);
    spaceObservers.set(sky, observer);
    // Twinkles belong to the rotating sky, so they never slip against the stars.
    for (let index = 0; index < 80; index += 1) {
      const star = document.createElement('span');
      star.className = 'space-twinkle';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.setProperty('--twinkle-size', `${0.85 + Math.random() * 0.9}px`);
      star.style.setProperty('--twinkle-duration', `${4.5 + Math.random() * 7}s`);
      star.style.setProperty('--twinkle-delay', `${-Math.random() * 12}s`);
      firmament.appendChild(star);
    }
    sky.appendChild(firmament);
    for (let index = 0; index < 1; index += 1) {
      const meteor = document.createElement('span');
      meteor.className = 'space-meteor';
      const place = () => {
        const angle = 24 + Math.random() * 21;
        meteor.style.left = `${7 + Math.random() * 66}%`;
        meteor.style.top = `${5 + Math.random() * 46}%`;
        meteor.style.setProperty('--meteor-angle', `${angle}deg`);
        meteor.style.setProperty('--meteor-slope', String(Math.tan(angle * Math.PI / 180)));
        meteor.style.setProperty('--meteor-distance', `${170 + Math.random() * 210}px`);
      };
      place();
      meteor.style.animationDuration = `${70 + Math.random() * 35}s`;
      meteor.style.animationDelay = `${30 + Math.random() * 35}s`;
      meteor.addEventListener('animationiteration', place);
      sky.appendChild(meteor);
    }
    return sky;
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
    pendingForce: false,
    loadingUrl: null,
    abortController: null,
    transitionTimeout: null,
    generation: 0,
    TRANSITION_MS: 750,
    LOAD_TIMEOUT_MS: 5000,

    // Default is Aurora's original GPT-5 wallpaper on every supported site.
    DEFAULT_SRCSET:
      'https://persistent.oaistatic.com/burrito-nux/640.webp 640w, https://persistent.oaistatic.com/burrito-nux/1280.webp 1280w, https://persistent.oaistatic.com/burrito-nux/1920.webp 1920w',
    DEFAULT_SRC: 'https://persistent.oaistatic.com/burrito-nux/640.webp',
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
      layer.classList.remove('active', 'gpt5-active', 'pure-black-active', 'space-active');
      const sky = layer.querySelector('.space-bg');
      if (sky) {
        spaceObservers.get(sky)?.disconnect();
        spaceObservers.delete(sky);
        sky.remove();
      }

      const img = layer.querySelector('img');
      const video = layer.querySelector('video');
      const source = layer.querySelector('source');

      if (img) {
        img.removeAttribute('src');
        img.removeAttribute('srcset');
        img.style.display = 'none';
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.style.display = 'none';
      }
      if (source) {
        source.removeAttribute('srcset');
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

    loadMedia(layer, url, srcset = '') {
      if (!layer) return Promise.resolve();
      const image = layer.querySelector('img');
      const video = layer.querySelector('video');
      const source = layer.querySelector('source');
      const isVideo = this.isVideo(url);
      const media = isVideo ? video : image;
      const event = isVideo ? 'loadeddata' : 'load';
      const controller = new AbortController();
      this.abortController = controller;

      return new Promise((resolve, reject) => {
        let timeout;
        const finish = () => {
          clearTimeout(timeout);
          media.removeEventListener(event, finish);
          media.removeEventListener('error', finish);
          controller.signal.removeEventListener('abort', finish);
          if (this.abortController === controller) this.abortController = null;
          if (controller.signal.aborted) { reject(new Error('Aborted')); return; }
          if (!isVideo && image.naturalWidth && A.getSettings?.().autoContrast) A.contrast?.engine?.analyze?.(image);
          resolve();
        };
        media.addEventListener(event, finish, { once: true });
        media.addEventListener('error', finish, { once: true });
        controller.signal.addEventListener('abort', finish, { once: true });
        timeout = setTimeout(finish, this.LOAD_TIMEOUT_MS);
        image.style.display = isVideo ? 'none' : 'block';
        video.style.display = isVideo ? 'block' : 'none';
        if (isVideo) {
          image.removeAttribute('src');
          image.removeAttribute('srcset');
          source.removeAttribute('srcset');
          video.src = url;
          video.load();
          if (!document.hidden) video.play().catch(() => {});
          if (video.readyState >= 2) finish();
        } else {
          video.pause();
          video.removeAttribute('src');
          // Set responsive candidates first so the fallback cannot start a
          // redundant request for the smallest image.
          if (srcset) { source.srcset = srcset; image.srcset = srcset; }
          else { source.removeAttribute('srcset'); image.removeAttribute('srcset'); }
          image.src = url;
          if (image.complete && image.naturalWidth) finish();
        }
      });
    },

    loadDefault(layer) {
      return this.loadMedia(layer, this.DEFAULT_SRC, this.DEFAULT_SRCSET);
    },

    crossfade(toLayer, fromLayer) {
      return new Promise((resolve) => {
        if (!toLayer || !fromLayer) {
          resolve();
          return;
        }

        const controller = new AbortController();
        this.abortController = controller;
        let frame;
        const finish = () => {
          cancelAnimationFrame(frame);
          toLayer.removeEventListener('transitionend', onTransitionEnd);
          controller.signal.removeEventListener('abort', finish);
          clearTimeout(this.transitionTimeout);
          this.transitionTimeout = null;
          if (this.abortController === controller) this.abortController = null;
          resolve();
        };
        const onTransitionEnd = event => {
          if (event.propertyName === 'opacity' && event.target === toLayer) finish();
        };
        this.transitionTimeout = setTimeout(finish, this.TRANSITION_MS + 100);
        toLayer.addEventListener('transitionend', onTransitionEnd);
        controller.signal.addEventListener('abort', finish, { once: true });

        frame = requestAnimationFrame(() => {
          toLayer.classList.add('active');
          fromLayer.classList.remove('active');
        });
      });
    },

    async switchTo(url, force = false) {
      if (this.state !== 'idle') {
        if (this.state === 'loading' && (url !== this.loadingUrl || force)) {
          this.generation += 1;
          this.abort();
          this.state = 'idle';
          return this.switchTo(url, force);
        }
        if (url === this.loadingUrl && !force) {
          if (this.pendingUrl !== url) { this.pendingUrl = null; this.pendingForce = false; }
          return;
        }
        this.pendingUrl = url;
        this.pendingForce = force;
        return;
      }

      if (url === this.currentUrl && !force) return;

      const container = this.getContainer();
      if (!container) return;

      const activeLayer = this.getActiveLayer();
      const firstPaint = this.currentUrl === null;
      const inactiveLayer = firstPaint ? activeLayer : this.getInactiveLayer();
      if (!activeLayer || !inactiveLayer) return;
      const generation = this.generation;

      try {
        this.state = 'loading';
        this.loadingUrl = url;
        this.cleanLayer(inactiveLayer);
        if (firstPaint) inactiveLayer.classList.add('active');

        if (url === '__gpt5_animated__') {
          inactiveLayer.classList.add('gpt5-active');
        } else if (url === '__pure_black__') {
          inactiveLayer.classList.add('pure-black-active');
        } else if (url === '__space__') {
          inactiveLayer.appendChild(makeSpaceBackground());
          inactiveLayer.classList.add('space-active');
        } else if (url === '__local__') {
          if (chrome?.runtime?.id && chrome?.storage?.local) {
            const localData = await new Promise((resolve) => {
              chrome.storage.local.get(LOCAL_BG_KEY, (res) => {
                if (chrome.runtime.lastError || !res || !res[LOCAL_BG_KEY]) resolve(null);
                else resolve(res[LOCAL_BG_KEY]);
              });
            });

            if (generation !== this.generation) return;
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
        container.classList.toggle('space-mode', url === '__space__');
        this.state = 'transitioning';
        if (firstPaint) inactiveLayer.classList.add('active');
        else await this.crossfade(inactiveLayer, activeLayer);
        if (generation !== this.generation) return;

        if (!firstPaint) this.cleanLayer(activeLayer);

        this.activeLayerId = inactiveLayer.dataset.layerId;
        this.currentUrl = url;
        this.loadingUrl = null;
        this.state = 'idle';

        if (this.pendingUrl !== null) {
          const pending = this.pendingUrl;
          const pendingForce = this.pendingForce;
          this.pendingUrl = null;
          this.pendingForce = false;
          this.switchTo(pending, pendingForce);
        }
      } catch (err) {
        if (generation !== this.generation) return;
        this.state = 'idle';
        if (err.message !== 'Aborted') console.error('Aurora BG switch error:', err);
      }
    },

    update(force = false) {
      const s = A.getSettings?.() || {};
      this.switchTo(s.customBgUrl, force && s.customBgUrl === '__local__');
    },
  };

  function updateBackgroundImage(force = false) {
    if (!isEnabled()) return;
    BackgroundManager.update(force);
  }

  function applyCustomStyles() {
    if (!isEnabled()) return;
    const bgNode = document.getElementById(ID);
    if (!bgNode) return;

    const s = A.getSettings?.() || {};
    const blurPx = `${s.backgroundBlur ?? '60'}px`;
    const scaling = s.backgroundScaling || 'cover';

    A.utils.setStyle(bgNode, '--cgpt-bg-blur-radius', blurPx);
    A.utils.setStyle(bgNode, '--cgpt-object-fit', scaling);
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
      };
      if (document.body) add();
      else document.addEventListener('DOMContentLoaded', add, { once: true });
    } else {
      node.classList.add('bg-visible');
      ensureAppOnTop();
    }
  }

  A.background = A.background || {};
  A.background.restoreApp = restoreApp;
  A.background.ensureAppOnTop = ensureAppOnTop;
  A.background.manager = BackgroundManager;
  A.background.show = A.background.show || showBg;
  A.background.applyStyles = A.background.applyStyles || applyCustomStyles;
  A.background.update = A.background.update || updateBackgroundImage;

  A.background.reset =
    A.background.reset ||
    (() => {
      for (const observer of spaceObservers.values()) observer.disconnect();
      spaceObservers.clear();
      BackgroundManager.generation += 1;
      try {
        BackgroundManager.abort();
      } catch (e) {
        // ignore
      }
      BackgroundManager.currentUrl = null;
      BackgroundManager.loadingUrl = null;
      BackgroundManager.activeLayerId = 'a';
      BackgroundManager.state = 'idle';
      BackgroundManager.pendingUrl = null;
      BackgroundManager.pendingForce = false;
    });
})();
