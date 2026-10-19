import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:2560,height:1440}});
 await context.addInitScript(()=>(sessionStorage.setItem('forge_whatsnew_suppress','1'),sessionStorage.setItem('forge_intro_suppress','1')));
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
 // Do not race the browser's asynchronous View Transition. The Storyboard
 // marker should be judged only while its actual workspace is visible.
 await page.waitForFunction(()=>document.getElementById('section-stills-boards')?.classList.contains('active') &&
   !document.documentElement.classList.contains('forge-route-running'),null,{timeout:6500});
 await page.waitForTimeout(70);
 const markerResults=[];
 for(const [mode,buttonId] of [['story','subModeBtnBoard'],['filmstrip','subModeBtnFilmstrip'],['fit','subModeBtnFit'],['story','subModeBtnBoard']]){
   const routeBefore=await page.evaluate(()=>window.__internalViewTransitions);
   await page.evaluate(mode=>UI.switchStillsTab(mode),mode);
   await page.waitForTimeout(340);
   const m=await page.evaluate(id=>{
     const indicator=document.getElementById('forgeStoryModeIndicator');
     const active=document.getElementById(id);
     const i=indicator?.getBoundingClientRect(),b=active?.getBoundingClientRect();
     const host=document.getElementById('storySubModeToggle');
     const section=document.getElementById('section-stills-boards');
     const storyPanel=document.getElementById('stillsTabContentStory');
     return {exists:!!i&&!!b,opacity:indicator?getComputedStyle(indicator).opacity:'0',
       inside:!!i&&!!b&&i.left>=b.left-2&&i.right<=b.right+2,
       width:i?.width||0,active:active?.classList.contains('active-mode')||false,
       hostDisplay:host&&getComputedStyle(host).display,hostInline:host?.style.display,
       hostRects:host?.getClientRects().length,hostWidth:host?.getBoundingClientRect().width,
       buttonWidth:active?.getBoundingClientRect().width,
       sectionActive:section?.classList.contains('active'),
       sectionDisplay:section&&getComputedStyle(section).display,
       storyPanelDisplay:storyPanel&&getComputedStyle(storyPanel).display,
       routeRunning:document.documentElement.classList.contains('forge-route-running')
     };
   },buttonId);
   markerResults.push({mode,...m});
   assert.ok(m.exists&&m.active&&m.inside&&m.width>10,mode+' indicator not aligned to active button '+JSON.stringify(m));
   assert.equal(await page.evaluate(()=>window.__internalViewTransitions),routeBefore,
     mode+' triggered an unnecessary whole-screen transition');
 }
 // Reopen the Storyboard after genuinely hiding its containing tool panel.
 // The indicator must not reuse an invisible stale geometry on re-entry.
 const reentry=[];
 for(let attempt=0;attempt<3;attempt++){
   await page.evaluate(()=>UI.openTool('section-adlinks','gen'));
   await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'));
   await page.evaluate(()=>UI.openTool('section-stills-boards','story'));
   await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'));
   await page.waitForTimeout(390);
   const visible=await page.evaluate(()=>{
     const host=document.getElementById('storySubModeToggle');
     const mark=document.getElementById('forgeStoryModeIndicator');
     const selected=document.querySelector('#storySubModeToggle .active-mode');
     const box=mark?.getBoundingClientRect(),ref=selected?.getBoundingClientRect();
     return {hostVisible:!!host?.getClientRects().length,
       opacity:getComputedStyle(mark).opacity,
       width:box?.width||0,
       inside:!!box&&!!ref&&box.left>=ref.left-2&&box.right<=ref.right+2};
   });
   reentry.push(visible);
   assert.ok(visible.hostVisible&&visible.opacity!=='0'&&visible.width>10&&visible.inside,
     'Storyboard mode marker not restored after tool re-entry '+JSON.stringify({attempt,visible}));
 }
 console.log('FORGE_STORYBOARD_INDICATOR_REENTRY '+JSON.stringify(reentry));
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
 // A section can retain its "active" class while its entire view is
 // hidden on Home. Wait for the actual workspace, active nav and completed
 // native snapshot: otherwise a stale Storyboard heading creates a false
 // tool-to-tool routing failure on slower QHD CI machines.
 await page.waitForFunction(()=>
   document.getElementById('view-app').classList.contains('active') &&
   document.querySelector('#section-stills-boards.active .tool-header h2')?.textContent.trim()==='Storyboard' &&
   document.getElementById('nav-stills-story').classList.contains('active')
 ,null,{timeout:6000});
 await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'),null,{timeout:6000});
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
