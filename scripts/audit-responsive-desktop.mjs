import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='artifacts/desktop-responsive';
fs.mkdirSync(out,{recursive:true});
const tools=[
  ['logo-resizer','section-logo',null],
  ['pdf-to-image','section-pdf','convert'],
  ['image-splitter','section-pdf','split'],
  ['video-stills','section-stills-boards','video'],
  ['storyboard','section-stills-boards','story'],
  ['link-gen','section-adlinks','gen'],
  ['ad-downloader','section-adlinks','downloader'],
  ['video-downloads','section-yt-helper',null],
];
const sizes=[
  ['laptop-1366',1366,768],
  ['fullhd-1920',1920,1080],
  ['scaled-fullhd-1280',1280,720], // 1920px physical monitor at 150% scaling
  ['qhd-2560',2560,1440],
];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const records=[];
try{
  for(const [label,width,height] of sizes){
    const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'});
    await ctx.addInitScript(()=>sessionStorage.setItem('forge_intro_seen_v4','1'));
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>typeof UI==='object'&&!!window.ForgeWorkspaceRoute,{timeout:12000});
    await page.evaluate(()=>document.fonts.ready);
    assert.ok(await page.locator('link[href*="forge-adaptive-desktop.css"]').count(),'Adaptive CSS missing from GitHub Pages');
    await page.screenshot({path:`${out}/home-${label}.jpg`,type:'jpeg',quality:75});
    for(const [name,id,mode]of tools){
      await page.evaluate(({id,mode})=>UI.openTool(id,mode),{id,mode});
      await page.waitForTimeout(580); // settle native home route & internal WAAPI
      const result=await page.evaluate(({name,id,mode})=>{
        const section=document.getElementById(id);
        const box=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
        const active=document.querySelectorAll('.tool-section.active');
        const header=section?.querySelector('.tool-header');
        const sidebar=name==='logo-resizer'?section.querySelector('.editor-layout>.sidebar-panel'):
          name==='pdf-to-image'?section.querySelector('.pdf-setup-panel'):
          name==='link-gen'?section.querySelector('.adgen-studio-input'):
          name==='video-downloads'?section.querySelector('.yt-studio-input'):null;
        const editor=name==='logo-resizer'?section.querySelector('#logoGrid'):
          name==='pdf-to-image'?section.querySelector('.pdf-output-column'):
          name==='video-stills'?section.querySelector('.vs-collection-body'):
          name==='storyboard'?section.querySelector('#storyPreview'):
          name==='image-splitter'?section.querySelector('.split-studio-canvas'):
          name==='ad-downloader'?section.querySelector('#adDlEmptyState'):
          name==='link-gen'?section.querySelector('.adgen-studio-results'):
          name==='video-downloads'?section.querySelector('.yt-studio-results'):null;
        return {name,mode,active:active.length,section:box(section),header:box(header),
          rail:box(sidebar),work:box(editor),
          emptyHeight:name==='logo-resizer'?Math.round(section.querySelector('#logoEmpty')?.getBoundingClientRect().height||0):null,
          logoLayoutHeight:name==='logo-resizer'?Math.round(section.querySelector('#logoEmpty .logo-empty-layout')?.getBoundingClientRect().height||0):null,
          scrollExcess:Math.round(document.documentElement.scrollWidth-innerWidth)};
      },{name,id,mode});
      assert.equal(result.active,1,`${label} ${name}: unexpected active sections`);
      assert.ok(result.header?.w>180&&result.header.h>=45,`${label} ${name}: header missing`);
      assert.ok(result.header.x>=-3&&result.header.x+result.header.w<=width+4,`${label} ${name}: header clipped horizontally`);
      if(result.rail && ['logo-resizer','pdf-to-image','link-gen','video-downloads'].includes(name)){
        assert.ok(result.rail.w>=245&&result.rail.w<=415,`${label} ${name}: rail width ${result.rail.w} out of bounds`);
      }
      if(name==='logo-resizer')assert.ok(Math.abs(result.logoLayoutHeight-result.emptyHeight)<=3,
        `${label}: Logo welcome artwork leaves a blank band (${result.logoLayoutHeight} / ${result.emptyHeight})`);
      if(result.work)assert.ok(result.work.w>180,`${label} ${name}: usable workspace too narrow`);
      if(result.scrollExcess>16)console.log('WARNING_DOC_HORIZONTAL_OVERFLOW',label,name,result.scrollExcess);
      await page.screenshot({path:`${out}/${name}-${label}.jpg`,type:'jpeg',quality:75});
      records.push({viewport:label,...result});
    }
    assert.deepEqual(errors,[],`${label}: uncaught browser exceptions`);
    await ctx.close();
  }
  const logo=records.filter(x=>x.name==='logo-resizer');
  const byLabel=label=>logo.find(x=>x.viewport===label);
  assert.ok(byLabel('qhd-2560').emptyHeight>byLabel('fullhd-1920').emptyHeight,
    'QHD empty-state height must expand beyond Full HD');
  assert.ok(byLabel('fullhd-1920').emptyHeight>byLabel('laptop-1366').emptyHeight,
    'Full HD empty-state should expand beyond compact laptop');
  console.log('FORGE_DESKTOP_RESPONSIVE_OK',JSON.stringify({
    screens:sizes.length,toolStates:records.length,logoHeight:logo.map(x=>[x.viewport,x.emptyHeight]),
    railWidths:records.filter(x=>x.rail).map(x=>[x.viewport,x.name,x.rail.w]),
    violations:0
  }));
  fs.writeFileSync(`${out}/metrics.json`,JSON.stringify(records,null,2));
}finally{await browser.close();}
