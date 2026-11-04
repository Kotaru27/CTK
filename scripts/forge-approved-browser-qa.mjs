/* Approved F-to-home production browser QA. Real routes, existing button nodes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const names=['Logo Resizer','PDF to Image','Image Splitter','Video Stills',
 'Storyboard','Link Gen','Ad Downloader','Video Compressor'];
const urls=['section-logo','section-pdf','section-pdf','section-stills-boards',
 'section-stills-boards','section-adlinks','section-adlinks','section-yt-helper'];
const screenshots='artifacts/forge-browser';
fs.mkdirSync(screenshots,{recursive:true});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const ctx=await browser.newContext({viewport,reducedMotion:'no-preference'});
  await ctx.addInitScript(()=>{sessionStorage.setItem('forge_whatsnew_suppress','1')});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.classList.contains('forge-swap-ready'),null,{timeout:9000});
  await page.locator('#forgeIntro.forge-swap-prepared').waitFor({state:'visible'});
  assert.equal(await page.locator('#forgeIntro .forge-cine-piece').count(),8);
  const composition=await page.evaluate(()=>{
   const r=sel=>{const b=document.querySelector(sel).getBoundingClientRect();
    return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}};
   return{mark:r('#forgeIntro .forge-cine-emblem'),title:r('#forgeIntro .forge-cine-identity'),
     window:innerWidth};
  });
  assert.ok(composition.title.left>=0&&composition.title.right<=composition.window+2,
   'Wordmark should stay within viewport');
  assert.ok(composition.mark.left>=0&&composition.mark.right<=composition.window+2,
   'F should stay within viewport');
  if(viewport.width>700)assert.ok(composition.title.right<=composition.mark.left+2,
   'Centered brand and F must be side-by-side without overlap');
  await page.screenshot({path:screenshots+'/approved-intro-'+viewport.width+'.png'});
  await page.locator('#forgeIntro').waitFor({state:'detached',timeout:7000});
  const actual=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('#homeContent > button.home-card')];
   const title=document.getElementById('forgeHeroName');
   return {
    nodes:nodes.length,
    names:nodes.map(n=>n.querySelector('.home-card-title')?.textContent.trim()),
    onclick:nodes.map(n=>n.getAttribute('onclick')),
    icons:nodes.filter(n=>n.querySelector('.forge-home-icon svg')).length,
    title:title?.textContent.trim(),
    titleVisible:!!title?.getBoundingClientRect().width,
    scrollWidth:document.documentElement.scrollWidth,
    width:innerWidth,
    css:getComputedStyle(document.querySelector('.forge-approved-home')).display,
    visible:nodes.every(n=>n.getBoundingClientRect().width>90),
    completed:document.documentElement.dataset.forgeIntroFinished
   };
  });
  assert.equal(actual.nodes,8,'Must preserve eight real tool buttons');
  assert.deepEqual(actual.names,names);
  assert.equal(actual.icons,8,'All real cards must show their tool icons');
  assert.ok(actual.onclick.every((v,i)=>v&&v.includes(urls[i])),'Tool click destinations changed');
  assert.equal(actual.title,'The Forge');
  assert.ok(actual.titleVisible,'Real wordmark missing');
  assert.ok(actual.css!=='none'&&actual.visible,'Approved home not visible');
  assert.ok(actual.scrollWidth<=actual.width+2,'Unexpected horizontal scroll');
  assert.equal(actual.completed,'1');
  await page.screenshot({path:screenshots+'/approved-home-'+viewport.width+'.png',fullPage:true});
  const search=page.locator('#forgeToolSearch');
  await search.fill('storyboard');
  await page.waitForFunction(()=>document.querySelectorAll('#homeContent >.home-card.forge-filtered-out').length===7);
  assert.ok(await page.locator('#homeContent > .home-card.tool-story').isVisible());
  await search.press('Escape');
  assert.equal(await search.inputValue(),'');
  await page.locator('#replay').click();
  await page.locator('#forgeIntro').waitFor({state:'visible'});
  await page.locator('#forgeIntroSkip').click();
  await page.locator('#forgeIntro').waitFor({state:'detached'});
  assert.ok(await page.locator('#homeContent >.home-card.tool-logo').isVisible());
  assert.deepEqual(errors,[],'Runtime errors: '+errors.join('; '));
  await ctx.close();
 }
 const rm=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await rm.addInitScript(()=>sessionStorage.setItem('forge_whatsnew_suppress','1'));
 const reduced=await rm.newPage();await reduced.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await reduced.waitForFunction(()=>document.body.classList.contains('forge-swap-ready'));
 await reduced.locator('#forgeIntro').waitFor({state:'detached'});
 assert.equal(await reduced.locator('#homeContent >.home-card').count(),8);
 await rm.close();
 console.log('Approved Forge intro, shared flight, eight original routes, search, replay, skip, desktop, mobile, reduced motion: OK');
}finally{await browser.close()}
