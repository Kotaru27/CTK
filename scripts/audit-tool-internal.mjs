import {chromium} from 'playwright';
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
 console.log('FORGE_TOOL_INTERNAL_MOTION '+JSON.stringify({record,tabs,errors}));
 await context.close();
}finally{await browser.close();}
