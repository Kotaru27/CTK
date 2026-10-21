/* Audit interactive controls in all eight workspaces. The ordinary
   controls share semantic color/focus motion, not hover translations.
   File inputs, canvas, video and native slider thumbs are excluded. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const routes=[
 ['section-logo',null,'Logo Resizer'],['section-pdf','convert','PDF to Image'],
 ['section-pdf','split','Image Splitter'],['section-stills-boards','video','Video Stills'],
 ['section-stills-boards','story','Storyboard'],['section-adlinks','gen','Link Gen'],
 ['section-adlinks','downloader','Ad Downloader'],['section-yt-helper',null,'Video Compressor']
];
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 await context.addInitScript(()=>{
   sessionStorage.setItem('forge_intro_suppress','1');
   sessionStorage.setItem('forge_whatsnew_suppress','1');
 });
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof UI==='object'&&!!window.ForgeWorkspaceRoute);
 const results=[];
 for(const [section,mode,name] of routes){
   await page.evaluate(({section,mode})=>UI.openTool(section,mode),{section,mode});
   await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'));
   if(section==='section-yt-helper'){
     // The replacement's real controls live in a same-origin iframe,
     // so a parent-only query would incorrectly report zero controls.
     const frame=page.frameLocator('#section-yt-helper .forge-compressor-frame');
     await frame.locator('#targetSize').waitFor({timeout:20000});
     const measured=await frame.locator('body').evaluate(()=>{
       const nodes=['#dropzone','.number-wrap','#compressButton']
         .map(selector=>document.querySelector(selector));
       return nodes.map(el=>{
         const css=getComputedStyle(el);
         return {control:el.id||el.className,
           visible:el.getClientRects().length>0,
           duration:Math.max(...css.transitionDuration.split(',').map(x=>parseFloat(x)||0))}
       });
     });
     assert.equal(measured.length,3,'Compressor transition samples are missing');
     assert.ok(measured.every(x=>x.visible&&x.duration>=.10),
       'Compressor working surfaces lack semantic transitions: '+JSON.stringify(measured));
     results.push({name,count:measured.length,instant:0});
     continue;
   }
   const measured=await page.evaluate(()=>{
     const selectors=[
       '#view-app .tool-section.active button:not(:disabled)',
       '#view-app .tool-section.active label.liquid-btn',
       '#view-app .tool-section.active input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=file]):not(:disabled)',
       '#view-app .tool-section.active textarea:not(:disabled)',
       '#view-app .tool-section.active select:not(:disabled)'
     ];
     const nodes=[...new Set(selectors.flatMap(s=>[...document.querySelectorAll(s)]))]
       .filter(el=>el.getClientRects().length>0&&
         getComputedStyle(el).visibility!=='hidden');
     const samples=nodes.map(el=>{
       const css=getComputedStyle(el);
       const seconds=String(css.transitionDuration).split(',').map(s=>parseFloat(s)||0);
       return {id:el.id||el.className||el.tagName,
         duration:Math.max(...seconds,0),transform:css.transform,
         label:el.tagName};
     });
     return {count:samples.length,unanimated:samples.filter(s=>s.duration<.10),
       moving:samples.filter(s=>s.transform!=='none').slice(0,6)};
   });
   assert.ok(measured.count>=2,name+': no visible working controls measured');
   // Some deliberately instantaneous controls are valid (file actions,
   // selected toggles), but a majority of ordinary inputs and buttons
   // must share the semantic transition rather than snap abruptly.
   assert.ok(measured.unanimated.length<=Math.ceil(measured.count*.3),
     name+': inconsistent visual state response '+JSON.stringify(measured.unanimated.slice(0,8)));
   results.push({name,count:measured.count,instant:measured.unanimated.length});
 }
 assert.deepEqual(errors,[],'Runtime errors during control audit');
 console.log('FORGE_EIGHT_CONTROL_COVERAGE '+JSON.stringify(results));
 await context.close();
}finally{await browser.close();}
