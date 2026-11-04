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
      window.__forgeDisableSharedHandoff=true;
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
    if(viewport.width<=1000){
      assert.ok(metrics.hero.height>=230,viewport.width+': responsive hero was flex-shrunk');
      assert.ok(metrics.grid.bottom>=metrics.cards.at(-1).bottom-8,
        viewport.width+': tool cards escaped their scroll container');
    }
    await page.screenshot({path:'artifacts/forge-browser/home-'+viewport.width+'.png'});
    await page.locator('.home-card.tool-logo').click();
    await page.locator('#section-logo').waitFor({state:'visible',timeout:12000});
    // On compact phones the legacy app intentionally suppresses the desktop
    // nav rail. Only audit the toggle on widths where that control is shown.
    let nav=null,navContrast=null;
    if(viewport.width>=761){
      await page.locator('#mainSidebar .nav-toggle').waitFor({state:'visible',timeout:12000});
      nav=await page.locator('#mainSidebar .nav-toggle').evaluate(el=>{
        const label=el.querySelector('.nav-item-text'),cs=getComputedStyle(el);
        return {background:cs.backgroundColor,foreground:getComputedStyle(label).color,
          sidebarWidth:el.closest('#mainSidebar').getBoundingClientRect().width};
      });
      navContrast=contrast(nav.background,nav.foreground);
      assert.ok(navContrast>=4.5,
        viewport.width+': collapse control does not meet minimum text contrast: '+JSON.stringify(nav));
      if(viewport.width>=1280){
        await page.screenshot({path:'artifacts/forge-browser/sidebar-'+viewport.width+'.png'});
        await page.locator('#mainSidebar .nav-toggle').click();
        const after=await page.locator('#mainSidebar').evaluate(el=>el.getBoundingClientRect().width);
        assert.ok(after<nav.sidebarWidth,viewport.width+': collapse control cannot collapse navigation');
      }
    }
    assert.deepEqual(errors,[],viewport.width+': browser runtime errors');
    samples.push({viewport,metrics,nav,contrast:navContrast});
    await context.close();
  }
  const introLayouts=[];
  // Verify the real intro at desktop, the reported short landscape size,
  // and both normal and short mobile screens. This checks *visible* boxes,
  // not just CSS selectors, to prevent the screenshot's kicker/icon overlap.
  for(const viewport of [
    {width:1440,height:900},
    {width:806,height:387},
    {width:390,height:844},
    {width:390,height:390}
  ]){
    const ctx=await browser.newContext({viewport,reducedMotion:'no-preference'});
    // The welcome dialog is independently tested; do not let it obscure intro controls.
    await ctx.addInitScript(()=>sessionStorage.setItem('forge_whatsnew_suppress','1'));
    const page=await ctx.newPage();
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.locator('#forgeIntro').waitFor({state:'visible',timeout:8000});
    await page.waitForFunction(()=>
      document.getElementById('forgeCineCounter')?.textContent==='08',
      null,{timeout:5000});
    await page.waitForFunction(()=>
      Number(getComputedStyle(document.querySelector('.forge-cine-identity')).opacity)>.95,
      null,{timeout:5000});
    await page.waitForTimeout(140);
    const intro=await page.evaluate(()=>{
      const box=(el)=>{
        const r=el.getBoundingClientRect();
        return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};
      };
      const select=s=>document.querySelector(s);
      const pieceBoxes=[...document.querySelectorAll('.forge-cine-piece')].map(el=>box(el));
      const overlap=(a,b,pad=3)=>a.left<b.right+pad&&a.right+pad>b.left&&
        a.top<b.bottom+pad&&a.bottom+pad>b.top;
      const kicker=box(select('.forge-cine-kicker'));
      const wordmark=box(select('.forge-cine-wordmark'));
      const footer=box(select('.forge-cine-foot'));
      const head=box(select('.forge-cine-head'));
      const labels=[...document.querySelectorAll('.forge-cine-piece')].map(el=>el.getAttribute('title'));
      return {width:innerWidth,height:innerHeight,kicker,wordmark,footer,head,
        tiles:pieceBoxes.length,labels,
        collideWithKicker:pieceBoxes.some(r=>overlap(r,kicker)),
        collideWithWordmark:pieceBoxes.some(r=>overlap(r,wordmark)),
        footerCollision:overlap(wordmark,footer)||overlap(kicker,footer),
        headerCollision:overlap(head,wordmark)||overlap(head,kicker),
        horizontallyClipped:wordmark.left<0||wordmark.right>innerWidth+2,
        totalVisible:pieceBoxes.filter(x=>x.left>=-2&&x.right<=innerWidth+2).length};
    });
    assert.equal(intro.tiles,8,'Expected eight original tool pictograms at '+viewport.width);
    assert.equal(intro.totalVisible,8,'The assembled F is clipped at '+JSON.stringify(viewport));
    assert.equal(intro.collideWithKicker,false,
      'Icon squares overlap EIGHT TOOLS caption: '+JSON.stringify(intro));
    assert.equal(intro.collideWithWordmark,false,
      'Icon squares overlap The Forge wordmark: '+JSON.stringify(intro));
    assert.equal(intro.footerCollision,false,'Wordmark overlaps intro footer: '+JSON.stringify(intro));
    assert.equal(intro.headerCollision,false,'Wordmark overlaps intro header: '+JSON.stringify(intro));
    assert.equal(intro.horizontallyClipped,false,'Wordmark runs outside screen: '+JSON.stringify(intro));
    await page.screenshot({path:'artifacts/forge-browser/intro-balanced-'+viewport.width+'x'+viewport.height+'.png'});
    await page.locator('#forgeIntroSkip').click();
    await page.locator('#forgeIntro').waitFor({state:'detached',timeout:2500});
    introLayouts.push(intro);
    await ctx.close();
  }
  console.log('FORGE_VISUAL_COMPOSITION '+JSON.stringify({samples,introLayouts}));
}finally{
  await browser.close();
}
