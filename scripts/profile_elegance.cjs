// Controlled Firefox timings for the current checkout versus a saved working tree.
// This is development tooling, excluded from the extension package.
const fs = require('node:fs');
const path = require('node:path');
const { firefox } = require('../work/performance/node_modules/playwright');
const { source, fixture, nativeCSS, root } = require('./profile_runtime.cjs');
const before = path.join(root, 'work/elegance-before-20261001');
const output = path.join(root, 'work/elegance-performance');
const manifest = base => JSON.parse(fs.readFileSync(path.join(base, 'manifest.json')));
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function measure(browser, base, site, turns) {
  const entry = manifest(base).content_scripts.find(entry => entry.matches[0].includes(site));
  const origin = entry.matches[0].replace('*', '');
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let markup = fixture(site);
  if (turns > 24) markup = markup.replace(/(<div id="conversation">)([\s\S]*?)(<\/div>\s*<div role="menu")/,
    (_, open, turnsMarkup, close) => open + turnsMarkup.repeat(turns / 24) + close);
  const css = entry.css.map(file => fs.readFileSync(path.join(base, file), 'utf8')).join('\n');
  const ready = `
    window.ready = {};
    const sampleReady = () => {
      const background = document.getElementById('cgpt-ambient-bg');
      if (background && getComputedStyle(background).opacity >= 0.999) {
        ready.background = performance.now() - profile.started;
      } else requestAnimationFrame(sampleReady);
    };
    requestAnimationFrame(sampleReady);
  `;
  const html = `<!doctype html><html data-theme="dark"><head><style>${nativeCSS}\n${css}</style><script>${(source(base, entry) + ready).replace(/<\/script/gi, '<\\/script')}</script></head><body>${markup}</body></html>`;
  await page.route('**/*', route => route.request().url() === origin
    ? route.fulfill({ contentType: 'text/html', body: html }) : route.abort());
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => ready.background !== undefined);
  const startup = await page.evaluate(() => ({ backgroundReadyMs: ready.background,
    glassWorkMs: profile.glassTime, glassCalls: profile.glassCalls, calls: { ...profile.calls } }));
  const scans = await page.evaluate(() => {
    const times = [];
    for (let index = 0; index < 13; index++) {
      const start = performance.now();
      AuroraExt.glass.tagAll(document);
      times.push(performance.now() - start);
    }
    return times.slice(3);
  });
  const streaming = await page.evaluate(() => {
    const text = document.querySelector('[data-message-author-role="assistant"] p, [data-testid="assistant-message"] p, model-response p, .prose p').firstChild;
    const mutation = { type: 'characterData', target: text, addedNodes: [], removedNodes: [] };
    const times = [];
    const original = AuroraExt.upgrade.changedOwner;
    let ownerChecks = 0;
    AuroraExt.upgrade.changedOwner = node => { ownerChecks++; return original(node); };
    for (let index = 0; index < 7; index++) {
      const start = performance.now();
      for (let update = 0; update < 1000; update++) AuroraExt.centralObserver.handleMutations([mutation]);
      times.push(performance.now() - start);
    }
    AuroraExt.upgrade.changedOwner = original;
    return { times: times.slice(2), ownerChecksPer1000Updates: ownerChecks / 7 };
  });
  await page.close();
  if (errors.length) throw new Error(errors.join('\n'));
  return { ...startup, scanMs: median(scans), streamingBatchMs: median(streaming.times),
    ownerChecksPer1000Updates: streaming.ownerChecksPer1000Updates };
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await firefox.launch({ headless: true,
    firefoxUserPrefs: { 'privacy.reduceTimerPrecision': false },
    executablePath: 'C:/Users/Administrator/AppData/Local/ms-playwright/firefox-1539/firefox/firefox.exe' });
  const selectedSite = process.argv[process.argv.indexOf('--site') + 1];
  const filter = process.argv.includes('--site') ? selectedSite : null;
  const reportPath = path.join(output, 'timings.json');
  const report = filter && fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath)) : { engine: 'Firefox', repetitions: 5, baseline: before,
    method: 'Alternating fresh offline pages with 24 and 240 turns. Full background opacity, glass CPU time, repeated scans, and batches of 1000 streaming mutation notifications.', sites: {} };
  try {
    for (const site of ['chatgpt', 'claude', 'gemini', 'grok']) {
      if (filter && filter !== site) continue;
      report.sites[site] = {};
      for (const turns of [24, 240]) {
        const samples = { before: [], after: [] };
        for (let index = 0; index < report.repetitions; index++) {
          const variants = index % 2 ? [['after', root], ['before', before]] : [['before', before], ['after', root]];
          for (const [label, base] of variants) samples[label].push(await measure(browser, base, site, turns));
        }
        const summary = {};
        for (const [label, values] of Object.entries(samples)) {
          summary[label] = Object.fromEntries(['backgroundReadyMs', 'glassWorkMs', 'scanMs', 'streamingBatchMs', 'ownerChecksPer1000Updates']
            .map(key => [key, Number(median(values.map(value => value[key])).toFixed(2))]));
        }
        report.sites[site][turns] = { summary, samples };
        console.log(site, turns, JSON.stringify(summary));
        fs.writeFileSync(path.join(output, 'timings.json'), JSON.stringify(report, null, 2));
      }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
