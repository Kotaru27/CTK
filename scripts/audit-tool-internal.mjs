import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:2560,height:1440}});
 await context.addInitScript(()=>sessionStorage.setItem('forge_intro_seen_v4','1'));
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof UI==='object'&&!!window.ForgeWorkspaceRoute);
 await page.locator('.home-card.tool-logo').click();
 await page.waitForFunction(()=>document.getElementById('view-app').classList.contains('active'));
 await page.waitForTimeout(550);
 await page.evaluate(()=>{
  window.__internalViewTransitions=0;
  const native=document.startViewTransition?.bind(document);
  if(native)document.startViewTransition=function(fn){
    window.__internalViewTransitions++;
    return native(fn);
  };
  window.__internalMotion=[];
  document.addEventListener('animationstart',e=>{
    window.__internalMotion.push({type:'animation',name:e.animationName,target:e.target.id||e.target.className});
  },true);
 });
 const cases=[
  ['logo-resizer','section-logo',null],
  ['pdf-to-image','section-pdf','convert'],
  ['image-splitter','section-pdf','split'],
  ['video-stills','section-stills-boards','video'],
  ['storyboard','section-stills-boards','story'],
  ['link-gen','section-adlinks','gen'],
  ['ad-downloader','section-adlinks','downloader'],
  ['video-downloads','section-yt-helper',null]
 ];
 const record=[];
 for(const [label,id,mode]of cases){
  const info=await page.evaluate(({id,mode,label})=>{
    window.__internalMotion=[];
    const start=performance.now();
    UI.openTool(id,mode);
    const content=document.querySelector('#'+id+' .tool-header h2');
    return {label,at:Math.round(performance.now()-start),
      heading:content?.textContent.trim(),nativeTransitions:window.__internalViewTransitions,
      activeSections:document.querySelectorAll('.tool-section.active').length,
      routeClass:document.documentElement.classList.contains('forge-route-running')};
  },{id,mode,label});
  await page.waitForTimeout(100);
  info.events=await page.evaluate(()=>window.__internalMotion.slice(0,25));
  record.push(info);
 }
 const tabs=await page.evaluate(()=>{
  const run=(name,fn)=>{
    window.__internalMotion=[];
    const t=performance.now();fn();
    return {name,latencyMs:Math.round(performance.now()-t),
      nativeTransitions:window.__internalViewTransitions,
      animations:[...document.getAnimations({subtree:true})].filter(x=>x.playState==='running').slice(0,6).map(x=>x.animationName||'CSS/WAAPI')};
  };
  const out=[];
  UI.openTool('section-pdf','convert');
  out.push(run('pdf convert->split',()=>UI.switchPdfTab('split')));
  out.push(run('pdf split->convert',()=>UI.switchPdfTab('convert')));
  UI.openTool('section-stills-boards','story');
  out.push(run('storyboard->filmstrip',()=>UI.switchStillsTab('filmstrip')));
  out.push(run('filmstrip->storyboard',()=>UI.switchStillsTab('story')));
  UI.openTool('section-adlinks','gen');
  out.push(run('link gen->downloader',()=>UI.switchAdlinksTab('downloader')));
  out.push(run('downloader->link gen',()=>UI.switchAdlinksTab('gen')));
  return out;
 });
 // The original synchronous tab ledger cannot see MutationObserver microtasks.
 // Exercise each tab independently and measure the actual running WAAPI effect.
 const observedTabs=[];
 const modeCases=[
  ['PDF convert → split','section-pdf','convert','switchPdfTab','split','pdfTabContentSplit'],
  ['PDF split → convert','section-pdf','split','switchPdfTab','convert','pdfTabContentConvert'],
  ['Storyboard → Filmstrip','section-stills-boards','story','switchStillsTab','filmstrip','stillsTabContentFilmstrip'],
  ['Filmstrip → Storyboard','section-stills-boards','filmstrip','switchStillsTab','story','stillsTabContentStory'],
  ['Link Gen → Ad Downloader','section-adlinks','gen','switchAdlinksTab','downloader','adlinksTabContentDownloader'],
  ['Ad Downloader → Link Gen','section-adlinks','downloader','switchAdlinksTab','gen','adlinksTabContentGen']
 ];
 for(const [name,section,mode,method,destination,panel] of modeCases){
  await page.evaluate(({section,mode})=>UI.openTool(section,mode),{section,mode});
  await page.waitForTimeout(260);
  await page.evaluate(({method,destination})=>UI[method](destination),{method,destination});
  await page.waitForTimeout(40);
  const measurement=await page.evaluate(panel=>{
   const element=document.getElementById(panel);
   const active=document.getAnimations({subtree:true}).filter(animation=>
     animation.playState==='running' && animation.effect?.target===element);
   return {panel,visible:!!element&&getComputedStyle(element).display!=='none',
     motionCount:active.length,durations:active.map(a=>a.effect.getTiming().duration)};
  },panel);
  observedTabs.push({name,...measurement});
  assert.ok(measurement.visible,name+' target not visible');
  assert.ok(measurement.motionCount>0,name+' has no internal panel transition');
 }
 assert.deepEqual(errors,[],'Internal motion audit produced runtime errors');
 console.log('FORGE_TOOL_INTERNAL_MEASURED '+JSON.stringify(observedTabs));
 console.log('FORGE_TOOL_INTERNAL_MOTION '+JSON.stringify({record,tabs,errors}));
 await context.close();
}finally{await browser.close();}
