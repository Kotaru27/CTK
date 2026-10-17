import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const base='http://127.0.0.1:4173/';
fs.mkdirSync('artifacts/forge-browser',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const failures=[];
function check(value,message) {
 if(!value) failures.push(message);
}
try {
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 const page=await context.newPage();
 const pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(String(error)));
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 const intro=page.locator('#forgeIntro');
 await intro.waitFor({state:'visible',timeout:8000});
 await page.screenshot({path:'artifacts/forge-browser/intro.png'});
 check(await page.locator('.forge-intro-glyph').count()===8,'Intro should have eight constructed glyphs');
 const trajectoryPromise=page.evaluate(()=>new Promise(resolve=>{
   const samples=[];
   const loop=()=>{
     const element=document.getElementById('forgeIntroWordmark');
     const overlay=document.getElementById('forgeIntro');
     if(!element||!overlay){resolve(samples);return;}
     if(overlay.classList.contains('forge-intro--handoff')){
       const rect=element.getBoundingClientRect();
       samples.push({time:performance.now(),left:rect.left,top:rect.top,width:rect.width});
     }
     requestAnimationFrame(loop);
   };
   requestAnimationFrame(loop);
 }));
 await intro.waitFor({state:'detached',timeout:6000});
 const trajectory=await trajectoryPromise;

 const cards=page.locator('button.home-card');
 check(await cards.count()===8,'All eight tool cards must exist after handoff');
 const details=await page.evaluate(()=>{
  const hero=document.getElementById('forgeHeroName');
  const element=document.querySelector('.forge-hero');
  const r=hero.getBoundingClientRect(),box=element.getBoundingClientRect();
  const style=getComputedStyle(element);
  return {
   light:document.body.classList.contains('light-mode'),
   title:hero.textContent,
   titleOpacity:getComputedStyle(hero).opacity,
   backgroundColor:style.backgroundColor,
   heroWidth:Math.round(box.width),titleWidth:Math.round(r.width),
   titleLeft:Math.round(r.left),titleRight:Math.round(r.right),
   inkWidth:(()=>{const range=document.createRange();range.selectNodeContents(hero);return Math.round(range.getBoundingClientRect().width);})(),
   overflow:document.documentElement.scrollWidth>innerWidth+3,
   font:getComputedStyle(hero).fontFamily,
   kolaLoaded:document.fonts.check('400 120px "Kola"')
  };
 });
 await page.screenshot({path:'artifacts/forge-browser/home-light.png'});
 check(details.light,'New visitors should default to light theme');
 check(details.title==='The Forge','Hero title text incorrect');
 check(details.titleOpacity==='1','Hero title must be fully revealed after intro');
 check(details.backgroundColor==='rgba(0, 0, 0, 0)','Hero should be open/transparent, not dark banner');
 check(!details.overflow,'Homepage should not overflow horizontally at 1440px');
 check(details.titleRight < 1440,'Wordmark is clipped on the desktop viewport');
 check(details.font.includes('Kola'),'Wordmark must request Kola');
 check(Math.abs(details.titleWidth-details.inkWidth)<7,'Hero heading box must match actual kerned text width');
 check(trajectory.length>=12,'Expected at least twelve compositor animation frames');
 if(trajectory.length>=2){
   const deltas=trajectory.slice(1).map((f,i)=>Math.abs(f.width-trajectory[i].width));
   const maxStep=Math.max(...deltas);
   const last=trajectory[trajectory.length-1];
   check(maxStep<45,'Large size jump detected during shared wordmark flight: '+maxStep.toFixed(1)+'px');
   check(trajectory[0].width>last.width,'Intro wordmark should shrink continuously into the smaller homepage wordmark');
   check(Math.abs(last.width-details.titleWidth)<48,'Final shared wordmark width diverges from hero');
   check(Math.abs(last.left-details.titleLeft)<48,'Final shared wordmark position diverges from hero');
 }

 // Existing theme persistence must remain functional.
 await page.evaluate(()=>localStorage.setItem('cts_theme','dark'));
 await page.reload({waitUntil:'domcontentloaded'});
 check(!(await page.locator('body').evaluate(el=>el.classList.contains('light-mode'))),
   'Saved dark theme was not honored');
 check(await page.locator('#forgeIntro').count()===0,'Intro repeated within one session');
 await page.screenshot({path:'artifacts/forge-browser/home-dark.png'});
 await context.close();
 const motion=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const reducedPage=await motion.newPage();
 await reducedPage.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await reducedPage.waitForTimeout(120);
 check(await reducedPage.locator('#forgeIntro').count()===0,'Reduced motion should bypass intro');
 await motion.close();

 // QHD desktop and 125%-scaled equivalent: keep light default and original
 // navigation/card geometry, with no unintended scroll or full-width banner.
 const qhd=[];
 for(const viewport of [{width:2560,height:1440},{width:2048,height:1152}]) {
   const wide=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'no-preference'});
   await wide.addInitScript(()=>sessionStorage.setItem('forge_intro_seen_v4','1'));
   const wp=await wide.newPage();
   const errs=[];
   wp.on('pageerror',error=>errs.push(String(error)));
   await wp.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
   await wp.evaluate(()=>document.fonts.ready);
   const values=await wp.evaluate(()=>{
     const hero=document.querySelector('.forge-hero');
     const title=document.querySelector('#forgeHeroName');
     const grid=document.querySelector('#homeContent');
     const hr=hero.getBoundingClientRect(),tr=title.getBoundingClientRect(),gr=grid.getBoundingClientRect();
     return {
       width:innerWidth,height:innerHeight,
       heroHeight:hr.height,heroBottom:hr.bottom,
       titleRight:tr.right,gridTop:gr.top,
       overflow:document.documentElement.scrollWidth>innerWidth+2,
       count:document.querySelectorAll('button.home-card').length,
       kola:document.fonts.check('400 120px "Kola"'),
       light:document.body.classList.contains('light-mode')
     };
   });
   check(values.count===8,'QHD cards count differs from eight');
   check(values.light,'QHD light mode default missing');
   check(values.kola,'QHD Kola font not loaded');
   check(!values.overflow,'QHD horizontal overflow');
   check(values.titleRight<viewport.width,'QHD title clipped');
   check(values.heroHeight<=410,'QHD hero consumes too much vertical space');
   check(values.gridTop<590,'QHD workspace tiles begin too far down the page');
   const tile=wp.locator('button.home-card').first();
   const before=await tile.boundingBox();
   await tile.hover();
   await wp.waitForTimeout(280);
   const after=await tile.boundingBox();
   check(Math.abs(before.x-after.x)<2&&Math.abs(before.y-after.y)<2,
     'Card hover moves the entire card, rather than a subtle internal affordance');
   check(errs.length===0,'QHD JavaScript errors: '+errs.join('; '));
   await wp.screenshot({path:'artifacts/forge-browser/qhd-'+viewport.width+'.png',fullPage:false});
   qhd.push(values);
   await wide.close();
 }
 console.log('Forge browser QA',JSON.stringify({details,motionFrames:trajectory.length,firstFrame:trajectory[0],lastFrame:trajectory.at(-1),pageErrors,qhd,failures},null,2));
 assert.deepEqual(failures,[],'Forge browser regression failures');
} finally {
 await browser.close();
}
