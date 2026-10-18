/* Browser-only A/B diagnostic. CSS overrides never ship to users.
   Compare native full-root snapshots, surface-only snapshots and instant
   fallback on the same QHD synthetic-empty workspaces. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
const variants=[
 {name:'baseline',css:''},
 {name:'no-root-snapshot',css:'html.forge-route-running{view-transition-name:none!important}'},
 {name:'no-root-or-shell-snapshot',
  css:'html.forge-route-running{view-transition-name:none!important} html.forge-route-running .header,html.forge-route-running .nav-sidebar.visible{view-transition-name:none!important}'},
 {name:'instant-fallback',disableNative:true,css:''}
];
function summarize(gaps){
 const sorted=[...gaps].sort((a,b)=>a-b);
 const p=q=>sorted.length?Math.round(sorted[Math.floor((sorted.length-1)*q)]*10)/10:0;
 return {frames:gaps.length+1,p50:p(.50),p95:p(.95),
  max:p(1),over33:gaps.filter(g=>g>33.4).length};
}
try{
 for(const variant of variants){
  const context=await browser.newContext({viewport:{width:2560,height:1440},reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
   sessionStorage.setItem('forge_intro_suppress','1');
   sessionStorage.setItem('forge_whatsnew_seen_launch_2026_v2','1');
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof UI==='object' && !!window.ForgeWorkspaceRoute);
  await page.evaluate(()=>document.fonts.ready);
  if(variant.css)await page.addStyleTag({content:variant.css});
  if(variant.disableNative)await page.evaluate(()=>{document.startViewTransition=undefined;});
  await page.waitForTimeout(700);
  const data=[];
  for(let i=0;i<2;i++){
   const scenarios=[
    {name:'logo-to-storyboard',prepare:{id:'section-logo',mode:null},target:{id:'section-stills-boards',mode:'story'}},
    {name:'storyboard-to-ad-downloader',prepare:{id:'section-stills-boards',mode:'story'},target:{id:'section-adlinks',mode:'downloader'}},
    {name:'ad-downloader-to-logo',prepare:{id:'section-adlinks',mode:'downloader'},target:{id:'section-logo',mode:null}}
   ];
   for(const x of scenarios){
    await page.evaluate(({id,mode})=>UI.openTool(id,mode),x.prepare);
    await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'));
    await page.waitForTimeout(350);
    const sample=await page.evaluate(async ({id,mode})=>{
     const begun=performance.now(),times=[];
     return await new Promise(resolve=>{
      function frame(t){
       times.push(t);
       if(t-begun<780)requestAnimationFrame(frame);
       else resolve({
        gaps:times.slice(1).map((v,i)=>v-times[i]),
        running:document.documentElement.classList.contains('forge-route-running'),
        active:document.querySelector('#view-app .tool-section.active .tool-header h2')?.textContent?.trim()
       });
      }
      requestAnimationFrame(frame);
      UI.openTool(id,mode);
     });
    },x.target);
    assert.equal(sample.running,false,'Navigation stuck: '+variant.name+' '+x.name);
    assert.ok(sample.gaps.length>=8,'Browser not rendering enough frames');
    data.push({iteration:i,name:x.name,...summarize(sample.gaps)});
   }
  }
  assert.deepEqual(errors,[],'Unexpected runtime errors in '+variant.name);
  results.push({name:variant.name,measurements:data});
  await context.close();
 }
 console.log('FORGE_MOTION_STRATEGIES '+JSON.stringify({
  note:'A/B headless browser diagnostic; CSS variants were injected only into QA',
  variants:results
 }));
}finally{await browser.close();}
