/* Populated-workspace browser QA — synthetic test assets, actual UI handlers.
   Does NOT certify video services, real campaign workbooks, hardware refresh
   performance or user-provided files. No changes to production app code. */
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='artifacts/populated-workspaces';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const rows=[];
function samplePdf(){
 const stream='BT /F1 30 Tf 72 700 Td (THE FORGE QA DOCUMENT) Tj ET';
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
 ];
 let data='%PDF-1.4\n',positions=[0];
 for(let i=0;i<objects.length;i++){positions.push(Buffer.byteLength(data));data+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=Buffer.byteLength(data);
 data+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+
   positions.slice(1).map(p=>String(p).padStart(10,'0')+' 00000 n \n').join('')+
   `trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return Buffer.from(data);
}
const quantile=(nums,q)=>nums.length?nums[Math.min(nums.length-1,Math.floor(q*(nums.length-1)))]:0;
try{
 for(const [label,width,height]of [['compact',1366,768],['fullhd',1920,1080],['qhd',2560,1440]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'});
  await context.addInitScript(()=>sessionStorage.setItem('forge_intro_seen_v4','1'));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof UI==='object'&&typeof Tools?.Logo?.handleFiles==='function',{timeout:15000});
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('link[href*="forge-workspace-finish.css"]').count(),1);
  const bases=await page.evaluate(()=>{
   const canvases=[];
   for(let i=0;i<7;i++){
    const c=document.createElement('canvas');c.width=960;c.height=540;
    const x=c.getContext('2d'),g=x.createLinearGradient(0,0,960,540);
    const hues=[100,130,155,185,215,25,50];
    g.addColorStop(0,`hsl(${hues[i]},28%,74%)`);
    g.addColorStop(1,`hsl(${hues[i]+15},38%,29%)`);
    x.fillStyle=g;x.fillRect(0,0,960,540);
    x.fillStyle='rgba(255,255,255,.8)';x.fillRect(65,70,660,10);
    x.fillStyle='rgba(246,251,244,.83)';x.fillRect(65,100,280,320);
    x.fillStyle='rgba(34,69,47,.55)';x.fillRect(390,145,460,240);
    x.font='bold 84px sans-serif';x.fillStyle='#244530';x.fillText('QA '+(i+1),92,302);
    canvases.push(c.toDataURL('image/png').split(',')[1]);
   }
   return canvases;
  });
  const imgs=bases.map((p,i)=>({name:`studio-asset-${i+1}.png`,mimeType:'image/png',buffer:Buffer.from(p,'base64')}));
  async function open(section,mode){await page.evaluate(({section,mode})=>UI.openTool(section,mode),{section,mode});await page.waitForTimeout(350);}
  async function snap(name){await page.screenshot({path:`${out}/${name}-${label}.jpg`,type:'jpeg',quality:78});}
  // Real Link Gen calculation, not placeholder strings.
  await open('section-adlinks','gen');
  await page.locator('#alg-folder').fill('synthetic/qa');
  await page.locator('#alg-input').fill('QA1_Example.png\nQA2_Example.mp4\nQA3_Example.jpg');
  await page.evaluate(()=>Tools.AdLinkGen.generate());
  const link=await page.evaluate(()=>({
    exposure:document.getElementById('alg-out-ads').value.length,
    storyboard:document.getElementById('alg-out-story').value.length,
    columns:getComputedStyle(document.querySelector('.adgen-studio-results')).gridTemplateColumns,
    inputFont:parseFloat(getComputedStyle(document.getElementById('alg-input')).fontSize),
    outputFont:parseFloat(getComputedStyle(document.getElementById('alg-out-ads')).fontSize)
  }));
  assert.ok(link.exposure>30&&link.storyboard>30,`${label}: real link generation failed`);
  assert.ok(link.inputFont>=12.5&&link.outputFont>=12,`${label}: link typography remains too small`);
  await snap('link-generated');

  // Upload actual (synthetic) PNG files through the unchanged Logo file input.
  await open('section-logo',null);
  await page.locator('#logoInput').setInputFiles(imgs.slice(0,4));
  await page.locator('#logoDimWidth').fill('720');
  await page.locator('#logoDimHeight').fill('420');
  await page.locator('#logoDimOkBtn').click();
  await page.waitForFunction(()=>Tools.Logo.cards.length>=4,{timeout:35000});
  const logo=await page.evaluate(()=>({cards:Tools.Logo.cards.length,
    rendered:document.querySelectorAll('#logoGrid .logo-card-item').length,
    controlsFont:parseFloat(getComputedStyle(document.querySelector('#logoControls input:not([type=checkbox]):not([type=range]):not([type=color])')).fontSize)}));
  assert.equal(logo.rendered,4,`${label}: logo asset cards were not rendered`);
  await snap('logo-populated');

  // Real input and canvas render in Storyboard.
  await open('section-stills-boards','story');
  await page.locator('#storyInput').setInputFiles(imgs.slice(0,6));
  await page.waitForFunction(()=>Tools.Story.active?.images.length>=6&&!!document.querySelector('#storyPreview canvas'),{timeout:35000});
  const storyboard=await page.evaluate(()=>({assets:Tools.Story.active.images.length,
    hasCanvas:!!document.querySelector('#storyPreview canvas'),
    canvasSize:[Tools.Story.canvas?.width,Tools.Story.canvas?.height],
    fileEntries:document.querySelector('#storyFileList')?.children.length}));
  assert.ok(storyboard.hasCanvas&&storyboard.assets===6,`${label}: storyboard canvas not populated`);
  await snap('storyboard-populated');

  // Real input-to-preview path for Image Splitter.
  await open('section-pdf','split');
  await page.locator('#splitInput').setInputFiles(imgs.slice(0,1));
  await page.waitForFunction(()=>Tools.Split.items.length===1,{timeout:12000});
  await snap('splitter-populated');
  const splitter=await page.evaluate(()=>({assets:Tools.Split.items.length,preview:document.querySelector('#splitGrid')?.children.length}));

  // A generated one-page PDF tests the true PDF parser (not mock DOM).
  await open('section-pdf','convert');
  await page.locator('#pdfInput').setInputFiles([{name:'forge-qa-sheet.pdf',mimeType:'application/pdf',buffer:samplePdf()}]);
  await page.waitForFunction(()=>!Tools.Pdf._pdfBusy,{timeout:45000});
  const pdf=await page.evaluate(()=>({docs:Object.keys(Tools.Pdf.collection).length,
    stacks:document.querySelectorAll('#pdfStacksContainer .pdf-stack-wrapper').length,
    status:document.getElementById('pdfStatusText')?.textContent}));
  await snap('pdf-populated');
  // Report PDF as a real workflow result; any fixture parser failure is NOT
  // silently represented as proof of a working media export.

  // Actual command generator and UI markup, but offline metadata fixture.
  await open('section-yt-helper',null);
  await page.evaluate(()=>{
    YouTubeHelper.fetchMetadata=async()=>({
      title:'Synthetic QA media — interface review only',
      author:'Local test fixture',
      duration:'00:42',
      thumbnail:''
    });
    document.getElementById('ytUrlInput').value='https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  });
  await page.evaluate(()=>YouTubeHelperUI.analyze());
  await page.waitForFunction(()=>document.querySelectorAll('#ytMetadataContent .copy-cmd-btn').length===2,{timeout:12000});
  const video=await page.evaluate(()=>({buttons:document.querySelectorAll('#ytMetadataContent .copy-cmd-btn').length,
    commands:[...document.querySelectorAll('#ytMetadataContent .copy-cmd-btn')].map(b=>b.getAttribute('data-cmd')?.length||0),
    oldIntroHidden:document.getElementById('ytEmptyStage').hidden}));
  assert.ok(video.buttons===2&&video.commands.every(x=>x>15),`${label}: synthetic metadata did not generate real commands`);
  await snap('video-commands-populated');

  // Route-motion telemetry with six processed PNGs in memory, real boards
  // and generated links. Headless rAF cadence is NOT a 100Hz hardware test.
  await open('section-stills-boards','story');
  const perf=await page.evaluate(async()=>{
    const gaps=[],longTasks=[];
    let previous=0;
    const observe=new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push(Math.round(e.duration));});
    try{observe.observe({type:'longtask',buffered:false});}catch{}
    const started=performance.now(),routeStarts=[];
    const animation=new Promise(resolve=>{
      let n=0;
      function next(t){
        if(previous)gaps.push(t-previous);
        previous=t;n++;
        if(n===9)routeStarts.push({name:'link',at:performance.now(),start:performance.now(),target:'section-adlinks',mode:'gen'});
        if(n===19)routeStarts.push({name:'story',at:performance.now(),start:performance.now(),target:'section-stills-boards',mode:'story'});
        if(n===29)routeStarts.push({name:'logo',at:performance.now(),start:performance.now(),target:'section-logo',mode:null});
        if(n===39)routeStarts.push({name:'story-return',at:performance.now(),start:performance.now(),target:'section-stills-boards',mode:'story'});
        if([9,19,29,39].includes(n)){
          const r=routeStarts[routeStarts.length-1];UI.openTool(r.target,r.mode);
          r.latency=performance.now()-r.start;
        }
        if(n<65)requestAnimationFrame(next);else resolve();
      }
      requestAnimationFrame(next);
    });
    await animation;
    observe.disconnect();
    return {frames:gaps.length,elapsed:Math.round(performance.now()-started),
      framesOver33ms:gaps.filter(x=>x>33.4).length,
      maxGapMs:Math.round(Math.max(...gaps)),sortedGapsMs:gaps.map(x=>Math.round(x)).sort((a,b)=>a-b),
      routeLatenciesMs:routeStarts.map(x=>Math.round(x.latency)),longTasks};
  });
  const sorted=perf.sortedGapsMs;
  const performanceReport={frames:perf.frames,elapsedMs:perf.elapsed,
    p95GapMs:quantile(sorted,.95),maxGapMs:perf.maxGapMs,
    missed33ms:perf.framesOver33ms,maxRouteLatencyMs:Math.max(...perf.routeLatenciesMs),longTasks:perf.longTasks};
  const rec={viewport:label,link,logo,storyboard,splitter,pdf,video,motion:performanceReport,
    screenshotMode:'synthetic files + actual application workflows',
    videoMetadata:'synthetic fixture; commands generated by original tool'};
  rows.push(rec);
  assert.equal(errors.length,0,`${label}: browser JS errors ${errors.join('; ')}`);
  console.log('FORGE_POPULATED_AUDIT',JSON.stringify(rec));
  await context.close();
 }
 fs.writeFileSync(`${out}/populated-report.json`,JSON.stringify(rows,null,2));
 console.log('FORGE_POPULATED_AUDIT_COMPLETE',rows.length);
}finally{await browser.close();}
