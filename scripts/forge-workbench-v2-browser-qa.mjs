/* End-to-end visual/interaction checks for Forge's original workbench.
   Exercises actual built HTML and native tool routes, never synthetic handlers. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

fs.mkdirSync('artifacts/forge-browser',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const records=[];
try {
  for (const viewport of [
    {width:1440,height:900},
    {width:1920,height:1080},
    {width:390,height:844}
  ]) {
    const ctx=await browser.newContext({viewport,reducedMotion:'no-preference'});
    await ctx.addInitScript(()=>{
      sessionStorage.setItem('forge_intro_suppress','1');
      sessionStorage.setItem('forge_whatsnew_suppress','1');
    });
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:60000});
    await page.locator('#homeContent > .home-card').first().waitFor({state:'visible'});
    await page.waitForFunction(()=>document.getElementById('homeContent')?.dataset.forgeWorkbenchReady==='1');
    await page.evaluate(()=>document.fonts.ready);
    const metrics=await page.evaluate(()=>{
      const box=selector=>{
        const r=document.querySelector(selector).getBoundingClientRect();
        return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
      };
      const all=[...document.querySelectorAll('#homeContent > .home-card')];
      const cardRects=all.map(el=>{
        const r=el.getBoundingClientRect();
        return {left:r.left,top:r.top,width:r.width,height:r.height};
      });
      return {hero:box('#view-home .forge-hero'),grid:box('#homeContent'),
        cards:cardRects,columns:getComputedStyle(document.querySelector('#homeContent')).gridTemplateColumns,
        navGroupCount:document.querySelectorAll('#mainSidebar .forge-rail-group').length,
        scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
        styleLoaded:!![...document.styleSheets].find(s=>s.href?.includes('forge-workbench-v2.css')),
        searchVisible:!!document.getElementById('forgeToolSearch').getBoundingClientRect().width};
    });
    assert.equal(metrics.cards.length,8,'All eight original home tools must be present');
    assert.equal(metrics.navGroupCount,3,'Tools must retain three labeled navigator groups');
    assert.ok(metrics.styleLoaded,'Workbench design stylesheet not loaded');
    assert.ok(metrics.searchVisible,'Tool search missing');
    assert.ok(metrics.scrollWidth<=viewport.width+3,'Horizontal scroll at '+viewport.width);
    if(viewport.width>1000){
      assert.ok(metrics.grid.width>metrics.hero.width,'Studio catalog should be the main visual area');
      assert.ok(metrics.cards[0].width>metrics.cards[2].width*1.33,'Feature tools should not be identical small cards');
      assert.ok(metrics.cards[2].top>metrics.cards[0].top,'Compact tool tier must follow featured tools');
      assert.ok(metrics.grid.bottom>=viewport.height*.74,'Excess empty bottom band');
    }else{
      assert.ok(metrics.hero.height>=270,'Mobile editorial hero is compressed');
      assert.ok(metrics.cards[0].width>viewport.width*.78,'Mobile cards are clipped');
      assert.ok(metrics.grid.bottom>=metrics.cards.at(-1).top+130,'Mobile last tool outside scroll');
    }
    await page.screenshot({path:'artifacts/forge-browser/workbench-home-'+viewport.width+'.png',fullPage:viewport.width<=680});

    const search=page.locator('#forgeToolSearch');
    await search.fill('storyboard');
    await page.waitForFunction(()=>document.querySelectorAll('#homeContent .home-card.forge-filtered-out').length>=6);
    assert.ok(await page.locator('#homeContent .home-card.tool-story').isVisible(),'Matching Storyboard route disappeared');
    assert.ok((await page.locator('#forgeSearchCount').textContent()).trim().endsWith('/ 08'));
    await search.fill('unmatchedsearchzz987');
    assert.equal(await page.locator('#forgeNoResults').isVisible(),true,'Missing accessible search empty state');
    await search.press('Escape');
    assert.equal(await search.inputValue(),'');
    assert.equal(await page.locator('#homeContent > .home-card:visible').count(),8,'Escape must reset complete catalog');
    await page.evaluate(()=>document.activeElement?.blur?.());
    await page.keyboard.press('/');
    assert.equal(await search.evaluate(el=>document.activeElement===el),true,'Slash shortcut must focus search');
    await search.fill('PDF to Image');
    await search.press('Enter');
    await page.locator('#section-pdf.active').waitFor({state:'visible',timeout:12000});
    const nav=await page.locator('#nav-pdf-image').evaluate(el=>el.classList.contains('active'));
    assert.equal(nav,true,'Search enter must preserve original PDF route and selected tool');
    await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'),null,{timeout:8000});
    await page.screenshot({path:'artifacts/forge-browser/workbench-pdf-'+viewport.width+'.png'});
    assert.deepEqual(errors,[],viewport.width+': runtime errors');
    records.push({viewport,metrics,passed:true});
    await ctx.close();
  }
  console.log('FORGE_WORKBENCH_V2_QA '+JSON.stringify(records));
} finally {
  await browser.close();
}
