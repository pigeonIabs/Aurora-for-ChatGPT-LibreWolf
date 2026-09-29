// The orchestrator owns privacy settings and the route lifecycle.
(() => {
  'use strict';
  const A = window.AuroraExt;
  A.masking = {
    applyInitial() { window.DataMaskingEngine?.configure(A.getSettings(), A.isActive()); },
    stop() { window.DataMaskingEngine?.stopObserver(); },
  };
})();
