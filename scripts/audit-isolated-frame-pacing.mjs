/* Isolated frame-pacing probe for the real Forge navigation surfaces.
   This excludes image/PDF/video processing so we can distinguish motion
   jitter from heavy synthetic media tests. GitHub's virtual Chromium is
   not evidence of 100 Hz performance on a physical Windows display. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const output = [];
const scenarios = [
  {label:'home-to-logo', action:'open', section:'section-logo', mode:null, nav:'nav-logo'},
  {label:'logo-to-storyboard', action:'open', section:'section-stills-boards', mode:'story', nav:'nav-stills-story'},
  {label:'storyboard-to-home', action:'home', nav:null},
  {label:'home-to-ad-downloader', action:'open', section:'section-adlinks', mode:'downloader', nav:'nav-adlinks-dl'},
  {label:'ad-downloader-to-image-splitter', action:'open', section:'section-pdf', mode:'split', nav:'nav-pdf-split'}
];
function percentile(values,q){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return Math.round(sorted[Math.floor((sorted.length-1)*q)]*10)/10;
}
try{
  for(const viewport of [{width:1920,height:1080},{width:2560,height:1440}]){
    const context=await browser.newContext({viewport,reducedMotion:'no-preference'});
    await context.addInitScript(()=>{
      sessionStorage.setItem('forge_intro_suppress','1');
      sessionStorage.setItem('forge_whatsnew_seen_launch_2026_v2','1');
    });
    const page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof UI==='object' && !!window.ForgeWorkspaceRoute);
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(750);

    async function sample(action){
      const r=await page.evaluate(async ({action,section,mode})=>{
        const started=performance.now(), stamps=[];
        return await new Promise(resolve=>{
          function tick(t){
            stamps.push(t);
            if(t-started<850)requestAnimationFrame(tick);
            else {
              const gaps=stamps.slice(1).map((v,i)=>v-stamps[i]);
              resolve({count:stamps.length,gaps,firstFrameMs:stamps[0]-started,
                running:document.documentElement.classList.contains('forge-route-running'),
                homeVisible:!document.getElementById('view-home').classList.contains('hidden'),
                activeNav:document.querySelector('.nav-sidebar .nav-item.active')?.id||null,
                activeSections:document.querySelectorAll('#view-app .tool-section.active').length});
            }
          }
          requestAnimationFrame(tick);
          if(action==='home')document.querySelector('.header .brand-title').click();
          else if(action==='open')UI.openTool(section,mode);
        });
      },action);
      const {gaps,...state}=r;
      return {...state,p50GapMs:percentile(gaps,.5),p95GapMs:percentile(gaps,.95),
        maxGapMs:gaps.length?Math.round(Math.max(...gaps)*10)/10:0,
        over33ms:gaps.filter(v=>v>33.4).length};
    }
    const idle=await sample({action:'none'});
    assert.ok(idle.count>=12,'Idle frame sampler did not run');
    const cases=[];
    for(const scenario of scenarios){
      const reading=await sample(scenario);
      assert.ok(reading.count>=12,scenario.label+': insufficient animation frames');
      assert.ok(reading.p95GapMs<=120,
        scenario.label+': severe isolated rAF stalls '+JSON.stringify(reading));
      assert.ok(reading.maxGapMs<=350,
        scenario.label+': main thread remained blocked '+JSON.stringify(reading));
      assert.equal(reading.running,false,scenario.label+': transition never settled');
      assert.equal(reading.homeVisible,scenario.action==='home',scenario.label+': wrong surface');
      if(scenario.action==='open'){
        assert.equal(reading.activeNav,scenario.nav,scenario.label+': wrong tool selected');
        assert.equal(reading.activeSections,1,scenario.label+': multiple tool workspaces');
      }
      cases.push({scenario:scenario.label,...reading});
    }
    assert.deepEqual(errors,[],'Isolated animation audit triggered runtime errors');
    output.push({viewport,idle,cases,errors});
    await context.close();
  }
  console.log('FORGE_ISOLATED_FRAME_PACING '+JSON.stringify({
    caveat:'Headless CI rAF instrumentation, not a 60Hz or 100Hz physical-monitor guarantee',
    results:output
  }));
}finally{await browser.close();}
