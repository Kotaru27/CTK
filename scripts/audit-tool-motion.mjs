import {chromium} from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('artifacts/tool-motion',{recursive:true});

const tools=[
  {key:'logo-resizer',section:'section-logo',mode:'',card:0},
  {key:'pdf-to-image',section:'section-pdf',mode:'convert',card:1},
  {key:'image-splitter',section:'section-pdf',mode:'split',card:2},
  {key:'video-stills',section:'section-stills-boards',mode:'video',card:3},
  {key:'storyboard',section:'section-stills-boards',mode:'story',card:4},
  {key:'link-gen',section:'section-adlinks',mode:'gen',card:5},
  {key:'ad-downloader',section:'section-adlinks',mode:'downloader',card:6},
  {key:'video-downloads',section:'section-yt-helper',mode:'',card:7}
];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const records=[];

try {
 for(const viewport of [
   {width:1440,height:900},
   {width:2560,height:1440}
 ]) {
  const context=await browser.newContext({viewport,reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
    sessionStorage.setItem('forge_intro_suppress','1');
    sessionStorage.setItem('forge_whatsnew_suppress','1');
    window.__auditEvents=[];
    window.__routeCount=0;
    document.addEventListener('animationstart',e=>window.__auditEvents.push({
      at:performance.now(),kind:'animationstart',name:e.animationName,
      tag:e.target.tagName,id:e.target.id,cls:typeof e.target.className==='string'?e.target.className.slice(0,105):''
    }),true);
    document.addEventListener('transitionrun',e=>window.__auditEvents.push({
      at:performance.now(),kind:'transitionrun',name:e.propertyName,
      tag:e.target.tagName,id:e.target.id,cls:typeof e.target.className==='string'?e.target.className.slice(0,105):''
    }),true);
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>typeof UI==='object'&&!!window.ForgeVideoRoute,{timeout:10000});
  for(const t of tools) {
    // Reset route event ledger and observe actual DOM activation latency.
    await page.evaluate(()=> {
      window.__auditEvents=[];
      window.__routeStart=performance.now();
      window.__routeActivated=null;
      window.__observer?.disconnect();
      window.__observer=new MutationObserver(()=>{
        if(window.__routeActivated!==null)return;
        if(document.getElementById('view-app').classList.contains('active')){
          window.__routeActivated=performance.now()-window.__routeStart;
        }
      });
      window.__observer.observe(document.getElementById('view-app'),{attributes:true,attributeFilter:['class']});
    });
    const card=page.locator('button.home-card').nth(t.card);
    await card.click();
    await page.waitForFunction(section=>{
      return document.querySelector('#view-app.active') &&
        document.getElementById(section)?.classList.contains('active');
    },t.section,{timeout:8500});
    const enter=await page.evaluate((t)=>{
      const section=document.getElementById(t.section);
      const hdr=section?.querySelector('.tool-header h2');
      const all=section?[...section.querySelectorAll('button')]:[];
      const visible=el=>{
        const s=getComputedStyle(el),r=el.getBoundingClientRect();
        return s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0;
      };
      const active=[...document.getAnimations({subtree:true})].filter(x=>x.playState==='running')
        .slice(0,20).map(a=>({
          name:a.animationName||'unnamed',
          target:a.effect?.target?.id||a.effect?.target?.className||'',
          duration:a.effect?.getTiming()?.duration,
          easing:a.effect?.getTiming()?.easing
        }));
      return {tool:t.key,
        mode:t.mode,
        activatedMs:window.__routeActivated,
        heading:hdr?.textContent?.trim(),
        sectionVisible:visible(section),
        workspaceClass:section?.className,
        activeAnimations:active,
        navSelected:[...document.querySelectorAll('.nav-sidebar .nav-item.active')].map(x=>x.id),
        visibleButtonCount:all.filter(visible).length,
        visibleButtonLabels:all.filter(visible).slice(0,16).map(x=>x.textContent.trim().replace(/\s+/g,' ').slice(0,72)),
        overflow:document.documentElement.scrollWidth>innerWidth+2,
        header:getComputedStyle(document.querySelector('.header')).backgroundColor
      };
    },t);
    await page.waitForTimeout(480);
    const events=await page.evaluate(()=>window.__auditEvents.slice(0,90).map(({at,...other})=>({
      atMs:Math.round(at-window.__routeStart),...other
    })));
    // Screen evidence after motion completion.
    await page.screenshot({path:'artifacts/tool-motion/'+t.key+'-'+viewport.width+'.jpg',
      type:'jpeg',quality:71,fullPage:false,animations:'disabled'});
    await page.evaluate(()=>{
      window.__auditEvents=[];
      window.__routeStart=performance.now();
    });
    await page.locator('.header .brand-title').click();
    await page.waitForFunction(()=>!document.getElementById('view-home').classList.contains('hidden'),{timeout:7500});
    await page.waitForTimeout(430);
    const back=await page.evaluate(()=>({
      activeTool:document.querySelectorAll('.tool-section.active').length,
      visibleCards:document.querySelectorAll('#homeContent button.home-card').length,
      routeRunning:document.documentElement.classList.contains('forge-video-route-running'),
      events:window.__auditEvents.slice(0,40).map(({at,...rest})=>({
        atMs:Math.round(at-window.__routeStart),...rest
      }))
    }));
    records.push({viewport:viewport.width,...enter,events,back});
  }
  await context.close();
  console.log('FORGE_TOOL_MOTION_ERRORS_'+viewport.width+' '+JSON.stringify(errors));
 }
 console.log('FORGE_TOOL_MOTION_REPORT '+JSON.stringify(records));
 fs.writeFileSync('artifacts/tool-motion/report.json',JSON.stringify(records,null,2));
} finally { await browser.close(); }
