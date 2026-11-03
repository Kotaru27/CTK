/* Browser geometry regression for the home, opening and sidebar.
   Runs on the normal built site without touching user exports. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
fs.mkdirSync('artifacts/forge-browser',{recursive:true});
const samples=[];
const color=(value)=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
const luminance=(channels)=>channels.slice(0,3).map(v=>{
  const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;
}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{
  const la=luminance(color(a)),lb=luminance(color(b));
  return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05);
};
try{
  for(const viewport of [{width:1440,height:900},{width:1776,height:863},{width:390,height:844}]){
    const context=await browser.newContext({viewport,reducedMotion:'no-preference'});
    await context.addInitScript(()=>{
      sessionStorage.setItem('forge_intro_suppress','1');
      sessionStorage.setItem('forge_whatsnew_suppress','1');
    });
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.locator('#homeContent .home-card').first().waitFor({state:'visible'});
    await page.evaluate(()=>document.fonts.ready);
    const metrics=await page.evaluate(()=>{
      const box=(selector)=>{const r=document.querySelector(selector).getBoundingClientRect();
        return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      return {
        viewport:innerWidth,screenHeight:innerHeight,
        layout:box('#view-home .combined-home-layout'),
        hero:box('#view-home .forge-hero'),
        grid:box('#homeContent'),
        headerFont:getComputedStyle(document.getElementById('brandText')).fontFamily,
        cards:[...document.querySelectorAll('#homeContent .home-card')].map(x=>{const r=x.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width};}),
        overflow:document.documentElement.scrollWidth>innerWidth+3
      };
    });
    assert.equal(metrics.cards.length,8,'Must preserve all eight tool entries');
    assert.equal(metrics.overflow,false,viewport.width+': horizontal overflow');
    assert.ok(metrics.layout.width>=viewport.width*.90,viewport.width+': launcher is too narrow');
    assert.ok(!metrics.headerFont.includes('Kola'),viewport.width+': unreadable decorative header font');
    if(viewport.width>=1001){
      assert.ok(metrics.grid.bottom>=viewport.height*.76,viewport.width+': cards remain crammed at the top');
      assert.ok(metrics.grid.width>metrics.hero.width,viewport.width+': tool directory is too narrow');
      assert.ok(metrics.cards.every(x=>x.width>=190),viewport.width+': card collapsed');
    }
    await page.screenshot({path:'artifacts/forge-browser/home-'+viewport.width+'.png'});
    await page.locator('.home-card.tool-logo').click();
    await page.locator('#mainSidebar .nav-toggle').waitFor({state:'visible'});
    const nav=await page.locator('#mainSidebar .nav-toggle').evaluate(el=>{
      const label=el.querySelector('.nav-item-text'),cs=getComputedStyle(el);
      return {background:cs.backgroundColor,foreground:getComputedStyle(label).color,
        sidebarWidth:el.closest('#mainSidebar').getBoundingClientRect().width};
    });
    assert.ok(contrast(nav.background,nav.foreground)>=4.5,
      viewport.width+': collapse control does not meet minimum text contrast: '+JSON.stringify(nav));
    if(viewport.width>=1280){
      await page.screenshot({path:'artifacts/forge-browser/sidebar-'+viewport.width+'.png'});
      await page.locator('#mainSidebar .nav-toggle').click();
      const after=await page.locator('#mainSidebar').evaluate(el=>el.getBoundingClientRect().width);
      assert.ok(after<nav.sidebarWidth,viewport.width+': collapse control cannot collapse navigation');
    }
    assert.deepEqual(errors,[],viewport.width+': browser runtime errors');
    samples.push({viewport,metrics,nav,contrast:contrast(nav.background,nav.foreground)});
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.locator('#forgeIntro').waitFor({state:'visible',timeout:8000});
  const intro=await page.evaluate(()=>{
    const box=(id)=>{const r=document.getElementById(id).getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width};};
    return {mark:box('forgeIntroWordmark'),
      steps:document.querySelector('.forge-intro-steps').getBoundingClientRect().toJSON(),
      summary:document.querySelector('.forge-intro-summary').getBoundingClientRect().toJSON(),
      footer:document.querySelector('.forge-intro-caption').getBoundingClientRect().toJSON(),
      viewport:innerWidth};
  });
  assert.ok(Math.abs((intro.mark.left+intro.mark.right)/2-intro.viewport/2)<intro.viewport*.13,
    'Intro wordmark is not centered');
  assert.ok(intro.summary.top>intro.steps.bottom+7,'Intro summary overlaps its steps');
  assert.ok(intro.summary.bottom<intro.footer.top-10,'Intro summary overlaps footer');
  await page.screenshot({path:'artifacts/forge-browser/intro-balanced.png'});
  await page.locator('#forgeIntroSkip').click();
  await page.locator('#forgeIntro').waitFor({state:'detached',timeout:2500});
  await context.close();
  console.log('FORGE_VISUAL_COMPOSITION '+JSON.stringify({samples,intro}));
}finally{
  await browser.close();
}
