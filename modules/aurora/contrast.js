// modules/aurora/contrast.js
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.contrast = A.contrast || {};

  const engine =
    A.contrast.engine ||
    (() => {
      const ContrastEngine = {
        canvas: null,
        ctx: null,
        init() {
          if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = 50;
            this.canvas.height = 50;
            // WillReadFrequently optimization hint
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
          }
        },
        analyze(imgElement) {
          const s = A.getSettings?.() || {};
          if (!s.autoContrast || !A.isActive?.()) return;
          const source = imgElement.currentSrc || imgElement.src;
          if (/^https?:/.test(source) && !imgElement.crossOrigin) {
            const sample = new Image();
            this.pendingSample = sample;
            sample.crossOrigin = 'anonymous';
            sample.onload = () => {
              if (this.pendingSample !== sample) return;
              this.pendingSample = null;
              this.analyze(sample);
            };
            sample.onerror = () => {
              if (this.pendingSample !== sample) return;
              this.pendingSample = null;
              if (A.isActive?.()) document.documentElement.style.removeProperty('--bg-opacity');
            };
            sample.src = source;
            return;
          }
          this.init();

          try {
            this.ctx.drawImage(imgElement, 0, 0, 50, 50);
            const data = this.ctx.getImageData(0, 0, 50, 50).data;
            let colorSum = 0;

            for (let x = 0, len = data.length; x < len; x += 4) {
              const r = data[x];
              const g = data[x + 1];
              const b = data[x + 2];
              const avg = Math.floor((r + g + b) / 3);
              colorSum += avg;
            }

            const brightness = Math.floor(colorSum / (50 * 50));
            // Simple logic: bright image -> darker overlay, dark image -> lighter overlay.
            // Base opacity is around 0.58.
            let newOpacity = 0.58;
            if (brightness > 200) newOpacity = 0.85;
            else if (brightness > 128) newOpacity = 0.7;
            else if (brightness < 50) newOpacity = 0.4;
            document.documentElement.style.setProperty('--bg-opacity', newOpacity);
          } catch (e) {
            // CORS error likely, fail silently and use default
            document.documentElement.style.removeProperty('--bg-opacity');
          }
        },
      };
      return ContrastEngine;
    })();

  A.contrast.engine = engine;
})();

