// Critical compatibility checks for preference loading, native model workflows,
// lazy quick settings, and native paint ownership changed by the overhaul.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { firefox } = require('../work/performance/node_modules/playwright');
const { source, fixture, inspect, pixelDifference, nativeCSS, root } = require('./profile_runtime.cjs');
const before = path.join(root, 'work/elegance-before-20261001');
const output = path.join(root, 'work/elegance-performance');
const manifest = base => JSON.parse(fs.readFileSync(path.join(base, 'manifest.json')));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function background(base, stored = {}, local = {}) {
  const listeners = [], messages = [];
  const calls = { syncReads: 0, localReads: 0, localBytesRead: 0 };
  function area(name, data) {
    const emit = changes => listeners.forEach(listener => listener(changes, name));
    return {
      get(keys, callback) {
        const result = typeof keys === 'object' && !Array.isArray(keys) ? { ...keys } : {};
        for (const key of typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(result)) {
          if (key in data) result[key] = data[key];
        }
        calls[name + 'Reads']++;
        if (name === 'local') calls.localBytesRead += JSON.stringify(result).length;
        return delay(10).then(() => { callback?.(result); return result; });
      },
      set(values, callback) {
        const changes = Object.fromEntries(Object.entries(values).map(([key, value]) =>
          [key, { oldValue: data[key], newValue: value }]));
        Object.assign(data, values);
        emit(changes);
        callback?.();
        return Promise.resolve();
      },
      remove(key) { delete data[key]; emit({ [key]: { newValue: undefined } }); return Promise.resolve(); },
    };
  }
  const chrome = { storage: { sync: area('sync', stored), local: area('local', local),
    onChanged: { addListener: listener => listeners.push(listener) } },
    runtime: { onMessage: { addListener: listener => messages.push(listener) }, onInstalled: { addListener() {} } },
    commands: { onCommand: { addListener() {} } } };
  const scope = { chrome, console, setTimeout, clearTimeout };
  scope.window = scope;
  const context = vm.createContext(scope);
  for (const file of manifest(base).background.scripts) vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), context);
  return { calls, chrome, send: type => new Promise(resolve => messages[0]({ type }, {}, resolve)) };
}

async function verifyBackground() {
  const results = {};
  for (const [label, base] of [['before', before], ['after', root]]) {
    const extension = background(base, {}, { customBgData: 'data:image/webp;base64,' + 'A'.repeat(15 * 1024 * 1024) });
    const responses = await Promise.all(Array.from({ length: 12 }, () => extension.send('GET_SETTINGS')));
    await delay(15);
    assert(responses.every(settings => settings.theme === 'auto' && settings.extensionEnabled));
    results[label] = { ...extension.calls };
    const full = await extension.send('GET_SETTINGS_FULL');
    assert(full.local.customBgData.length > 15 * 1024 * 1024);
  }
  const migration = background(root, { extensionEnabled: false,
    extensionSettingsBackup: { customBgUrl: '__local__', theme: 'light', defaultModel: 'obsolete' } });
  const migrated = await migration.send('GET_SETTINGS');
  assert.equal(migrated.extensionEnabled, false);
  assert.equal(migrated.theme, 'light');
  assert.equal(migrated.customBgUrl, '__local__');
  assert.equal(migrated.defaultModel, '');

  const racing = background(root, { theme: 'dark' }, { customBgData: 'old' });
  const loading = racing.send('GET_SETTINGS');
  await racing.chrome.storage.sync.set({ theme: 'light' });
  assert.equal((await loading).theme, 'light');
  const localLoading = racing.send('GET_SETTINGS_FULL');
  await racing.chrome.storage.local.set({ customBgData: 'new' });
  assert.equal((await localLoading).local.customBgData, 'new');
  await racing.chrome.storage.sync.remove('theme');
  assert.equal((await racing.send('GET_SETTINGS')).theme, 'auto');
  return { startup: results, migration: true, concurrentSettings: true, concurrentUpload: true, deletedPreference: true };
}

async function openFixture(browser, base, site, width = 1280) {
  const entry = manifest(base).content_scripts.find(entry => entry.matches[0].includes(site));
  const origin = entry.matches[0].replace('*', '');
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const css = entry.css.map(file => fs.readFileSync(path.join(base, file), 'utf8')).join('\n');
  const html = `<!doctype html><html data-theme="dark"><head><style>${nativeCSS}\n${css}</style><script>${source(base, entry).replace(/<\/script/gi, '<\\/script')}</script></head><body>${fixture(site)}</body></html>`;
  await page.route('**/*', route => route.request().url() === origin
    ? route.fulfill({ contentType: 'text/html', body: html }) : route.abort());
  await page.goto(origin);
  await page.waitForTimeout(650);
  return { page, errors };
}

async function verifyPaintAndPanel(browser) {
  const results = {};
  for (const site of ['chatgpt', 'claude', 'gemini', 'grok']) {
    results[site] = {};
    for (const width of [1280, 420]) {
      const states = {}, images = {};
      for (const [label, base] of [['before', before], ['after', root]]) {
        const { page, errors } = await openFixture(browser, base, site, width);
        await page.evaluate(() => {
          const region = document.createElement('div');
          region.className = 'cdk-overlay-container';
          region.innerHTML = `<div role="menu" style="position:relative;width:240px;height:64px;padding:0;background:transparent" id="native-shell"><div style="position:absolute;inset:0;background:#333;border-radius:16px" id="native-layer">Painted layer</div></div>
            <div role="menu" style="background:transparent;border-radius:20px" id="bare-menu">Transparent hit area</div>
            <div role="menu" style="background:#333;border-radius:0;border:0" id="flat-fill">Flat surface</div>
            <div role="menu" hidden id="hidden-menu">Hidden</div>`;
          document.querySelector('main').append(region);
          AuroraExt.glass.tagAll(document);
          document.getElementById('cgpt-qs-btn').click();
        });
        await page.waitForTimeout(350);
        states[label] = await inspect(page);
        images[label] = await page.screenshot({ path: path.join(output, `${site}-panel-${label}-${width}.png`), animations: 'disabled' });
        const material = await page.evaluate(() => ({
          shellClear: !document.getElementById('native-shell').hasAttribute('data-aurora-surface-edge'),
          layerOwned: document.getElementById('native-layer').getAttribute('data-aurora-surface-edge') === 'true',
          bareClear: !document.getElementById('bare-menu').hasAttribute('data-aurora-surface-edge'),
          flatEdge: document.getElementById('flat-fill').getAttribute('data-aurora-surface-edge') === 'false',
          hiddenClear: !document.getElementById('hidden-menu').hasAttribute('data-aurora-surface-edge'),
          panelOpen: document.getElementById('cgpt-qs-panel').getAttribute('data-state') === 'open',
        }));
        assert(Object.values(material).every(Boolean), `${site} material ownership ${JSON.stringify(material)}`);
        assert.deepEqual(errors, []);
        await page.close();
      }
      assert.deepEqual(states.after, states.before, `${site} native paint and geometry`);
      const difference = pixelDifference(images.before, images.after);
      assert.equal(difference, 0, `${site} quick settings pixels at ${width}`);
      results[site][width] = { pixelDifference: difference, paintAndGeometry: true, nativeOwnership: true };
    }
  }
  return results;
}

async function verifyModels(browser) {
  const results = {};
  for (const mode of ['modern', 'legacy', 'cancel']) {
    const { page, errors } = await openFixture(browser, root, 'chatgpt');
    await page.evaluate(mode => {
      const A = AuroraExt;
      document.querySelectorAll('main [role="menu"], main [role="listbox"], main [role="dialog"]').forEach(node => node.remove());
      const editor = A.dom.findActiveComposer();
      editor.textContent = '';
      editor.focus();
      window.modelActions = { selections: 0, steps: 0 };
      window.modelWaits = [];
      const nativeWait = A.centralObserver.waitFor.bind(A.centralObserver);
      A.centralObserver.waitFor = (getter, options) => {
        const entry = { getter: getter.toString(), started: performance.now() };
        modelWaits.push(entry);
        return nativeWait(getter, options).then(value => {
          entry.result = value?.outerHTML || value;
          entry.elapsed = performance.now() - entry.started;
          return value;
        });
      };
      const button = document.createElement('button');
      button.id = 'native-model-trigger';
      button.textContent = 'Thinking effort';
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', 'native-model-menu');
      if (mode === 'legacy') button.dataset.testid = 'model-switcher-dropdown-button';
      else button.dataset.codexIntelligenceTrigger = 'true';
      editor.closest('form').append(button);
      let menu;
      const show = () => {
        if (button.getAttribute('aria-expanded') === 'true') return;
        button.setAttribute('aria-expanded', 'true');
        setTimeout(() => {
          menu = document.createElement('div');
          menu.id = 'native-model-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-labelledby', button.id); menu.className = 'native-fill';
          document.body.append(menu);
          setTimeout(() => {
            const option = document.createElement('button');
            option.textContent = 'GPT-5.6 Sol High'; option.setAttribute('role', 'menuitemradio');
            option.setAttribute('aria-checked', 'false');
            option.onclick = () => {
              modelActions.selections++;
              if (mode === 'legacy') { button.textContent = option.textContent; button.setAttribute('aria-expanded', 'false'); menu.remove(); return; }
              setTimeout(() => {
                option.setAttribute('aria-checked', 'true');
                const control = document.createElement('div');
                control.dataset.reasoningSlider = 'true'; control.tabIndex = 0;
                control.style.cssText = 'width:200px;height:30px';
                const slider = document.createElement('div');
                slider.setAttribute('role', 'slider'); slider.setAttribute('aria-valuenow', '0');
                control.append(slider); menu.replaceChildren(control);
                control.onkeydown = event => {
                  if (!event.key.startsWith('Arrow')) return;
                  setTimeout(() => {
                    const next = Number(slider.getAttribute('aria-valuenow')) + (event.key === 'ArrowRight' ? 1 : -1);
                    slider.setAttribute('aria-valuenow', next);
                    button.dataset.selectedReasoningEffort = ['low', 'medium', 'high'][next];
                    modelActions.steps++;
                  }, 35);
                };
              }, 35);
            };
            menu.append(option);
          }, 60);
        }, mode === 'cancel' ? 200 : 30);
      };
      button.addEventListener(mode === 'legacy' ? 'click' : 'pointerdown', show);
      A.state.settings.defaultModel = 'gpt-5.6-sol-high';
      A.defaultModel.maybeApply(true);
    }, mode);
    if (mode === 'cancel') {
      await page.keyboard.type('My draft');
      await page.waitForTimeout(450);
      assert.equal(await page.evaluate(() => modelActions.selections), 0);
      assert.equal(await page.evaluate(() => AuroraExt.dom.getComposerText(AuroraExt.dom.findActiveComposer())), 'My draft');
    } else {
      try {
        await page.waitForFunction(mode => mode === 'legacy' ? modelActions.selections === 1 : modelActions.steps === 2, mode, { timeout: 4500 });
      } catch (error) {
        console.log(mode, await page.evaluate(() => ({ actions: modelActions, waits: modelWaits,
          menu: document.getElementById('native-model-menu')?.outerHTML,
          trigger: AuroraExt.dom.findModelSwitcher()?.outerHTML,
          draft: AuroraExt.dom.getComposerText(AuroraExt.dom.findActiveComposer()),
          scopes: [...AuroraExt.centralObserver.attributeScopes.keys()],
          option: [...document.querySelectorAll('[role="menuitemradio"]')].map(node => ({
            text: node.textContent, visible: AuroraExt.dom.isVisible(node), rect: node.getBoundingClientRect().toJSON(),
            display: getComputedStyle(node).display, visibility: getComputedStyle(node).visibility })) })));
        console.log('page errors', errors);
        throw error;
      }
      assert.equal(await page.evaluate(() => modelActions.selections), 1);
    }
    await page.waitForTimeout(40);
    assert.equal(await page.evaluate(() => AuroraExt.centralObserver.attributeScopes.has('model-picker')), false);
    assert.deepEqual(errors, []);
    results[mode] = true;
    await page.close();
  }
  for (const site of ['claude', 'gemini', 'grok']) {
    const { page, errors } = await openFixture(browser, root, site);
    await page.evaluate(site => {
      const A = AuroraExt, editor = A.dom.findActiveComposer();
      document.querySelectorAll('main [role="menu"], main [role="listbox"], main [role="dialog"]').forEach(node => node.remove());
      if (editor.tagName === 'TEXTAREA') editor.value = ''; else editor.textContent = '';
      const button = document.createElement('button');
      button.textContent = 'Current model'; button.setAttribute('aria-controls', 'native-model-menu');
      if (site === 'claude') button.dataset.cds = 'ModelSelector';
      else if (site === 'gemini') button.dataset.testId = 'bard-mode-menu-button';
      else button.id = 'model-select-trigger';
      document.body.append(button);
      window.modelSelections = 0;
      button.onclick = () => {
        const menu = document.createElement('div'); menu.id = 'native-model-menu';
        menu.setAttribute('role', 'menu'); menu.className = 'native-fill'; document.body.append(menu);
        setTimeout(() => {
          const option = document.createElement('button');
          option.setAttribute('role', 'menuitemradio'); option.textContent = 'Preferred model';
          option.onclick = () => { modelSelections++; button.textContent = 'Preferred model'; menu.remove(); };
          menu.append(option);
        }, 80);
      };
      A.state.settings.siteDefaultModels = { [A.site.id]: 'Preferred model' };
      A.defaultModel.maybeApply(true);
    }, site);
    await page.waitForFunction(() => modelSelections === 1);
    assert.deepEqual(errors, []);
    results[site] = true;
    await page.close();
  }
  return results;
}

async function verifyImageViewer(browser) {
  const states = {}, images = {};
  for (const [label, base] of [['before', before], ['after', root]]) {
    const { page, errors } = await openFixture(browser, base, 'chatgpt');
    await page.evaluate(() => {
      const frame = document.createElement('section');
      frame.setAttribute('data-app-shell-pane-frame', '');
      frame.style.cssText = 'position:fixed;inset:0;background:#222';
      frame.innerHTML = `<div data-app-shell-tab-panel-controller data-tab-id="image:fixture" style="width:100%;height:100%;background:#252525">
        <header data-testid="viewer-header" style="position:absolute;top:0;right:60px"><button class="native-fill">Download</button><button>Close</button></header>
        <div class="native-fill" style="position:absolute;bottom:60px;left:350px;width:330px;height:48px;display:flex;align-items:center">
          <button id="image-background-action"><span>Preparing</span></button><button>Edit</button><button>Save</button><button>More</button>
        </div></div>`;
      document.getElementById('root').append(frame);
    });
    await page.waitForTimeout(40);
    await page.evaluate(() => { document.querySelector('#image-background-action span').firstChild.nodeValue = 'Remove background'; });
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(() => document.querySelector('[data-app-shell-pane-frame]').dataset.auroraImageViewer), 'glass');
    states[label] = await inspect(page);
    images[label] = await page.screenshot({ path: path.join(output, `image-viewer-${label}.png`), animations: 'disabled' });
    assert.deepEqual(errors, []);
    await page.close();
  }
  assert.deepEqual(states.after, states.before);
  assert.equal(pixelDifference(images.before, images.after), 0);
  return { delayedActionLabel: true, paintAndGeometry: true, pixelDifference: 0 };
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const modelsOnly = process.argv.includes('--models-only');
  const imageOnly = process.argv.includes('--image-only');
  const reportPath = path.join(output, 'critical-report.json');
  const previous = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath)) : {};
  const report = modelsOnly || imageOnly ? previous : { background: await verifyBackground() };
  const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  if (!modelsOnly && !imageOnly) console.log('background', JSON.stringify(report.background));
  const browser = await firefox.launch({ headless: true,
    executablePath: 'C:/Users/Administrator/AppData/Local/ms-playwright/firefox-1539/firefox/firefox.exe' });
  try {
    if (!modelsOnly && !imageOnly) {
      report.paintAndPanel = await verifyPaintAndPanel(browser);
      console.log('Native ownership and quick settings match at desktop and mobile widths');
    }
    if (!imageOnly) {
      report.models = await verifyModels(browser);
      console.log('Native model selection and draft cancellation passed');
    }
    save();
    if (!modelsOnly) {
      report.imageViewer = await verifyImageViewer(browser);
      console.log('Image viewer matches after delayed native action labels');
    }
    save();
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
