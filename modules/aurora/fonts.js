// Font faces are packaged with the extension and load only when selected.
(() => {
  'use strict';
  const A = window.AuroraExt;
  const cleanup = () => document.getElementById('aurora-google-fonts')?.remove();
  A.fonts = { ensure: cleanup, cleanup };
})();
