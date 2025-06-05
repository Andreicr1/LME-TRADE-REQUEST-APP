(function(root){
  'use strict';
  const tradeUtils = root.tradeUtils || require('./src/trade-utils');
  const uiHandlers = root.uiHandlers || require('./src/ui-handlers');

  if (typeof window !== 'undefined') {
    window.onload = () => {
      tradeUtils.loadHolidayData().finally(() => uiHandlers.addTrade());
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('service-worker.js')
        .catch(err => console.error('Service Worker registration failed:', err));
    }
  }

  const all = Object.assign({}, tradeUtils, uiHandlers);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = all;
  } else {
    Object.assign(root, all);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
