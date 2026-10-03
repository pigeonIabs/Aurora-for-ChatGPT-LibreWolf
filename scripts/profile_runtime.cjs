/* Reproducible, offline Firefox profiling of the four content-script adapters.
 * Development dependencies live in work/performance, outside the extension.
 */
const fs = require('node:fs');
const path = require('node:path');
const { firefox } = require('../work/performance/node_modules/playwright');
const { PNG } = require('../work/performance/node_modules/pngjs');
const root = path.resolve(__dirname, '..');
const before = path.resolve(root, process.env.AURORA_PROFILE_BEFORE || 'work/performance-before');
const out = path.resolve(root, process.env.AURORA_PROFILE_OUTPUT || 'work/performance');
fs.mkdirSync(out, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
function entryFor(base, origin) {
  const saved = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json')));
  return saved.content_scripts.find(entry => entry.matches[0].replace('*', '') === origin);
}
const defaults = { extensionEnabled: true, disabledSites: [], theme: 'dark', appearance: 'clear', glassIntensity: 100,
  backgroundBlur: '60', backgroundScaling: 'cover', customBgUrl: '__pure_black__', hasSeenWelcomeScreen: true,
  glassUserMessages: true, customFont: 'system', siteDefaultModels: {}, defaultModel: '', soundEnabled: false,
  hideQuickSettings: false, hideUpgradeButtons: false, queueWhileGenerating: false, dataMaskingEnabled: false };
const nativeCSS = `
  html,body { margin:0; color:#eee; background:#161616; font:16px Arial; }
  #root,#grok-app-root,chat-app { display:block; min-height:100vh; }
  aside,nav[aria-label],bard-sidenav { display:block; width:210px; position:fixed; inset:0 auto 0 0; background:#222; }
  main { margin-left:230px; padding:24px; }
  button { color:inherit; background:transparent; border:0; padding:10px; cursor:pointer; }
  .native-fill,.bg-token-main-surface-primary,.bg-token-bg-primary,.bg-bg-user-message,.bg-surface-l1,
  .query-bar,input-area-v2,.rounded-composer,[role=menu].painted { background:#282828; border-radius:16px; }
  .native-fill,pre,[role=menu] { padding:16px; margin:10px 0; }
  pre,.formatted-code-block-internal-container { background:#252525; border-radius:12px; padding:14px; }
  .composer { position:fixed; bottom:20px; left:240px; right:24px; padding:14px; }
  [contenteditable],textarea { color:inherit; display:block; min-height:30px; background:transparent; border:0; }
  .transparent { background:transparent; border:0; border-radius:18px; }
  .flat { border-radius:0; }
  .code-block { background:#242424; border-radius:12px; }
  a { display:block; padding:9px; color:inherit; }
`;
function fixture(site) {
  const nav = '<a href="/chat/1">Previous conversation</a>'.repeat(18);
  let composer, turn, shell;
  if (site === 'chatgpt') {
    composer = '<form data-chatgpt-composer class="composer"><div data-composer-dark data-composer-layout role="presentation" class="native-fill"><div contenteditable="true" data-composer-markdown>Draft preserved</div><button data-testid="send-button" class="native-fill">Send</button><button>Attachment</button></div></form>';
    turn = '<div data-message-author-role="assistant"><p>Example response</p><div class="code-block bg-token-main-surface-primary"><button aria-label="Copy">Copy</button><pre><code class="language-js">const answer = 42</code></pre></div></div>';
    shell = 'root';
  } else if (site === 'claude') {
    composer = '<div data-cds="ChatComposer" class="composer"><div class="rounded-composer native-fill"><div data-testid="chat-input" contenteditable="true" class="ProseMirror">Draft preserved</div><button data-testid="chat-input-send">Send</button></div><div data-cds="ChatComposerChin">Model</div></div>';
    turn = '<div class="bg-bg-user-message native-fill"><div data-testid="user-message">Example request</div></div><div data-testid="assistant-message"><p>Example response</p><pre><code>const answer = 42</code></pre></div>';
    shell = 'root';
  } else if (site === 'gemini') {
    composer = '<input-container class="composer"><input-area-v2 class="native-fill"><rich-textarea><div class="ql-editor" contenteditable="true">Draft preserved</div></rich-textarea><button data-test-id="send-button">Send</button></input-area-v2></input-container>';
    turn = '<user-query><div class="user-query-bubble-with-background native-fill">Example request</div></user-query><model-response><p>Example response</p><code-block><div class="formatted-code-block-internal-container"><pre><code>const answer = 42</code></pre></div></code-block></model-response>';
    shell = 'app-root';
  } else {
    composer = '<form class="composer"><div class="query-bar native-fill"><textarea>Draft preserved</textarea><button data-testid="chat-submit" class="bg-button-filled native-fill">Send</button><button class="transparent">Model</button></div></form>';
    turn = '<div data-message-author-role="user" class="message-bubble bg-surface-l1 native-fill">Example request</div><div class="prose"><p>Example response</p><pre><code>const answer = 42</code></pre></div>';
    shell = 'grok-app-root';
  }
  const wrappers = site === 'gemini' ? ['<chat-app><bard-sidenav>'+nav+'</bard-sidenav>', '</chat-app>'] : ['<aside aria-label="History">'+nav+'</aside>', ''];
  return `<div id="${shell}">${wrappers[0]}<main><h1>Aurora</h1><div id="conversation">${turn.repeat(24)}</div>
    <div role="menu" class="painted"><button role="menuitem">Native action</button></div>
    <div role="menu" class="transparent" id="transparent-hit-area"><button role="menuitem">Transparent action</button></div>
    <div role="status" id="native-status">Generating</div><div role="dialog" class="native-fill flat">Flat native fill</div>
    <button data-testid="upgrade-button">Upgrade</button></main>${composer}${wrappers[1]}</div>`;
}
function instrumentation() {
  window.profile = { started:performance.now(), firstGlass:null, firstBackground:null, dcl:null, settingsRequest:null,
    calls:{query:0, style:0, rect:0, setAttribute:0}, glassTime:0, glassCalls:0 };
  const p = window.profile;
  const count = (object, name, key) => {
    const original = object[name];
    object[name] = function(...args) { p.calls[key]++; return original.apply(this,args); };
  };
  for (const proto of [Document.prototype,Element.prototype]) {
    count(proto,'querySelectorAll','query'); count(proto,'querySelector','query');
  }
  count(Element.prototype,'getBoundingClientRect','rect');
  count(Element.prototype,'setAttribute','setAttribute');
  const originalStyle = window.getComputedStyle;
  window.getComputedStyle = (...args) => { p.calls.style++; return originalStyle(...args); };
  const sample = () => {
    if (p.firstGlass === null && document.documentElement?.classList.contains('cgpt-ambient-on')) p.firstGlass=performance.now()-p.started;
    if (p.firstBackground === null && document.querySelector('#cgpt-ambient-bg.bg-visible .pure-black-active')) p.firstBackground=performance.now()-p.started;
  };
  new MutationObserver(sample).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('DOMContentLoaded',() => { p.dcl=performance.now()-p.started; sample(); },{once:true});
}
const setup = `(${instrumentation.toString()})();
  window.settings = ${JSON.stringify(defaults)};
  window.storageListeners = [];
  const readStorage = (value,cb) => { if(cb) queueMicrotask(()=>cb(value)); return Promise.resolve(value); };
  window.chrome = {runtime:{id:'aurora-profile',getURL:p=>'/'+p,onMessage:{addListener:()=>{}},sendMessage:(r,cb)=>{
    profile.settingsRequest=performance.now()-profile.started; queueMicrotask(()=>cb({...settings})); }},
    storage:{sync:{get:(key,cb)=>readStorage({...settings},cb),set:value=>{Object.assign(settings,value);return Promise.resolve();}},
      local:{get:(key,cb)=>readStorage({},cb),set:()=>Promise.resolve()},onChanged:{addListener:fn=>storageListeners.push(fn)}},
    i18n:{getMessage:key=>key}};
`;
function source(base, entry) {
  return setup + entry.js.map(file => fs.readFileSync(path.join(base,file),'utf8')).join('\n') + `
    for (const name of ['tagFast','tagAll']) {
      const original = AuroraExt.glass[name];
      AuroraExt.glass[name] = (...args) => { const start=performance.now(); const value=original(...args);
        profile.glassTime+=performance.now()-start; profile.glassCalls++; return value; };
    }
  `;
}
async function inspect(page) {
  return page.evaluate(() => {
    const attrs = ['data-aurora-glass','data-aurora-code-block','data-aurora-surface','data-aurora-surface-edge','data-aurora-plane','data-aurora-history','data-aurora-avatar','data-aurora-content','data-aurora-upgrade'];
    return [...document.querySelectorAll('#root *,#app-root *,#grok-app-root *')].map((node,index)=> {
      const s=getComputedStyle(node), r=node.getBoundingClientRect();
      return {index, tags:attrs.filter(a=>node.hasAttribute(a)).map(a=>[a,node.getAttribute(a)]),
        paint:[s.backgroundColor,s.borderColor,s.boxShadow,s.backdropFilter,s.borderRadius],
        bounds:[r.x,r.y,r.width,r.height]};
    });
  });
}
function pixelDifference(a,b) {
  const first=PNG.sync.read(a), second=PNG.sync.read(b);
  let pixels=0;
  for(let i=0;i<first.data.length;i+=4) {
    if(first.data[i]!==second.data[i] || first.data[i+1]!==second.data[i+1] || first.data[i+2]!==second.data[i+2] || first.data[i+3]!==second.data[i+3]) pixels++;
  }
  return pixels;
}
async function main() {
  const browser = await firefox.launch({headless:true,firefoxUserPrefs:{'privacy.reduceTimerPrecision':false},executablePath:'C:/Users/Administrator/AppData/Local/ms-playwright/firefox-1539/firefox/firefox.exe'});
  const report = {engine:'Firefox',method:'Offline native-component fixtures, 24 turns, identical CSS and settings, 300 ms deferred host script',sites:{}};
  try {
    for (const entry of manifest.content_scripts) {
      const origin=entry.matches[0].replace('*','');
      const site=new URL(origin).hostname.split('.')[0];
      const images={}, states={};
      report.sites[site]={};
      for (const [label,base] of [['before',before],['after',root]]) {
        const currentEntry = entryFor(base, origin);
        const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
        const errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        const css=currentEntry.css.map(file=>fs.readFileSync(path.join(base,file),'utf8')).join('\n');
        const html=`<!doctype html><html data-theme="dark"><head><style>${nativeCSS}\n${css}</style><script>${source(base,currentEntry).replace(/<\/script/gi,'<\\/script')}</script><script defer src="/slow-host.js"></script></head><body>${fixture(site)}</body></html>`;
        await page.route('**/*',async route=> {
          if(route.request().url()===origin) await route.fulfill({contentType:'text/html',body:html});
          else if(route.request().url().endsWith('/slow-host.js')) {
            await new Promise(resolve=>setTimeout(resolve,300));
            await route.fulfill({contentType:'application/javascript',body:''});
          } else if(route.request().url().endsWith('/late.css')) {
            await route.fulfill({contentType:'text/css',body:'.late-paint { background:#242424; border-radius:12px; }'});
          } else await route.abort();
        });
        await page.goto(origin,{waitUntil:'domcontentloaded'});
        await page.waitForTimeout(1150);
        const startup=await page.evaluate(()=>({...profile,calls:{...profile.calls}}));
        const scans=await page.evaluate(()=> {
          const results=[];
          for(let i=0;i<7;i++) {
            const start=performance.now(); AuroraExt.glass.tagAll(document); results.push(performance.now()-start);
          }
          return results.sort((a,b)=>a-b)[3];
        });
        const retag=await page.evaluate(()=> {
          const times=[];
          for(let i=0;i<8;i++) {
            AuroraExt.state.settings.theme=i%2 ? 'dark' : 'light';
            AuroraExt.rootFlags.apply();
            const start=performance.now(); AuroraExt.glass.tagAll(document); times.push(performance.now()-start);
          }
          return times.sort((a,b)=>a-b)[4];
        });
        const focus=await page.evaluate(()=> {
          const p=profile, calls={...p.calls}, scans=p.glassCalls;
          for(let i=0;i<12;i++) window.dispatchEvent(new Event('focus'));
          return {glassScans:p.glassCalls-scans,queryCalls:p.calls.query-calls.query,styleReads:p.calls.style-calls.style};
        });
        await page.waitForTimeout(100);
        images[label]=await page.screenshot({path:path.join(out,`${site}-${label}.png`),animations:'disabled'});
        states[label]=await inspect(page);
        await page.evaluate(()=> {AuroraExt.state.settings.theme='light';AuroraExt.rootFlags.apply();AuroraExt.glass.tagAll(document);});
        await page.waitForTimeout(150);
        images[label+'Light']=await page.screenshot({path:path.join(out,`${site}-${label}-light.png`),animations:'disabled'});
        states[label+'Light']=await inspect(page);
        await page.evaluate(()=> {AuroraExt.state.settings.theme='dark';AuroraExt.rootFlags.apply();AuroraExt.glass.tagAll(document);});
        const guards=await page.evaluate(async ({markup})=> {
          const A=AuroraExt;
          const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
          const change=(key,value)=> {
            const previous=settings[key]; settings[key]=value;
            for(const fn of storageListeners) fn({[key]:{oldValue:previous,newValue:value}},'sync');
          };
          const draft=document.querySelector('[contenteditable="true"],textarea');
          const initial=draft?.value ?? draft?.textContent;
          change('extensionEnabled',false);
          const disabled=!document.documentElement.classList.contains('cgpt-ambient-on') && !document.querySelector('[data-aurora-glass],[data-aurora-surface]');
          change('extensionEnabled',true);
          await wait(80);
          const enabled=document.documentElement.classList.contains('cgpt-ambient-on') && !!document.getElementById('cgpt-ambient-bg');
          change('disabledSites',[A.site.id]);
          const siteDisabled=!document.documentElement.classList.contains('cgpt-ambient-on');
          change('disabledSites',[]);
          await wait(80);
          change('hideUpgradeButtons',true);
          const upgrade=document.querySelector('[data-testid="upgrade-button"]');
          await wait(40);
          const upgradeHidden=getComputedStyle(upgrade).display==='none';
          change('hideUpgradeButtons',false);
          const upgradeRestored=getComputedStyle(upgrade).display!=='none';
          const probe=document.createElement('div');
          probe.textContent='person@example.com'; document.querySelector('main').append(probe);
          change('dataMaskingEnabled',true);
          await wait(120);
          const masked=probe.textContent!=='person@example.com';
          change('dataMaskingEnabled',false);
          const maskingRestored=probe.textContent==='person@example.com';
          const draftPreserved=initial===(draft?.value ?? draft?.textContent);
          const body=document.createElement('body');body.innerHTML=markup;document.body.replaceWith(body);
          await wait(200);
          const hydrationRecovered=!!document.getElementById('cgpt-ambient-bg') && !!document.getElementById('cgpt-qs-btn') && !!document.querySelector('[data-aurora-glass],[data-aurora-surface]');
          let hidden=true;
          Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});
          document.dispatchEvent(new Event('visibilitychange'));
          const menu=document.createElement('div');menu.setAttribute('role','menu');menu.className='painted';
          if(A.site.id==='gemini') {
            const overlay=document.createElement('div');overlay.className='cdk-overlay-container';overlay.append(menu);document.body.append(overlay);
          } else document.querySelector('main').append(menu);
          await wait(40);hidden=false;document.dispatchEvent(new Event('visibilitychange'));await wait(80);
          const hiddenTabRecovered=menu.hasAttribute('data-aurora-glass') || menu.getAttribute('data-aurora-surface')==='menu';
          delete document.hidden;
          const originalPath=location.pathname;
          history.replaceState({},'',A.site.id==='chatgpt'?'/codex':'/settings/billing');
          await wait(100);
          const unsupportedRouteNative=!document.documentElement.classList.contains('cgpt-ambient-on');
          history.replaceState({},'',originalPath);await wait(120);
          const routeRestored=document.documentElement.classList.contains('cgpt-ambient-on');
          change('queueWhileGenerating',true);await wait(60);
          const queueDraftPreserved=A.dom.getComposerText(A.dom.findActiveComposer()).includes('Draft preserved');
          change('queueWhileGenerating',false);await wait(40);
          const queueDisabledCleanly=!document.getElementById('aurora-queue-panel') && !document.getElementById('aurora-queue-btn');
          const late=document.createElement('div');late.setAttribute('role','menu');late.className='late-paint';
          if(A.site.id==='gemini') {
            const overlay=document.createElement('div');overlay.className='cdk-overlay-container';overlay.append(late);document.body.append(overlay);
          } else document.querySelector('main').append(late);
          await wait(40);
          const link=document.createElement('link');link.rel='stylesheet';link.href='/late.css';document.head.append(link);
          await wait(100);
          const lateStylesQualified=late.hasAttribute('data-aurora-glass') || late.getAttribute('data-aurora-surface')==='menu';
          const manager=A.background.manager;
          const pending=manager.switchTo('https://example.invalid/pending.png');
          A.background.reset();await pending;
          const mediaCancelled=manager.state==='idle' && manager.abortController===null;
          await manager.switchTo('__pure_black__');
          const transition=manager.switchTo('__gpt5_animated__');
          A.background.reset();await transition;
          const transitionCancelled=manager.state==='idle' && manager.abortController===null;
          return {disabledCleanly:disabled,enabledAgain:enabled,siteDisabled,upgradeHidden,upgradeRestored,
            masked,maskingRestored,draftPreserved,hydrationRecovered,hiddenTabRecovered,unsupportedRouteNative,routeRestored,queueDraftPreserved,queueDisabledCleanly,lateStylesQualified,mediaCancelled,transitionCancelled};
        },{markup:fixture(site)});
        report.sites[site][label]={startup,medianFullScanMs:scans,medianThemeRetagMs:retag,focus,guards,errors};
        await page.close();
      }
      report.sites[site].parity={pixelDifference:pixelDifference(images.before,images.after),samePaintAndGeometry:JSON.stringify(states.before)===JSON.stringify(states.after),
        lightPixelDifference:pixelDifference(images.beforeLight,images.afterLight),sameLightPaintAndGeometry:JSON.stringify(states.beforeLight)===JSON.stringify(states.afterLight)};
      if(!report.sites[site].parity.samePaintAndGeometry) {
        fs.writeFileSync(path.join(out,`${site}-paint-before.json`),JSON.stringify(states.before,null,2));
        fs.writeFileSync(path.join(out,`${site}-paint-after.json`),JSON.stringify(states.after,null,2));
      }
      console.log(site,JSON.stringify(report.sites[site]));
    }
    report.nativeCaptures={};
    for (const [name,site,filename,url] of [
      ['gemini','gemini','gemini-native.html','https://gemini.google.com/app'],
      ['spark','gemini','spark-native.html','https://gemini.google.com/spark'],
      ['grok','grok','grok-prompt-native.html','https://grok.com/'],
    ]) {
      const entry=manifest.content_scripts.find(entry=>entry.matches[0].includes(site==='gemini'?'gemini.google.com':'grok.com'));
      const cssIndexPath=path.join(root,'work/performance/native-css/index.json');
      const cssIndex=fs.existsSync(cssIndexPath)?JSON.parse(fs.readFileSync(cssIndexPath,'utf8')):{};
      const native=fs.readFileSync(path.join(root,'work',filename),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<link\b[^>]*>/gi,tag=> {
        const href=tag.match(/href=["']([^"']+)["']/i)?.[1];
        const file=href && cssIndex[new URL(href,url).href];
        return file && /rel=["']stylesheet["']/i.test(tag) ? '<style>'+fs.readFileSync(path.join(root,file),'utf8')+'</style>' : tag;
      });
      const images={},states={},metrics={};
      for(const [label,base] of [['before',before],['after',root]]) {
        const currentEntry = entryFor(base, entry.matches[0].replace('*', ''));
        const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
        const errors=[];page.on('pageerror',error=>errors.push(error.message));
        const css=currentEntry.css.map(file=>fs.readFileSync(path.join(base,file),'utf8')).join('\n');
        const html=native.replace(/<\/head>/i,`<style>${css}</style><script>${source(base,currentEntry).replace(/<\/script/gi,'<\\/script')}</script></head>`);
        await page.route('**/*',async route=> {
          if(route.request().url()===url) await route.fulfill({contentType:'text/html',body:html});
          else await route.abort();
        });
        await page.goto(url,{waitUntil:'domcontentloaded'});
        await page.waitForTimeout(1400);
        metrics[label]=await page.evaluate(()=>({...profile,calls:{...profile.calls}}));
        metrics[label].errors=errors;
        images[label]=await page.screenshot({path:path.join(out,`${name}-native-${label}.png`),animations:'disabled'});
        states[label]=await page.evaluate(()=> {
          return [...document.querySelectorAll('body *')].filter(node=>!node.closest('#cgpt-ambient-bg,#cgpt-qs-btn,#cgpt-qs-panel,script,style')).map(node=> {
            const s=getComputedStyle(node),r=node.getBoundingClientRect();
            return [node.tagName,s.backgroundColor,s.borderColor,s.boxShadow,s.backdropFilter,s.borderRadius,s.color,s.fontFamily,s.fontSize,s.lineHeight,s.opacity,s.transform,r.x,r.y,r.width,r.height];
          });
        });
        await page.close();
      }
      const parity={pixelDifference:pixelDifference(images.before,images.after),samePaintAndGeometry:JSON.stringify(states.before)===JSON.stringify(states.after)};
      report.nativeCaptures[name]={metrics,parity};
      console.log(name+' native',JSON.stringify(report.nativeCaptures[name]));
    }
    fs.writeFileSync(path.join(out,'runtime-report.json'),JSON.stringify(report,null,2));
  } finally { await browser.close(); }
}
module.exports = { source, fixture, inspect, pixelDifference, nativeCSS, manifest, root, defaults };
if (require.main === module) main().catch(error=>{console.error(error);process.exitCode=1;});
