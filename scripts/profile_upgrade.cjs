/* Focused Firefox measurements and critical compatibility checks for changed
 * upgrade controls. Development tooling is excluded from the extension XPI.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { firefox } = require('../work/performance/node_modules/playwright');
const { source, fixture, pixelDifference, nativeCSS, manifest, root } = require('./profile_runtime.cjs');
const before = path.join(root, 'work/performance-incremental-before');
const out = path.join(root, 'work/performance');
const legacyMarkup = `
  <section id="legacy-probes">
    <a class="__menu-item" id="legacy-menu">Manage subscription and upgrade</a>
    <div class="start-1/2 absolute" id="legacy-header">Upgrade plan</div>
    <div data-testid="accounts-profile-button"><span class="__menu-item-trailing-btn" id="legacy-profile">Plus</span></div>
    <div class="gap-1.5 __menu-item group" id="legacy-sidebar">Upgrade</div>
    <div id="stage-sidebar-tiny-bar"><div>One</div><div>Two</div><div>Three</div><div id="legacy-tiny">Upgrade</div></div>
    <div id="legacy-banner"><div role="button">Upgrade your plan</div></div>
    <div class="py-2 border-b" id="legacy-account">Get ChatGPT Plus<button>Upgrade</button></div>
    <div class="rounded-full dark:bg-[#373669]" id="legacy-go-header">Go</div>
    <div class="rounded-full" id="legacy-go"><span>Upgrade to Go</span></div>
  </section>`;
async function main() {
  const browser = await firefox.launch({ headless: true,
    firefoxUserPrefs: { 'privacy.reduceTimerPrecision': false },
    executablePath: 'C:/Users/Administrator/AppData/Local/ms-playwright/firefox-1539/firefox/firefox.exe' });
  const report = { engine: 'Firefox', method: 'Identical 24-turn offline fixtures, upgrade hiding enabled, 12 separated native menu insertions', sites: {} };
  try {
    for (const entry of manifest.content_scripts) {
      const origin = entry.matches[0].replace('*', '');
      const site = new URL(origin).hostname.split('.')[0];
      const images = {}, paint = {}, metrics = {};
      for (const [label, base] of [['before', before], ['after', root]]) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const css = entry.css.map(file => fs.readFileSync(path.join(base, file), 'utf8')).join('\n');
        const markup = fixture(site) + (site === 'chatgpt' ? legacyMarkup : '');
        const script = source(base, entry).replace('window.storageListeners = []', 'window.settings.hideUpgradeButtons = true; window.storageListeners = []');
        const html = `<!doctype html><html data-theme="dark"><head><style>${nativeCSS}\n${css}</style><script>${script.replace(/<\/script/gi, '<\\/script')}</script></head><body>${markup}</body></html>`;
        await page.route('**/*', route => route.request().url() === origin
          ? route.fulfill({ contentType: 'text/html', body: html }) : route.abort());
        await page.goto(origin, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(550);
        metrics[label] = { startupQueries: await page.evaluate(() => profile.calls.query) };
        images[label] = {};
        paint[label] = {};
        for (const theme of ['dark', 'light']) {
          await page.evaluate(theme => {
            AuroraExt.state.settings.theme = theme;
            AuroraExt.rootFlags.apply();
            AuroraExt.glass.tagAll(document);
            AuroraExt.upgrade.applyUpgradeButtons();
          }, theme);
          await page.waitForTimeout(80);
          images[label][theme] = await page.screenshot({ path: path.join(out, `upgrade-${site}-${label}-${theme}.png`), animations: 'disabled' });
          paint[label][theme] = await page.evaluate(() => [...document.querySelectorAll('body *')]
            .filter(node => !node.closest('#cgpt-ambient-bg,#cgpt-qs-btn,#cgpt-qs-panel,script,style'))
            .map(node => {
              const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
              return [node.tagName, style.display, style.backgroundColor, style.borderColor, style.backdropFilter,
                style.boxShadow, style.borderRadius, bounds.x, bounds.y, bounds.width, bounds.height];
            }));
        }
        metrics[label].updates = await page.evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const calls = { ...profile.calls };
          const queryAll = Document.prototype.querySelectorAll;
          let fullUpgradeQueries = 0, callsToHide = 0, upgradeTime = 0;
          Document.prototype.querySelectorAll = function(selector) {
            if (/upgrade|upsell|__menu-item|stage-sidebar|rounded-full|role="menuitem"/.test(selector) || selector === 'button, a, div[role="button"], span') fullUpgradeQueries++;
            return queryAll.call(this, selector);
          };
          const A = AuroraExt;
          for (const name of ['tagElements', 'applyUpgradeButtons']) {
            const original = A.upgrade[name];
            A.upgrade[name] = (...args) => {
              const start = performance.now();
              if (name === 'applyUpgradeButtons') callsToHide++;
              const result = original(...args);
              upgradeTime += performance.now() - start;
              return result;
            };
          }
          const times = [];
          for (let index = 0; index < 12; index++) {
            const start = upgradeTime;
            const menu = document.createElement('div');
            menu.setAttribute('role', 'menu');
            menu.innerHTML = '<button role="menuitem">Native action</button>';
            document.querySelector('main').append(menu);
            await wait(190);
            times.push(upgradeTime - start);
            menu.remove();
            await wait(30);
          }
          Document.prototype.querySelectorAll = queryAll;
          return { fullUpgradeQueries, callsToHide, totalQueries: profile.calls.query - calls.query,
            upgradeTime, medianUpgradeTime: times.sort((a, b) => a - b)[6] };
        });
        metrics[label].guards = await page.evaluate(async site => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const change = (key, value) => {
            const previous = settings[key]; settings[key] = value;
            for (const listener of storageListeners) listener({ [key]: { oldValue: previous, newValue: value } }, 'sync');
          };
          const main = document.querySelector('main');
          const hidden = node => getComputedStyle(node).display === 'none';
          const button = document.createElement('button');
          button.append(document.createTextNode('Ordinary action'));
          main.append(button);
          await wait(220);
          button.firstChild.nodeValue = 'Upgrade';
          await wait(220);
          const changedLabelHidden = hidden(button);
          button.firstChild.nodeValue = 'Ordinary action';
          await wait(220);
          const changedLabelRestored = !hidden(button);
          button.firstChild.nodeValue = 'Upgrade';
          await wait(220);
          button.firstChild.nodeValue = '';
          await wait(220);
          const emptiedLabelRestored = !hidden(button);
          button.textContent = 'Upgrade';
          await wait(220);
          const addedLabelHidden = hidden(button);
          button.replaceChildren();
          await wait(220);
          const removedLabelRestored = !hidden(button);
          button.textContent = 'Ordinary action';
          button.setAttribute('aria-label', 'Upgrade');
          await wait(220);
          const ariaLabelHidden = hidden(button);
          button.removeAttribute('aria-label');
          await wait(220);
          const ariaLabelRestored = !hidden(button);
          button.title = 'Upgrade';
          await wait(220);
          const titleHidden = hidden(button);
          button.removeAttribute('title');
          await wait(220);
          const titleRestored = !hidden(button);
          button.textContent = 'Upgrade';
          await wait(220);
          const draft = document.querySelector('[contenteditable="true"],textarea');
          const draftText = draft.value ?? draft.textContent;
          change('hideUpgradeButtons', false);
          const settingRestored = !hidden(button);
          change('hideUpgradeButtons', true);
          await wait(60);
          const settingHidden = hidden(button);
          const legacyHidden = site !== 'chatgpt' || [...document.querySelectorAll('#legacy-probes [id^="legacy-"]')].every(hidden);
          change('extensionEnabled', false);
          const disabledRestored = !hidden(button) && !document.documentElement.classList.contains('cgpt-ambient-on');
          change('extensionEnabled', true);
          await wait(80);
          const enabledHidden = hidden(button) && document.documentElement.classList.contains('cgpt-ambient-on');
          const draftPreserved = draftText === (draft.value ?? draft.textContent);
          return { changedLabelHidden, changedLabelRestored, emptiedLabelRestored, addedLabelHidden, removedLabelRestored,
            ariaLabelHidden, ariaLabelRestored, titleHidden, titleRestored,
            settingRestored, settingHidden, legacyHidden, disabledRestored, enabledHidden, draftPreserved };
        }, site);
        metrics[label].errors = errors;
        await page.close();
      }
      const parity = {};
      fs.writeFileSync(path.join(out, `upgrade-${site}-paint.json`), JSON.stringify(paint));
      for (const theme of ['dark', 'light']) {
        parity[theme] = { pixelsChanged: pixelDifference(images.before[theme], images.after[theme]),
          samePaintAndGeometry: JSON.stringify(paint.before[theme]) === JSON.stringify(paint.after[theme]) };
        assert.equal(parity[theme].pixelsChanged, 0, `${site} ${theme} visual parity`);
        assert.equal(parity[theme].samePaintAndGeometry, true, `${site} ${theme} material parity`);
      }
      assert.deepEqual(metrics.after.errors, [], `${site} page errors`);
      for (const [guard, passed] of Object.entries(metrics.after.guards)) assert.equal(passed, true, `${site} ${guard}`);
      report.sites[site] = { metrics, parity };
      console.log(site, JSON.stringify(report.sites[site]));
    }
    fs.writeFileSync(path.join(out, 'upgrade-report.json'), JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
