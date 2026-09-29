const DEFAULTS = {
  legacyComposer: false,
  theme: 'auto',
  appearance: 'clear',
  glassIntensity: 100,
  glassUserMessages: true,
  hideGpt5Limit: false,
  hideUpgradeButtons: false,
  disableAnimations: false,
  focusMode: false,
  hideQuickSettings: false,
  queueWhileGenerating: false,
  customBgUrl: '',
  backgroundBlur: '60',
  backgroundScaling: 'cover',
  voiceColor: 'default',
  cuteVoiceUI: false,
  hasSeenWelcomeScreen: false,
  defaultModel: '',
  customFont: 'system',
  blurChatHistory: false,
  blurAvatar: false,
  soundEnabled: false,
  soundVolume: 'low',
  autoContrast: false,
  smartSelectors: true,
  dataMaskingEnabled: false,
  maskingRandomMode: false,
  cinemaMode: false,
  extensionEnabled: true,
  disabledSites: [],
  siteDefaultModels: {}
};

const DEFAULT_MODEL_VALUES = new Set([
  '',
  'gpt-5.5-instant',
  'gpt-5.6-sol-medium',
  'gpt-5.6-sol-high',
]);

function normalizeDefaultModel(value) {
  return DEFAULT_MODEL_VALUES.has(value) ? value : '';
}

const SITE_IDS = ['chatgpt', 'claude', 'gemini', 'grok'];
function normalizeSitePreference(key, value) {
  if (key === 'disabledSites') return SITE_IDS.filter(id => Array.isArray(value) && value.includes(id));
  if (key === 'siteDefaultModels') return Object.fromEntries(SITE_IDS
    .filter(id => typeof value?.[id] === 'string')
    .map(id => [id, value[id].replace(/\s+/g, ' ').trim().slice(0, 120)]));
  return value;
}
function normalizeSiteSettings(settings) {
  return { ...settings, disabledSites: normalizeSitePreference('disabledSites', settings.disabledSites),
    siteDefaultModels: normalizeSitePreference('siteDefaultModels', settings.siteDefaultModels) };
}

// --- Settings Cache for Instant Popup Response ---
let settingsCache = null;
let localCache = {};

// Pre-cache settings on service worker startup
chrome.storage.sync.get(DEFAULTS, (settings) => {
  const defaultModel = normalizeDefaultModel(settings.defaultModel);
  settingsCache = normalizeSiteSettings({ ...DEFAULTS, ...settings, defaultModel });
  if (defaultModel !== settings.defaultModel) {
    chrome.storage.sync.set({ defaultModel });
  }
});
chrome.storage.local.get(['customBgData', 'detectedTheme'], (local) => {
  localCache = local || {};
});

// Restore the user's saved preferences once when upgrading the old toggle behavior.
chrome.storage.sync.get(['extensionSettingsBackup', 'extensionEnabled'], data => {
  if (data.extensionSettingsBackup && typeof data.extensionSettingsBackup === 'object') {
    const restored = Object.fromEntries(Object.keys(DEFAULTS)
      .filter(key => key !== 'extensionEnabled' && data.extensionSettingsBackup[key] !== undefined)
      .map(key => [key, data.extensionSettingsBackup[key]]));
    chrome.storage.sync.set({ ...restored, extensionEnabled: data.extensionEnabled !== false }, () => {
      if (!chrome.runtime.lastError) chrome.storage.sync.remove('extensionSettingsBackup');
    });
  }
});

// Keep cache in sync with any storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && settingsCache) {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (newValue !== undefined) {
        settingsCache[key] = key === 'defaultModel' ? normalizeDefaultModel(newValue) : normalizeSitePreference(key, newValue);
      } else {
        settingsCache[key] = DEFAULTS[key];
      }
    }
  }
  if (area === 'local') {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (newValue !== undefined) {
        localCache[key] = newValue;
      } else {
        delete localCache[key];
      }
    }
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set(DEFAULTS);
  } else if (details.reason === 'update') {
    chrome.storage.sync.get((items) => {
      const newSettings = {};
      Object.keys(DEFAULTS).forEach((key) => {
        if (items[key] === undefined) {
          newSettings[key] = key === 'glassIntensity'
            ? (items.appearance === 'dimmed' ? 0 : DEFAULTS[key])
            : DEFAULTS[key];
        }
      });
      if (normalizeDefaultModel(items.defaultModel) !== items.defaultModel) {
        newSettings.defaultModel = '';
      }
      if (Object.keys(newSettings).length > 0) {
        chrome.storage.sync.set(newSettings);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // GET_SETTINGS: Returns just settings object (for content.js compatibility)
  if (request.type === 'GET_SETTINGS') {
    if (settingsCache) {
      sendResponse(settingsCache);
      return false; // Synchronous response
    } else {
      // Fallback: cache not ready yet (rare edge case)
      chrome.storage.sync.get(DEFAULTS, (settings) => {
        settingsCache = normalizeSiteSettings({
          ...DEFAULTS,
          ...settings,
          defaultModel: normalizeDefaultModel(settings.defaultModel),
        });
        sendResponse(settingsCache);
      });
      return true; // Async response
    }
  }
  
  // GET_SETTINGS_FULL: Returns settings + local data (for popup.js instant open)
  if (request.type === 'GET_SETTINGS_FULL') {
    if (settingsCache) {
      sendResponse({ settings: settingsCache, local: localCache });
      return false; // Synchronous response
    } else {
      // Fallback: cache not ready yet (rare edge case)
      Promise.all([
        chrome.storage.sync.get(DEFAULTS),
        chrome.storage.local.get(['customBgData', 'detectedTheme'])
      ]).then(([sync, local]) => {
        settingsCache = normalizeSiteSettings({
          ...DEFAULTS,
          ...sync,
          defaultModel: normalizeDefaultModel(sync.defaultModel),
        });
        localCache = local || {};
        sendResponse({ settings: settingsCache, local: localCache });
      });
      return true; // Async response
    }
  }
  
  if (request.type === 'GET_DEFAULTS') {
    sendResponse(DEFAULTS);
    return false;
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-visibility') {
    chrome.storage.sync.get('focusMode', (items) => {
      // Toggle Focus Mode
      chrome.storage.sync.set({ focusMode: !items.focusMode });
    });
  } else if (command === 'toggle-blur') {
    chrome.storage.sync.get('blurChatHistory', (items) => {
      // Toggle Streamer Mode (Blur)
      chrome.storage.sync.set({ blurChatHistory: !items.blurChatHistory });
    });
  }
});
