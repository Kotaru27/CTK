import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

fs.mkdirSync('artifacts/forge-video-route',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const checks=[];
const check=(condition,message)=>{if(!condition)checks.push(message);};
const base='http://127.0.0.1:4173/';
async function setup(viewport,motion='no-preference'){
 const ctx=await browser.newContext({viewport,reducedMotion:motion});
 await ctx.addInitScript(()=>{
  sessionStorage.setItem('forge_intro_seen_v4','1');
 });
 const page=await ctx.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>typeof UI==='object' && !!window.ForgeVideoRoute,{timeout:10000});
 await page.evaluate(()=>{
  const orig=document.startViewTransition?.bind(document);
  window.__forgeTransitionCount=0;
  if(orig)document.startViewTransition=function(update){
   window.__forgeTransitionCount++;
   return orig(update);
  };
 });
 return {ctx,page,errors};
}
try {
 for(const viewport of [{width:1440,height:900},{width:2560,height:1440}]){
  const {ctx,page,errors}=await setup(viewport);
  const source=page.locator('button.home-card.tool-stills');
  const initial=await source.boundingBox();
  check(!!initial,'Video Stills card missing on homepage');
  await page.screenshot({path:'artifacts/forge-video-route/home-'+viewport.width+'.png'});
  await source.click();
  await page.locator('#section-stills-boards.active').waitFor({state:'visible',timeout:7000});
  const video=await page.evaluate(()=>({
    h2:document.querySelector('#stillsToolTitle')?.textContent.trim(),
    nav:document.querySelector('#nav-stills-video')?.classList.contains('active'),
    app:document.querySelector('#view-app')?.classList.contains('active'),
    activeCount:document.querySelectorAll('.tool-section.active').length,
    transitionCount:window.__forgeTransitionCount
  }));
  check(video.h2==='Video Stills','Video Stills header changed: '+video.h2);
  check(video.nav&&video.app&&video.activeCount===1,'Video Stills navigation lost its original state');
  check(video.transitionCount===1,'Opening Video Stills failed to use native shared transition');
  await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-video-route-running'),{timeout:3500});
  await page.screenshot({path:'artifacts/forge-video-route/video-'+viewport.width+'.png'});
  await page.locator('.header .brand-title').click();
  await page.locator('#view-home').waitFor({state:'visible',timeout:7000});
  await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-video-route-running'),{timeout:3500});
  const returned=await page.evaluate(()=>({
    isHome:!document.querySelector('#view-home').classList.contains('hidden'),
    cards:document.querySelectorAll('.home-card').length,
    transitions:window.__forgeTransitionCount,
    title:document.querySelector('.home-card.tool-stills .home-card-title').textContent.trim()
  }));
  check(returned.isHome&&returned.cards===8&&returned.title==='Video Stills','Return home or card parity failed');
  check(returned.transitions===2,'Returning home failed to use the reverse shared transition');
  // Storyboard is a different mode of the same tool section. It must NOT
  // inherit Video Stills' experimental transition.
  await page.locator('button.home-card.tool-story').click();
  await page.locator('#section-stills-boards.active').waitFor({state:'visible',timeout:7000});
  const storyboard=await page.evaluate(()=>({
    name:document.querySelector('#stillsToolTitle')?.textContent.trim(),
    selected:document.querySelector('#nav-stills-story')?.classList.contains('active'),
    transitions:window.__forgeTransitionCount
  }));
  check(storyboard.name==='Storyboard'&&storyboard.selected,'Storyboard selection regressed');
  check(storyboard.transitions===2,'Storyboard unexpectedly used the experimental transition');
  await page.locator('.header .brand-title').click();
  await page.locator('#view-home').waitFor({state:'visible',timeout:7000});
  // Last-action-wins under rapid repeated navigation. Never let a stale
  // snapshot callback overwrite the user's most recent tool selection.
  await page.evaluate(()=>{
    UI.openTool('section-stills-boards','video');
    UI.showHome();
    UI.openTool('section-stills-boards','video');
  });
  await page.waitForTimeout(1050);
  const rapid=await page.evaluate(()=>({
    video:document.querySelector('#nav-stills-video')?.classList.contains('active'),
    title:document.querySelector('#stillsToolTitle')?.textContent.trim(),
    activeSections:document.querySelectorAll('.tool-section.active').length,
    staleClass:document.documentElement.classList.contains('forge-video-route-running')
  }));
  check(rapid.video&&rapid.title==='Video Stills'&&rapid.activeSections===1&&!rapid.staleClass,
    'Rapid-route interruption left stale state: '+JSON.stringify(rapid));
  check(!errors.length,'Console or runtime errors: '+errors.join(' | '));
  console.log('FORGE_VIDEO_ROUTE',JSON.stringify({viewport,video,returned,storyboard,rapid,errors,checks}));
  await ctx.close();
 }
 const {ctx,page,errors}=await setup({width:1440,height:900},'reduce');
 await page.locator('button.home-card.tool-stills').click();
 await page.locator('#section-stills-boards.active').waitFor({state:'visible'});
 const reduced=await page.evaluate(()=>({
   transitions:window.__forgeTransitionCount,
   video:document.querySelector('#nav-stills-video')?.classList.contains('active'),
   running:document.documentElement.classList.contains('forge-video-route-running')
 }));
 check(reduced.transitions===0&&reduced.video&&!reduced.running,'Reduced motion fallback failed');
 check(!errors.length,'Reduced motion browser errors: '+errors.join(' | '));
 console.log('FORGE_VIDEO_REDUCED',JSON.stringify(reduced));
 await ctx.close();
 assert.deepEqual(checks,[],'Video Stills shared route QA failed');
} finally {
 await browser.close();
}
