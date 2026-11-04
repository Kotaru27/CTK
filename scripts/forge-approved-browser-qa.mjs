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
 for(const viewport of [{width:2048,height:1013},{width:1440,height:900},{width:390,height:844}]){
  const ctx=await browser.newContext({viewport,reducedMotion:'no-preference'});
  await ctx.addInitScript(()=>{sessionStorage.setItem('forge_whatsnew_suppress','1')});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.classList.contains('forge-swap-ready'),null,{timeout:9000});
  await page.locator('#forgeIntro.forge-swap-prepared').waitFor({state:'visible'});
  assert.equal(await page.locator('#forgeIntro .forge-cine-piece').count(),8);
  // Catch the production regression where self-referential --tile/--step
  // collapsed all 8 F icons into virtually invisible dots.
  const tileGeometry=await page.evaluate(()=>{
    const pieces=[...document.querySelectorAll('#forgeIntro .forge-cine-piece')];
    const assembly=document.querySelector('#forgeIntro .forge-cine-assembly');
    const rect=assembly.getBoundingClientRect();
    return {
      widths:pieces.map(p=>p.offsetWidth),
      heights:pieces.map(p=>p.offsetHeight),
      assemblyWidth:rect.width,
      assemblyHeight:rect.height,
      iconWidths:pieces.map(p=>p.querySelector('svg')?.getBoundingClientRect().width||0)
    };
  });
  assert.ok(tileGeometry.widths.every(n=>n>=23) &&
    tileGeometry.heights.every(n=>n>=23) &&
    tileGeometry.iconWidths.every(n=>n>=12) &&
    tileGeometry.assemblyWidth>=95 && tileGeometry.assemblyHeight>=145,
    'F tiles collapsed or are missing: '+JSON.stringify(tileGeometry));
  console.log('APPROVED_INTRO_TILE_GEOMETRY '+JSON.stringify({viewport,tileGeometry}));
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
  // Check the final assembled F, not just tile layout before animation.
  await page.waitForFunction(()=>{
    const intro=document.getElementById('forgeIntro');
    const pieces=[...document.querySelectorAll('#forgeIntro .forge-cine-piece')];
    return intro&&!intro.classList.contains('forge-swap-releasing')&&pieces.length===8&&
      pieces.every(p=>Number(getComputedStyle(p).opacity)>.97);
  },null,{timeout:4500});
  const assembled=await page.evaluate(()=>{
    const assembly=document.querySelector('#forgeIntro .forge-cine-assembly').getBoundingClientRect();
    return [...document.querySelectorAll('#forgeIntro .forge-cine-piece')].map(p=>{
      const rect=p.getBoundingClientRect();
      return {x:Math.round(rect.left-assembly.left),y:Math.round(rect.top-assembly.top),
        width:rect.width,height:rect.height,opacity:getComputedStyle(p).opacity};
    });
  });
  assert.ok(assembled.every(p=>p.width>=23&&p.height>=23),
    'Visible F formation still has collapsed tiles: '+JSON.stringify(assembled));
  console.log('APPROVED_FORMED_F '+JSON.stringify({viewport,assembled}));
  await page.screenshot({path:screenshots+'/approved-formed-F-'+viewport.width+'.png'});

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
    completed:document.documentElement.dataset.forgeIntroFinished,
    homeBounds:(()=>{const x=document.querySelector('#view-home').getBoundingClientRect();return{left:x.left,width:x.width}})(),
    approvedBounds:(()=>{const x=document.querySelector('.forge-approved-home').getBoundingClientRect();return{left:x.left,width:x.width}})(),
    gridWidth:document.querySelector('#homeContent').getBoundingClientRect().width,
    gridTop:document.querySelector('#homeContent').getBoundingClientRect().top,
    artTextOverlaps:nodes.map(card=>{const art=card.querySelector('.home-card-art'),label=card.querySelector('.home-card-title');
      if(!art||!label)return false;const a=art.getBoundingClientRect(),t=label.getBoundingClientRect();
      return a.bottom>t.top+2&&a.top<t.bottom-2&&a.right>t.left+2&&a.left<t.right-2;
    }),
    featuredLabel:document.getElementById('forgeApprovedFeaturedMount')?.textContent.trim(),
    cardsBounds:nodes.map(n=>({width:n.getBoundingClientRect().width, title:n.querySelector('.home-card-title')?.getBoundingClientRect().width}))
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
  // A full-width workbench is essential; the previous release rendered a
  // roughly 670px-wide site in a 2048px desktop screenshot.
  assert.ok(actual.approvedBounds.width>=viewport.width*.92 &&
    actual.homeBounds.width>=viewport.width*.92 &&
    actual.approvedBounds.left>=-2 &&
    actual.approvedBounds.left<viewport.width*.05,
    'Home is trapped in a narrow centered column: '+JSON.stringify(actual));
  const requiredGridWidth=viewport.width>1000?viewport.width*.43:viewport.width*.72;
  assert.ok(actual.gridWidth>=requiredGridWidth,
    'Eight tools are compressed into an unusable grid: '+JSON.stringify(actual));
  assert.ok(actual.cardsBounds.every(n=>n.width>=100&&n.title>=65),
    'Tool labels are compressed: '+JSON.stringify(actual.cardsBounds));
  if(viewport.width<=560){
    assert.ok(actual.gridTop<535, 'Mobile cards start too far below the fold: '+JSON.stringify(actual));
    assert.ok(actual.artTextOverlaps.every(x=>!x),
      'Mobile artwork still covers tool names: '+JSON.stringify(actual.artTextOverlaps));
  }
  assert.equal(actual.featuredLabel,'Select a workspace',
    'Featured tool label contains duplicate placeholder text');
  console.log('APPROVED_HOME_GEOMETRY '+JSON.stringify({viewport,
    home:actual.homeBounds,approved:actual.approvedBounds,
    gridWidth:actual.gridWidth,cards:actual.cardsBounds}));
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
