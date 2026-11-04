/* Production QA: the actual approved HTML is the home, at real desktop widths. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('artifacts/forge-browser',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const names=['Logo Resizer','PDF to Image','Image Splitter','Video Stills',
 'Storyboard','Link Gen','Ad Downloader','Video Compressor'];
try{
 for(const viewport of [{width:2048,height:1013},{width:1440,height:900},{width:390,height:844}]){
  const ctx=await browser.newContext({viewport,reducedMotion:'no-preference'});
  await ctx.addInitScript(()=>sessionStorage.setItem('forge_whatsnew_suppress','1'));
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:60000});
  const frame=page.locator('#forgeExactDemoFrame');
  await frame.waitFor({state:'visible',timeout:10000});
  const size=await frame.boundingBox();
  assert.ok(size&&Math.abs(size.width-viewport.width)<=2&&Math.abs(size.height-viewport.height)<=2,
    'Approved demo not fullscreen: '+JSON.stringify({viewport,size}));
  const inner=page.frameLocator('#forgeExactDemoFrame');
  await inner.locator('#intro').waitFor({state:'visible',timeout:8000});
  const intro=await inner.locator('.intro-composition').evaluate(el=>{
    const r=el.getBoundingClientRect();
    const pieces=[...document.querySelectorAll('#assembly > .tool-card.is-seed')];
    return {center:r.left+r.width/2,window:innerWidth,widths:pieces.map(x=>x.offsetWidth),
     icons:pieces.map(x=>x.querySelector('svg')?.getBoundingClientRect().width)};
  });
  assert.equal(intro.widths.length,8);
  assert.ok(intro.widths.every(x=>x>=25)&&intro.icons.every(x=>x>=12),
    'F collapsed: '+JSON.stringify(intro));
  assert.ok(Math.abs(intro.center-intro.window/2)<7,'Approved intro is not centered');
  await page.screenshot({path:'artifacts/forge-browser/exact-intro-'+viewport.width+'.png'});
  await inner.locator('#intro').waitFor({state:'hidden',timeout:11000});
  await inner.locator('main#home.visible').waitFor({state:'visible'});
  const cards=inner.locator('.card-slot >.tool-card');
  assert.equal(await cards.count(),8);
  assert.deepEqual(await cards.locator('.card-copy strong').allTextContents(),names);
  const rect=await inner.locator('#home').boundingBox();
  assert.ok(rect&&rect.width>=viewport.width-2,'Demo home does not fill viewport');
  assert.equal(await page.locator('#homeContent >button.home-card').count(),8,
    'Original real tool buttons were changed');
  await page.screenshot({path:'artifacts/forge-browser/exact-home-'+viewport.width+'.png',fullPage:true});
  await inner.locator('#search').fill('storyboard');
  assert.equal(await inner.locator('.card-slot >.tool-card.is-muted').count(),7);
  await inner.locator('#search').fill('');
  await inner.locator('#replay').click();
  await inner.locator('#intro').waitFor({state:'visible'});
  await inner.locator('#skip').click();
  await inner.locator('#intro').waitFor({state:'hidden'});
  await inner.locator('.card-slot[data-id="logo"] >button').click();
  await page.waitForFunction(()=>document.getElementById('view-app')?.classList.contains('active'),null,{timeout:15000});
  assert.ok(await page.locator('#section-logo').isVisible(),'Real Logo Resizer failed to open');
  await frame.waitFor({state:'hidden',timeout:15000});
  await page.locator('#nav-home').click();
  await frame.waitFor({state:'visible',timeout:15000});
  assert.equal(await cards.count(),8);
  assert.deepEqual(errors,[],'Page runtime errors');
  await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
 await ctx.addInitScript(()=>sessionStorage.setItem('forge_whatsnew_suppress','1'));
 const page=await ctx.newPage();
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.locator('#forgeExactDemoFrame').waitFor({state:'visible'});
 const f=page.frameLocator('#forgeExactDemoFrame');
 await f.locator('main#home.visible').waitFor({state:'visible',timeout:8000});
 assert.equal(await f.locator('.card-slot >.tool-card').count(),8);
 await ctx.close();
 console.log('Exact approved demo viewport, unchanged intro, eight tools, search, replay, skip, native CTK route, reduced motion: PASS');
}finally{await browser.close()}
