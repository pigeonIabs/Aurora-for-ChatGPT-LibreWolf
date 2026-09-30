const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

// Firefox content-script globalThis inherits from window but is a different object.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts
for (const entry of manifest.content_scripts) {
  const origin = entry.matches[0].replace(/\*$/, '');
  const siteId = new URL(origin).hostname.split('.')[0];
  for (const splitScope of [true, false]) {
    const attributes = new Map();
    const classes = new Set();
    const document = {
      documentElement: {
        getAttribute: key => attributes.get(key) || null,
        setAttribute: (key, value) => attributes.set(key, value),
        toggleAttribute: (key, value) => value ? attributes.set(key, '') : attributes.delete(key),
        matches: () => false,
        classList: { toggle: (key, value) => value ? classes.add(key) : classes.delete(key) },
        style: { setProperty() {} },
      },
      body: { matches: () => false },
    };
    const scope = { document, URL, URLSearchParams, location: new URL(origin), matchMedia: () => ({matches: false}) };
    scope.window = splitScope ? { location: scope.location } : scope;
    if (splitScope) Object.setPrototypeOf(scope, scope.window);
    scope.chrome = {runtime: {id: manifest.browser_specific_settings.gecko.id, getURL: name => `moz-extension://test/${name}`}, storage: {local: {set() {}}}};
    const context = vm.createContext(scope);
    const files = [entry.js[0], entry.js[1], 'modules/aurora/namespace.js', 'modules/aurora/config.js', 'modules/aurora/root-flags.js'];
    for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
    const A = scope.window.AuroraExt;
    assert.equal(A.site.id, siteId);
    assert.equal(A.isActive(), true);
    A.state.settings = {extensionEnabled: true, theme: 'dark', appearance: 'clear'};
    A.rootFlags.apply();
    assert.equal(attributes.get('data-aurora-site'), siteId);
    assert.equal(classes.has('cgpt-ambient-on'), true);
    A.state.settings.disabledSites = [siteId];
    assert.equal(A.isActive(), false);
    A.state.settings.disabledSites = [];
    A.state.settings.extensionEnabled = false;
    assert.equal(A.isActive(), false);
    console.log(`${siteId} ${splitScope ? 'Firefox content scope' : 'shared window scope'} startup passed`);
  }
}
