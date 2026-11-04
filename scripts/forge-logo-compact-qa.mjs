/* Playwright visual and behavior contract for the approved compact Logo Resizer.
   Uses real CTK tool routes/processing, not the standalone proposal demo. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const dir='artifacts/forge-browser';
fs.mkdirSync(dir,{recursive:true});

try{
  for(const viewport of [{width:1366,height:768},{width:1440,height:900},
    {width:1920,height:1080},{width:2560,height:1440}]){
    const context=await browser.newContext({viewport,acceptDownloads:true});
    await context.addInitScript(()=>{
      window.__forgeDisableSharedHandoff=true;
      sessionStorage.setItem('forge_intro_suppress','1');
      sessionStorage.setItem('forge_whatsnew_suppress','1');
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.locator('.home-card.tool-logo').click();
    await page.locator('#section-logo').waitFor({state:'visible',timeout:12000});
    await page.waitForTimeout(400);
    const baseline=await page.evaluate(()=>{
      const r=sel=>{const x=document.querySelector(sel).getBoundingClientRect();
        return {top:x.top,bottom:x.bottom,left:x.left,right:x.right,width:x.width,height:x.height}};
      return {
        top:r('#section-logo .tool-header'),settings:r('#section-logo .sidebar-panel'),
        board:r('#logoGrid'),
        groups:[...document.querySelectorAll('#logoControls > .glass-panel')].map(x=>x.getBoundingClientRect().top),
        firstGroup:r('#logoControls > .glass-panel:nth-child(3)'),
        secondGroup:r('#logoControls > .glass-panel:nth-child(1)'),
        thirdGroup:r('#logoControls > .glass-panel:nth-child(2)'),
        oldHeader:getComputedStyle(document.querySelector('body > .header')).display,
        sidebar:getComputedStyle(document.querySelector('#mainSidebar')).display,
        grid:getComputedStyle(document.querySelector('#section-logo .editor-layout')).display,
        pageOverflow:document.documentElement.scrollWidth>innerWidth+3
      };
    });
    const dimensionInputs=await page.evaluate(()=>['exportWidth','exportHeight'].map(id=>{const el=document.getElementById(id),s=getComputedStyle(el),r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return{id,value:el.value,display:s.display,visibility:s.visibility,opacity:s.opacity,width:r.width,height:r.height,left:r.left,top:r.top,parentWidth:p.width,parentHeight:p.height};}));
    console.log('LOGO_DIMENSION_INPUT_GEOMETRY '+JSON.stringify({viewport,dimensionInputs}));
    assert.equal(baseline.oldHeader,'none','Old header still wastes vertical space at '+viewport.width);
    assert.equal(baseline.grid,'grid','Logo tool not laid out as a two-row workspace');
    assert.ok(baseline.top.height>=64&&baseline.top.height<=75,'Compact header wrong: '+JSON.stringify(baseline));
    assert.ok(baseline.settings.height>=99&&baseline.settings.height<=111,'Settings strip wrong: '+JSON.stringify(baseline));
    assert.ok(Math.abs(baseline.settings.width-baseline.board.width)<5,
      'Settings bar is clipped to the legacy sidebar width: '+JSON.stringify(baseline));
    assert.ok(Math.max(...baseline.groups)-Math.min(...baseline.groups)<12,'Three setting groups are not on one line');
    assert.ok(baseline.firstGroup.left<baseline.secondGroup.left&&baseline.secondGroup.left<baseline.thirdGroup.left,
      'Settings are not Export, Text, Layout');
    assert.ok(baseline.board.top>=baseline.settings.bottom-3,'Board overlaps settings');
    const layoutLabels=await page.locator('#logoControls > .glass-panel:nth-child(2) > div > .label-header').evaluateAll(nodes=>nodes.map(el=>({text:el.textContent.trim(),visible:el.getBoundingClientRect().width>0,clipped:el.scrollWidth>el.clientWidth+1})));
    assert.equal(layoutLabels.length,2,'Both original Layout Adjust labels must exist');
    const syncLabel=await page.locator('#syncFilenameToggle').evaluate(el=>{const label=el.closest('label'),group=el.closest('.glass-panel'),r=label.getBoundingClientRect(),g=group.getBoundingClientRect();return{text:label.textContent.trim(),right:r.right,groupRight:g.right,clipped:r.right>g.right-3||label.scrollWidth>label.clientWidth+1};});
    assert.ok(!syncLabel.clipped,'Sync Filename is clipped in Text Settings: '+JSON.stringify({viewport,syncLabel}));
    assert.ok(layoutLabels.every(el=>el.visible&&!el.clipped),'Layout Adjust labels clipped: '+JSON.stringify({viewport,layoutLabels}));
    assert.equal(baseline.pageOverflow,false,'Unexpected horizontal overflow');
    assert.equal((await page.locator('#section-logo .tool-header > h2').textContent()).trim(),
      'Logo Resizer','Breadcrumb must not change the original tool heading');
    const headerAlignment=await page.evaluate(()=>{
      const header=document.querySelector('#section-logo .tool-header');
      const heading=header.querySelector(':scope > h2');
      const brand=header.querySelector(':scope > .forge-logo-home');
      const icon=header.querySelector(':scope > .tool-icon');
      const actions=header.querySelector(':scope > .drop-zone');
      const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,centerX:r.left+r.width/2,centerY:r.top+r.height/2,width:r.width};};
      return {header:rect(header),heading:rect(heading),brand:rect(brand),icon:rect(icon),
        actions:rect(actions),headingFont:getComputedStyle(heading).fontFamily,
        headingWeight:getComputedStyle(heading).fontWeight,
        homeFont:getComputedStyle(document.querySelector('#homeContent .tool-logo .home-card-title')).fontFamily};
    });
    assert.ok(Math.abs(headerAlignment.heading.centerX-headerAlignment.header.centerX)<
      (viewport.width>=1200?3:35),'Logo title not centered: '+JSON.stringify(headerAlignment));
    assert.ok(Math.abs(headerAlignment.heading.centerY-headerAlignment.header.centerY)<3,
      'Logo title not vertically centered: '+JSON.stringify(headerAlignment));
    assert.ok(headerAlignment.brand.right+12<headerAlignment.heading.left,
      'The Forge overlaps Logo Resizer: '+JSON.stringify(headerAlignment));
    assert.ok(headerAlignment.heading.right+12<headerAlignment.actions.left,
      'Logo Resizer overlaps the upload actions: '+JSON.stringify(headerAlignment));
    assert.ok(headerAlignment.icon.right<headerAlignment.brand.left,
      'Brand control overlaps icon: '+JSON.stringify(headerAlignment));
    assert.equal(headerAlignment.headingFont,headerAlignment.homeFont,
      'Logo heading must use the same font as homepage tool titles');
    assert.equal(headerAlignment.headingWeight,'750',
      'Logo heading must match homepage tool-title weight');
    assert.ok(await page.locator('#section-logo .tool-header > .forge-logo-home').isVisible(),
      'Existing Home action must remain available in the compact title');
    await page.screenshot({path:dir+'/logo-compact-empty-'+viewport.width+'.png'});
    if(viewport.width!==1440){await context.close();continue;}

    await page.locator('#exportWidth').fill('200');
    await page.locator('#exportHeight').fill('200');
    const image=await page.evaluate(()=>{
      const c=document.createElement('canvas');
      c.width=200;c.height=200;
      const ctx=c.getContext('2d');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,200,200);
      ctx.fillStyle='#1e513a';ctx.beginPath();ctx.arc(100,90,57,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.fillRect(94,39,12,101);
      return c.toDataURL('image/png').split(',')[1];
    });
    await page.locator('#logoInput').setInputFiles([
      {name:'arc.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')},
      {name:'field.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')}
    ]);
    await page.locator('#logoDimensionOverlay').waitFor({state:'visible',timeout:7000});
    await page.locator('#logoDimWidth').fill('200');
    await page.locator('#logoDimHeight').fill('200');
    await page.locator('#logoDimOkBtn').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('#logoGrid > .logo-card-item')].length===2 &&
      [...document.querySelectorAll('#logoGrid > .logo-card-item canvas')].every(c=>c.width===200&&c.height===200),
    null,{timeout:12000});
    await page.waitForTimeout(300);
    const measure=()=>page.locator('#logoGrid > .logo-card-item').first().evaluate(card=>{
      const c=card.querySelector('.card-preview-area canvas');
      const rect=c.getBoundingClientRect(),outer=card.getBoundingClientRect();
      return {pixels:[c.width,c.height],visual:[rect.width,rect.height],card:outer.width,stage:card.querySelector('.card-preview-area').getBoundingClientRect().height};
    });
    let m=await measure();
    assert.ok(m.card>=225&&m.card<=250&&Math.abs(m.visual[0]-m.visual[1])<2&&m.stage<=240,
      '200x200 must be a compact truthful square: '+JSON.stringify(m));
    await page.screenshot({path:dir+'/logo-compact-populated-1440.png',fullPage:true});
    for(const [w,h,ratio] of [[400,200,2],[200,400,.5],[1080,1080,1]]){
      await page.locator('#exportWidth').fill(String(w));
      await page.locator('#exportHeight').fill(String(h));
      await page.waitForFunction(([x,y])=>{
        const c=document.querySelector('#logoGrid > .logo-card-item canvas');
        return c&&c.width===x&&c.height===y;
      },[w,h],{timeout:9000});
      await page.waitForTimeout(150);
      m=await measure();
      assert.deepEqual(m.pixels,[w,h],'Real canvas backing pixels changed unexpectedly');
      assert.ok(Math.abs(m.visual[0]/m.visual[1]-ratio)<.045,
        'Visual preview does not match output ratio '+w+'x'+h+': '+JSON.stringify(m));
      assert.ok(m.card>=225&&m.card<=330,'Card width escaped bounded range: '+JSON.stringify(m));
    }

    await page.locator('#exportWidth').fill('200');
    await page.locator('#exportHeight').fill('200');
    await page.locator('#logoGrid > .logo-card-item .card-preview-area').first().click();
    await page.locator('#logoDetailOverlay.active').waitFor({state:'visible'});
    const detail=await page.evaluate(()=>{
      const a=document.getElementById('logoDetailOverlay').getBoundingClientRect();
      const s=document.querySelector('#section-logo .sidebar-panel').getBoundingClientRect();
      return {top:a.top,bottom:a.bottom,settingsBottom:s.bottom,
        present:['logoDetailText','logoDetailFontSize','logoDetailPaddingSlider','logoDetailImgSlider',
          'logoDetailTxtSlider','logoDetailDownload','logoDetailDelete'].every(id=>!!document.getElementById(id))};
    });
    assert.ok(detail.present,'Original Focus controls changed');
    assert.ok(detail.top>=detail.settingsBottom-3,'Focus panel overlays settings');
    await page.screenshot({path:dir+'/logo-compact-focus-1440.png'});
    await page.locator('#logoDetailClose').click();
    await page.locator('#logoDetailOverlay').waitFor({state:'hidden'});
    const downloadPromise=page.waitForEvent('download',{timeout:15000});
    await page.locator('#exportAllBtn').click();
    const download=await downloadPromise;
    assert.match(download.suggestedFilename(),/\.zip$/i,'Original batch ZIP export is broken');

    // All eight tools use the same unified header while retaining their original actions.
    await page.locator('#mainSidebar [id="nav-pdf-image"]').click();
    await page.locator('#section-pdf').waitFor({state:'visible',timeout:10000});
    const otherHeader=await page.locator('body > .header').evaluate(el=>getComputedStyle(el).display);
    assert.equal(otherHeader,'none','The global header must be hidden on every active tool route');
    assert.ok(await page.locator('#section-pdf .forge-tool-home').isVisible(),
      'PDF tool must expose the shared Home link');

    assert.deepEqual(errors,[],'Runtime error in Logo Resizer UI: '+errors.join('; '));
    await context.close();
    console.log('LOGO_COMPACT_PASS '+JSON.stringify({viewport,baseline:baseline.settings,measure:m}));
  }
}finally{
  await browser.close();
}
