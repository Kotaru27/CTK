import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:2560,height:1440}});
 await context.addInitScript(()=>(sessionStorage.setItem('forge_whatsnew_seen_session_2026_v1','1'),sessionStorage.setItem('forge_intro_seen_v4','1')));
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
  await page.waitForFunction(section=>document.getElementById(section)?.classList.contains('active'),section);
  console.log('FORGE_INTERNAL_ROUTE_SETTLE '+JSON.stringify({name,state:await page.evaluate(()=>({
    current:document.querySelector('.nav-sidebar .nav-item.active')?.id,
    route:document.documentElement.dataset.forgeRoute,
    travel:document.documentElement.dataset.forgeRouteTravel,
    running:document.documentElement.classList.contains('forge-route-running'),
    animations:document.getAnimations({subtree:true}).slice(0,8).map(a=>({
      state:a.playState,animation:a.animationName||'',duration:a.effect?.getTiming()?.duration}))
  }))}));
  await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'),null,{timeout:2800});
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
 // Measure the new persistent Storyboard mode indicator against the actual
 // buttons. No fixed geometry, and changing mode must not trigger a new
 // whole-screen View Transition or remove canvases.
 await page.evaluate(()=>UI.openTool('section-stills-boards','story'));
 await page.waitForTimeout(380);
 const markerResults=[];
 for(const [mode,buttonId] of [['story','subModeBtnBoard'],['filmstrip','subModeBtnFilmstrip'],['fit','subModeBtnFit'],['story','subModeBtnBoard']]){
   const routeBefore=await page.evaluate(()=>window.__internalViewTransitions);
   await page.evaluate(mode=>UI.switchStillsTab(mode),mode);
   await page.waitForTimeout(340);
   const m=await page.evaluate(id=>{
     const indicator=document.getElementById('forgeStoryModeIndicator');
     const active=document.getElementById(id);
     const i=indicator?.getBoundingClientRect(),b=active?.getBoundingClientRect();
     return {exists:!!i&&!!b,opacity:indicator?getComputedStyle(indicator).opacity:'0',
       inside:!!i&&!!b&&i.left>=b.left-2&&i.right<=b.right+2,
       width:i?.width||0,active:active?.classList.contains('active-mode')||false};
   },buttonId);
   markerResults.push({mode,...m});
   assert.ok(m.exists&&m.active&&m.inside&&m.width>10,mode+' indicator not aligned to active button '+JSON.stringify(m));
   assert.equal(await page.evaluate(()=>window.__internalViewTransitions),routeBefore,
     mode+' triggered an unnecessary whole-screen transition');
 }
 // Revisit the same Storyboard parent repeatedly. A hidden tab must
 // never cache zero-width geometry or keep an old opacity:0 marker.
 const revisits=[];
 for(let attempt=0;attempt<5;attempt++){
  await page.evaluate(()=>UI.openTool('section-pdf','split'));
  await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'));
  await page.evaluate(()=>UI.openTool('section-stills-boards','story'));
  await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'));
  await page.waitForTimeout(120);
  const m=await page.evaluate(()=>{
   const indicator=document.getElementById('forgeStoryModeIndicator');
   const button=document.getElementById('subModeBtnBoard');
   const a=indicator.getBoundingClientRect(),b=button.getBoundingClientRect();
   return {visible:parseFloat(getComputedStyle(indicator).opacity)>.95,
     width:a.width,inside:a.left>=b.left-2&&a.right<=b.right+2,
     selected:button.classList.contains('active-mode')};
  });
  revisits.push(m);
  assert.ok(m.visible&&m.width>10&&m.inside&&m.selected,
    'Storyboard mode marker disappeared on re-entry '+attempt+' '+JSON.stringify(m));
 }
 console.log('FORGE_STORY_REENTRY '+JSON.stringify(revisits));
 // Navigation is no longer one full-screen fade. Verify the coordinator
 // selects a specific animation for each user action, while the existing
 // tool state and active nav stay correct after the transition.
 await page.evaluate(()=>UI.showHome());
 await page.waitForFunction(()=>!document.getElementById('view-app').classList.contains('active'));
 await page.waitForTimeout(570);
 const openingMode=await page.evaluate(()=>{
   UI.openTool('section-stills-boards','story');
   return document.documentElement.dataset.forgeRouteTravel;
 });
 assert.equal(openingMode,'home','Opening from Home did not use the dedicated launch transition');
 await page.waitForFunction(()=>document.querySelector('#section-stills-boards.active .tool-header h2')?.textContent.trim()==='Storyboard');
 await page.waitForTimeout(560);
 const switchingMode=await page.evaluate(()=>{
   UI.openTool('section-adlinks','downloader');
   return document.documentElement.dataset.forgeRouteTravel;
 });
 assert.equal(switchingMode,'tool','Tool-to-tool navigation did not use stable-shell surface motion');
 await page.waitForFunction(()=>document.querySelector('#section-adlinks.active .tool-header h2')?.textContent.trim()==='Ad Downloader');
 await page.waitForTimeout(510);
 const returningMode=await page.evaluate(()=>{
   UI.showHome();
   return document.documentElement.dataset.forgeRouteTravel;
 });
 assert.equal(returningMode,'return','Returning home did not use dedicated reverse navigation');
 await page.waitForFunction(()=>!document.getElementById('view-app').classList.contains('active'));
 await page.waitForTimeout(520);
 assert.equal(await page.locator('.combined-home-grid > .home-card').count(),8,
   'Tool return replaced or obscured the original eight home cards');
 assert.deepEqual(errors,[],'Internal motion audit produced runtime errors');
 console.log('FORGE_TOOL_INTERNAL_MEASURED '+JSON.stringify(observedTabs));
 console.log('FORGE_TOOL_INTERNAL_MOTION '+JSON.stringify({record,tabs,errors}));
 await context.close();
}finally{await browser.close();}
