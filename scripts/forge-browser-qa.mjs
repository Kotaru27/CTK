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
 check(await page.locator('#forgeIntroWordmark').innerText()==='The Forge','Intro must use one correctly kerned Kola wordmark');
 check(await page.locator('.forge-intro-glyph').count()===0,'Retired per-letter loader unexpectedly rendered');
 // A masked, compositor-driven wordmark is the sole branded focal point.
 const revealStyle=await page.locator('#forgeIntroType').evaluate(el=>{
   const cover=getComputedStyle(el,'::before');
   return {mask:cover.content,position:cover.position,background:cover.backgroundColor};
 });
 check(revealStyle.mask!=='none'&&revealStyle.position==='absolute',
   'Precision wordmark cover was not rendered: '+JSON.stringify(revealStyle));
 const revealPromise=page.evaluate(()=>new Promise(resolve=>{
   const positions=[],started=performance.now();
   const tick=()=>{
     const intro=document.getElementById('forgeIntro');
     const word=document.getElementById('forgeIntroType');
     if(!intro || intro.classList.contains('is-settled') || performance.now()-started>3000){
       resolve(positions);return;
     }
     if(intro.classList.contains('is-playing') && word){
       const matrix=getComputedStyle(word,'::before').transform;
       const tx=matrix==='none'?0:new DOMMatrixReadOnly(matrix).m42;
       positions.push({at:performance.now(),tx});
     }
     requestAnimationFrame(tick);
   };
   requestAnimationFrame(tick);
 }));
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
 // Collect intro rAF samples before screenshot can consume the handoff window.
 await page.screenshot({path:'artifacts/forge-browser/intro.png'});
 await intro.waitFor({state:'detached',timeout:6000});
 const trajectory=await trajectoryPromise;
 const reveal=await revealPromise;
 check(reveal.length>=10,'Kola intro mask did not produce continuous compositor samples');
 if(reveal.length>=3){
   const travel=Math.max(...reveal.map(f=>f.tx))-Math.min(...reveal.map(f=>f.tx));
   check(travel>80,'Kola wordmark mask did not visibly travel: '+travel.toFixed(1)+'px');
 }

 // First major rebrand: popup appears AFTER the intro wordmark handoff.
 const launch=page.locator('#forgeWhatsNew');
 await launch.waitFor({state:'visible',timeout:3500});
 check(await page.locator('#forgeWhatsNewTitle').innerText()!=='' ,'Launch title is missing');
 check(await launch.locator('.forge-whatsnew-change').count()===5,
   'Launch popup is missing some rebrand workflow changes');
 const popupGeometry=await launch.locator('.forge-whatsnew-dialog').evaluate(el=>{
   const box=el.getBoundingClientRect();
   return {width:Math.round(box.width),height:Math.round(box.height),
     inside:box.top>=0&&box.bottom<=innerHeight+1&&box.left>=0&&box.right<=innerWidth+1};
 });
 check(popupGeometry.inside,'Launch popup is clipped at desktop size: '+JSON.stringify(popupGeometry));
 await page.screenshot({path:'artifacts/forge-browser/first-rebrand-welcome.png',fullPage:false});
 await page.locator('#forgeWhatsNewEnter').click();
 await launch.waitFor({state:'hidden',timeout:1500});

 const cards=page.locator('button.home-card');
 check(await cards.count()===8,'All eight tool cards must exist after handoff');

 // The eight existing artworks must read as purposeful illustrations, not
 // tiny low-contrast watermarks. No card/route DOM changes are permitted.
 const specimens=await page.evaluate(()=>[...document.querySelectorAll('.combined-home-grid > .home-card')].map(card=>{
   const art=card.querySelector('.home-card-art');
   const box=card.getBoundingClientRect(),rect=art.getBoundingClientRect();
   return {tool:[...card.classList].find(c=>c.startsWith('tool-')),
     tone:getComputedStyle(card).backgroundColor,
     artWidth:Math.round(rect.width),
     withinCard:rect.left>=box.left-8&&rect.right<=box.right+8&&rect.top>=box.top-8,
     title:card.querySelector('.home-card-title')?.textContent.trim()};
 }));
 check(specimens.length===8,'Not all eight artwork specimens rendered');
 check(new Set(specimens.map(x=>x.tone)).size>=6,'Creative tool specimens lost distinct surfaces');
 check(specimens.every(x=>x.artWidth>=125&&x.withinCard),'Artwork clipped or visually undersized: '+JSON.stringify(specimens));
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

 // Legacy dark preference must not strand users in dark mode after hiding the toggle.
 await page.evaluate(()=>localStorage.setItem('cts_theme','dark'));
 await page.reload({waitUntil:'domcontentloaded'});
 check(await page.locator('body').evaluate(el=>el.classList.contains('light-mode')),
   'Light-only release still applies a saved dark preference');
 check(await page.locator('#themeToggleBtn').isHidden(),
   'Appearance toggle should be hidden in light-only release');
 await page.locator('#forgeIntro').waitFor({state:'detached',timeout:2500});
 check(await page.locator('#forgeIntro').count()===0,'Intro repeated within one session');
 await page.screenshot({path:'artifacts/forge-browser/home-light-legacy-dark.png'});
 await context.close();
 // Permanent opt-out is a separate deliberate action. A new context
 // proves the saved choice persists beyond a simple page reload.
 const dismissContext=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
 const welcomePage=await dismissContext.newPage();
 await welcomePage.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await welcomePage.locator('#forgeWhatsNew').waitFor({state:'visible',timeout:4500});
 await welcomePage.screenshot({path:'artifacts/forge-browser/first-rebrand-laptop.png'});
 await welcomePage.locator('#forgeWhatsNewNever').click();
 check(await welcomePage.locator('#forgeWhatsNew').isHidden(),
   'Do not show again must dismiss the popup immediately');
 check(await welcomePage.evaluate(()=>localStorage.getItem('forge_whatsnew_dismissed_2026_v1'))==='1',
   'Do not show again was not persisted');
 await welcomePage.reload({waitUntil:'domcontentloaded'});
 await welcomePage.waitForTimeout(120);
 check(await welcomePage.locator('#forgeWhatsNew').isHidden(),
   'Dismissed rebrand popup reappeared after a reload');
 await dismissContext.close();

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
   await wide.addInitScript(()=>{
     sessionStorage.setItem('forge_intro_seen_v4','1');
     sessionStorage.setItem('forge_whatsnew_seen_session_2026_v1','1');
   });
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
     const brand=document.querySelector('#brandText').getBoundingClientRect();
     const number=document.querySelector('button.home-card .home-card-num');
     const card=document.querySelector('button.home-card');
     return {
       width:innerWidth,height:innerHeight,
       heroHeight:hr.height,heroBottom:hr.bottom,
       heroLeft:Math.round(hr.left),headerWordmarkLeft:Math.round(brand.left),
       titleRight:tr.right,gridTop:gr.top,
       headerGeneratedText:getComputedStyle(document.querySelector('.header'),'::after').content,
       eyebrow:document.querySelector('.forge-hero-edition')?.textContent,
       heroSupportingText:document.querySelector('.forge-hero-aside p')?.textContent,
       sectionHeading:document.querySelector('.forge-after-hero strong')?.textContent,
       cardNumberColor:getComputedStyle(number).color,
       cardBackground:getComputedStyle(card).backgroundColor,
       logoName:document.querySelector('button.tool-logo .home-card-title')?.textContent,
       adNavName:document.querySelector('#nav-adlinks-dl .nav-item-text')?.textContent,
       overflow:document.documentElement.scrollWidth>innerWidth+2,
       count:document.querySelectorAll('button.home-card').length,
       kola:document.fonts.check('400 120px "Kola"'),
       light:document.body.classList.contains('light-mode')
     };
   });
   check(values.count===8,'QHD cards count differs from eight');
   check(values.eyebrow==='EIGHT TOOLS. ONE CREATIVE WORKSPACE.','QHD hero eyebrow lacks clear scope');
   check(values.sectionHeading==='Choose a tool','QHD tool-section heading incorrect');
   check(values.heroSupportingText.includes('convert PDFs'),'QHD description missing useful capability text');
   check(values.headerGeneratedText==='none','Floating legacy header tagline still visible');
   check(Math.abs(values.heroLeft-values.headerWordmarkLeft)<2,
     'Brand header is not aligned to the homepage hero column');
   check(values.cardNumberColor==='rgb(64, 91, 75)','Card numbers are still too faint');
   check(values.logoName==='Logo Resizer','Logo card name inconsistent');
   check(values.adNavName==='Ad Downloader','Ad Downloader navigation name inconsistent');
   check(values.light,'QHD light mode default missing');
   check(await wp.locator('#themeToggleBtn').isHidden(),'QHD appearance control visible');
   check(values.kola,'QHD Kola font not loaded');
   check(!values.overflow,'QHD horizontal overflow');
   check(values.titleRight<viewport.width,'QHD title clipped');
   check(values.heroHeight<=360,'QHD hero consumes too much vertical space');
   check(values.gridTop<510,'QHD workspace tiles begin too far down the page');
   // First let the existing staggered tile-entry animation finish:
   // the hover check must not mistake initial entrance travel for hover motion.
   await wp.waitForTimeout(750);
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
