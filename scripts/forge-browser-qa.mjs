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
 check((await page.locator('#forgeHeroName').textContent())?.trim()==='The Forge',
   'Underlying Kola homepage heading missing during the intro');
 const initial=await page.evaluate(()=>{
   const intro=document.getElementById('forgeIntro');
   const rect=intro.getBoundingClientRect();
   return {width:rect.width,height:rect.height,
     backdrop:getComputedStyle(intro,'::before').content,
     homeVisible:!document.getElementById('view-home').classList.contains('hidden')};
 });
 check(initial.homeVisible,'Intro incorrectly replaced the homepage');
 check(initial.width>=1430&&initial.height>=890&&initial.homeVisible,
   'Wordmark intro must occupy full viewport without a boxed stage: '+JSON.stringify(initial));
 const trajectoryPromise=page.evaluate(()=>new Promise(resolve=>{
   const samples=[],start=performance.now();
   function sample(){
     const hero=document.getElementById('forgeHeroName');
     if(!hero||!document.body.classList.contains('forge-opening')||
        performance.now()-start>4700){resolve(samples);return;}
     const rect=hero.getBoundingClientRect();
     const style=getComputedStyle(hero);
     const source=document.getElementById('forgeIntroWordmark');
     const typed=source?.querySelector('.forge-intro-typed');
     const crop=source?getComputedStyle(source).clipPath:'none';
     const fixedWidth=source?.getBoundingClientRect().width||0;
     samples.push({time:performance.now(),left:rect.left,top:rect.top,
       width:rect.width,opacity:parseFloat(style.opacity),
       crop,fixedWidth,visibleText:typed?.textContent||''});
     requestAnimationFrame(sample);
   }
   requestAnimationFrame(sample);
 }));
 await page.waitForFunction(()=>
   (document.querySelector('#forgeIntroWordmark .forge-intro-typed')?.textContent.length||0)>=3,
   null,{timeout:4000});
 await page.screenshot({path:'artifacts/forge-browser/intro.png'});
 await intro.waitFor({state:'detached',timeout:6000});
 const trajectory=await trajectoryPromise;
 check(trajectory.length>=12,'Home-native physics intro produced too few frames');
 check(trajectory.every(f=>f.crop==='none'),
   'Intro clipped the Kola g during the wordmark reveal');
 check(new Set(trajectory.map(f=>f.visibleText)).size>=7,
   'Typing animation did not reveal characters one by one');
 check(trajectory.some(f=>f.visibleText==='The Forge'),
   'Final complete wordmark never appeared');
 check(trajectory.every(f=>f.fixedWidth>0),
   'Typing wordmark lost its reserved width');
 const stableWidths=trajectory.map(f=>f.fixedWidth);
 check(Math.max(...stableWidths)-Math.min(...stableWidths)<2,
   'Typing text is shifting its reserved wordmark container');
 check(trajectory.every(f=>f.width>0),
   'Wordmark disappeared or collapsed mid-animation');
 if(trajectory.length>=10){
   const jumps=trajectory.slice(1).map((f,i)=>Math.abs(f.top-trajectory[i].top));
   check(Math.max(...jumps)<14,
     'Wordmark jumped rather than settling continuously: '+Math.max(...jumps).toFixed(1)+'px');
 }
 // First-launch popup follows the completed wordmark handoff automatically.
 const launch=page.locator('#forgeWhatsNew');
 await launch.waitFor({state:'visible',timeout:2500});
 const launchTrigger=page.locator('#forgeWhatsNewTrigger');
 check(await launchTrigger.isVisible(),'Release-notes replay link missing');
 check(await page.locator('#forgeWhatsNewTitle').innerText()!=='' ,'Launch title is missing');
 check(await launch.locator('.forge-whatsnew-change').count()===5,
   'Launch popup is missing some rebrand workflow changes');
 const popupGeometry=await launch.locator('.forge-whatsnew-dialog').evaluate(el=>{
   const box=el.getBoundingClientRect();
   return {width:Math.round(box.width),height:Math.round(box.height),
     inside:box.top>=0&&box.bottom<=innerHeight+1&&box.left>=0&&box.right<=innerWidth+1};
 });
 check(popupGeometry.inside,'Launch popup is clipped at desktop size: '+JSON.stringify(popupGeometry));
 check(await launch.evaluate(el=>getComputedStyle(el).backdropFilter.includes('blur(')),
   'Welcome overlay did not blur the underlying homepage');
 await page.screenshot({path:'artifacts/forge-browser/first-rebrand-welcome.png',fullPage:false});
 // Escape behaves like Continue: session dismissal without permanent opt-out.
 await page.keyboard.press('Escape');
 await launch.waitFor({state:'hidden',timeout:1500});
 check(await page.evaluate(()=>sessionStorage.getItem('forge_whatsnew_seen_2026_v3'))==='1',
   'Escape should mark welcome as seen for this session');
 check(await page.evaluate(()=>localStorage.getItem('forge_whatsnew_dismissed_2026_v3'))!=='1',
   'Escape must not permanently opt users out of release notes');
 // A manual replay remains available, including the deliberate permanent opt-out.
 await launchTrigger.click();
 await launch.waitFor({state:'visible',timeout:1500});
 await page.locator('#forgeWhatsNewNever').click();
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
 check(trajectory.length>=12,'Expected at least twelve typing frames');
 if(trajectory.length>=2){
   const last=trajectory[trajectory.length-1];
   check(Math.abs(last.width-details.titleWidth)<8,
     'Home heading should keep a stable width throughout typing');
   check(Math.abs(last.left-details.titleLeft)<5,
     'Home heading should not move while the typed overlay is displayed');
 }
 // Legacy dark preference must not strand users in dark mode after hiding the toggle.
 await page.evaluate(()=>localStorage.setItem('cts_theme','dark'));
 await page.reload({waitUntil:'domcontentloaded'});
 check(await page.locator('body').evaluate(el=>el.classList.contains('light-mode')),
   'Light-only release still applies a saved dark preference');
 check(await page.locator('#themeToggleBtn').isHidden(),
   'Appearance toggle should be hidden in light-only release');
 await page.locator('#forgeIntro').waitFor({state:'detached',timeout:6000});
 check(await page.locator('#forgeIntro').count()===0,'Intro failed to finish after reload');
 // Explicit opt-out persists. The homepage remains accessible on reload.
 check(await page.locator('#forgeWhatsNew').isHidden(),
   'Persistent opt-out should suppress automatic welcome after reload');
 await page.screenshot({path:'artifacts/forge-browser/home-light-legacy-dark.png'});
 await context.close();
 // Permanent opt-out is a separate deliberate action. A new context
 // proves the saved choice persists beyond a simple page reload.
 const dismissContext=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
 const welcomePage=await dismissContext.newPage();
 await welcomePage.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await welcomePage.locator('#forgeWhatsNew').waitFor({state:'visible',timeout:2500});
 await welcomePage.screenshot({path:'artifacts/forge-browser/first-rebrand-laptop.png'});
 await welcomePage.locator('#forgeWhatsNewNever').click();
 check(await welcomePage.locator('#forgeWhatsNew').isHidden(),
   'Do not show again must dismiss the popup immediately');
 check(await welcomePage.evaluate(()=>localStorage.getItem('forge_whatsnew_dismissed_2026_v3'))==='1',
   'Do not show again was not persisted');
 await welcomePage.reload({waitUntil:'domcontentloaded'});
 await welcomePage.waitForTimeout(120);
 check(await welcomePage.locator('#forgeWhatsNew').isHidden(),
   'Dismissed rebrand popup reappeared after a reload');
 check(await welcomePage.locator('#forgeWhatsNewTrigger').isVisible(),
   'Manual release-notes entry must remain accessible after opt-out');
 await dismissContext.close();

 const motion=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const reducedPage=await motion.newPage();
 await reducedPage.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await reducedPage.waitForTimeout(120);
 check(await reducedPage.locator('#forgeIntro').count()===0,'Reduced motion should bypass intro');
 await motion.close();

 // Sidebar latency guard: expanding/collapsing must not animate workspace
 // width (the previous 440ms layout animation looked slow and repainted QHD).
 // Check immediate geometry after repeated actual toggle clicks in Chromium.
 const railContext=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});
 await railContext.addInitScript(()=>{
   sessionStorage.setItem('forge_intro_suppress','1');
   sessionStorage.setItem('forge_whatsnew_suppress','1');
 });
 const railPage=await railContext.newPage();
 await railPage.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await railPage.locator('button.home-card.tool-logo').click();
 await railPage.locator('#mainSidebar.visible').waitFor({state:'visible',timeout:4000});
 await railPage.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'));
 const railProbe=await railPage.locator('#mainSidebar').evaluate(nav=>{
   const toggle=nav.querySelector('.nav-toggle');
   const state=()=>{
     const style=getComputedStyle(nav);
     return {
       collapsed:nav.classList.contains('collapsed'),
       width:Math.round(nav.getBoundingClientRect().width),
       transition:style.transitionProperty,
       animation:style.animationName,
       blur:style.backdropFilter||style.webkitBackdropFilter,
       textTransition:getComputedStyle(nav.querySelector('#nav-logo .nav-item-text')).transitionProperty
     };
   };
   const turns=[];
   for(let i=0;i<10;i++){toggle.click();turns.push(state());}
   return {turns,final:state()};
 });
 const expandedWidths=railProbe.turns.filter(x=>!x.collapsed).map(x=>x.width);
 const collapsedWidths=railProbe.turns.filter(x=>x.collapsed).map(x=>x.width);
 check(railProbe.turns.length===10 &&
   railProbe.turns.every((q,i)=>q.collapsed===Boolean(i%2===1)) &&
   expandedWidths.every(x=>Math.abs(x-expandedWidths[0])<=1) &&
   collapsedWidths.every(x=>Math.abs(x-collapsedWidths[0])<=1) &&
   expandedWidths[0]-collapsedWidths[0]>=100,
   'Sidebar width failed to settle in the same task after repeated toggles: '+JSON.stringify(railProbe));
 check(railProbe.final.transition==='none'&&railProbe.final.animation==='none',
   'Sidebar still runs a geometry/entrance animation: '+JSON.stringify(railProbe.final));
 check(railProbe.final.blur==='none',
   'Sidebar is still backdrop-blurring the changing workspace');
 check(railProbe.final.textTransition==='opacity',
   'Sidebar labels still animate width, causing layout reflow');
 // All real destinations remain operable after rapid sidebar changes.
 await railPage.locator('#nav-pdf-image').click();
 await railPage.waitForFunction(()=>document.getElementById('nav-pdf-image')?.classList.contains('active'),
   null,{timeout:5000});
 check(await railPage.locator('#nav-pdf-image').evaluate(el=>el.classList.contains('active')),
   'Sidebar lost an actual navigation click after repeated toggles');
 await railContext.close();

 // QHD desktop and 125%-scaled equivalent: keep light default and original
 // navigation/card geometry, with no unintended scroll or full-width banner.
 const qhd=[];
 for(const viewport of [{width:2560,height:1440},{width:2048,height:1152}]) {
   const wide=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'no-preference'});
   await wide.addInitScript(()=>{
     sessionStorage.setItem('forge_intro_suppress','1');
     sessionStorage.setItem('forge_whatsnew_suppress','1');
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
   check(values.count===8&&values.titleRight<viewport.width,'QHD homepage must remain usable even if remote Kola is unavailable');
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
