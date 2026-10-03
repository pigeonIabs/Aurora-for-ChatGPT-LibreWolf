const preferences = window.AuroraExt.preferences;
const DEFAULTS = preferences.defaults;
const normalizeDefaultModel = preferences.normalizeDefaultModel;
const normalizeSiteSettings = preferences.normalize;

// One settings read serves every caller during a cold background-page start.
// Large uploaded media is read only when a popup requests its local preview.
let settingsCache = null;
let localCache = null;
let localRequest = null;
let localRevision = 0;
const LOCAL_KEYS = ['customBgData', 'detectedTheme'];
const pendingSettings = {};

const settingsReady = new Promise(resolve => {
  chrome.storage.sync.get({ ...DEFAULTS, extensionSettingsBackup: null }, stored => {
    stored ||= {};
    const backup = stored.extensionSettingsBackup;
    const restored = backup && typeof backup === 'object'
      ? Object.fromEntries(Object.keys(DEFAULTS)
        .filter(key => key !== 'extensionEnabled' && backup[key] !== undefined && !(key in pendingSettings))
        .map(key => [key, backup[key]]))
      : {};
    const settings = { ...DEFAULTS, ...stored, ...restored, ...pendingSettings };
    delete settings.extensionSettingsBackup;
    const defaultModel = normalizeDefaultModel(settings.defaultModel);
    settingsCache = normalizeSiteSettings({ ...settings, defaultModel });
    const updates = { ...restored };
    if (defaultModel !== settings.defaultModel) updates.defaultModel = defaultModel;
    if (Object.keys(updates).length) {
      chrome.storage.sync.set(updates, () => {
        if (!chrome.runtime.lastError && backup) chrome.storage.sync.remove('extensionSettingsBackup');
        resolve(settingsCache);
      });
    } else {
      if (backup) chrome.storage.sync.remove('extensionSettingsBackup');
      resolve(settingsCache);
    }
  });
});

function getLocalData() {
  if (localCache) return Promise.resolve(localCache);
  if (localRequest) return localRequest;
  const revision = localRevision;
  localRequest = new Promise(resolve => chrome.storage.local.get(LOCAL_KEYS, resolve))
    .then(local => {
      localRequest = null;
      // A concurrent upload or theme change wins over an older storage response.
      if (revision !== localRevision) return getLocalData();
      localCache = local || {};
      return localCache;
    });
  return localRequest;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key === 'extensionSettingsBackup') continue;
      const normalized = preferences.value(key, newValue);
      if (settingsCache) settingsCache[key] = normalized;
      else pendingSettings[key] = normalized;
    }
  } else if (area === 'local') {
    for (const key of LOCAL_KEYS) {
      if (!(key in changes)) continue;
      localRevision++;
      if (!localCache) continue;
      const value = changes[key].newValue;
      if (value === undefined) delete localCache[key];
      else localCache[key] = value;
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
  if (request.type === 'GET_SETTINGS') {
    if (settingsCache) {
      sendResponse(settingsCache);
      return false;
    }
    settingsReady.then(() => sendResponse(settingsCache));
    return true;
  }

  if (request.type === 'GET_SETTINGS_FULL') {
    if (settingsCache && localCache) {
      sendResponse({ settings: settingsCache, local: localCache });
      return false;
    }
    Promise.all([settingsReady, getLocalData()]).then(([, local]) => {
      sendResponse({ settings: settingsCache, local });
    });
    return true;
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
