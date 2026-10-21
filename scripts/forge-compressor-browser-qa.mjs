import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import fs from 'node:fs';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  await context.addInitScript(()=>{
    try {
      sessionStorage.setItem('forge_intro_suppress','1');
      sessionStorage.setItem('forge_whatsnew_suppress','1');
    } catch {}
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push('Forge: '+String(e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.locator('.home-card.tool-video').click({timeout:20000});
  await page.locator('#section-yt-helper.forge-route-running, #section-yt-helper.active').first().waitFor({timeout:15000}).catch(()=>{});
  const section=page.locator('#section-yt-helper');
  await section.waitFor({state:'visible',timeout:15000});
  assert.equal((await section.locator('.forge-compressor-surface > .tool-header h2').textContent()).trim(),'Video Compressor');
  assert.equal(await section.locator('#ytUrlInput').isVisible(),false,'Legacy download input must stay hidden');

  const frame=page.frameLocator('#section-yt-helper iframe.forge-compressor-frame');
  await frame.locator('#targetSize').waitFor({timeout:25000});
  assert.equal(await frame.locator('#targetSize').inputValue(),'8');
  assert.equal(await frame.locator('#fileInput').count(),1);
  const accent=await frame.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--accent').trim());
  assert.equal(accent,'#2c694a','Compressor must match Forge green accents');
  assert.equal(await frame.locator('.site-header').isVisible(),false,'Standalone brand header should be hidden');

  assert.equal(await frame.locator('.batch-columns').isVisible(),false,'Empty queue should not show a five-column data header');
  assert.equal(await frame.locator('#previewDialog').evaluate(el=>el.open),false,'A preview must never auto-open');
  await frame.locator('#fileInput').setInputFiles([{
    name:'sample-video.mp4',mimeType:'video/mp4',buffer:Buffer.from('minimal synthetic QA payload')
  }]);
  await frame.locator('.batch-item').first().waitFor({timeout:15000});
  assert.equal(await frame.locator('.batch-item').count(),1);
  assert.equal(await frame.locator('.item-name').first().textContent(),'sample-video.mp4');
  assert.equal(await frame.locator('#compressButton').isEnabled(),true,'Compression controls not activated');
  await frame.locator('#targetSize').fill('6.5');
  assert.equal(await frame.locator('#targetSize').inputValue(),'6.5');
  await frame.locator('.item-actions button').filter({hasText:'Preview'}).click();
  assert.equal(await frame.locator('#previewDialog').evaluate(el=>el.open),true,'Preview dialog not opened');
  await frame.locator('#closePreview').click();
  assert.equal(await frame.locator('#previewDialog').evaluate(el=>el.open),false,'Preview did not close');

  // This tool is for batch processing: validate all five rows, long file names,
  // and a preview that stays opt-in, rather than testing only a single upload.
  const additional=Array.from({length:4},(_,i)=>({
    name:'AD'+(i+2)+'_Campaign_Very_Long_Descriptive_Filename_Keep_User_File_Identity_'+(i+2)+'.mp4',
    mimeType:'video/mp4',
    buffer:Buffer.from('synthetic queue-only fixture '+i)
  }));
  await frame.locator('#fileInput').setInputFiles(additional);
  await frame.locator('.batch-item').nth(4).waitFor({timeout:15000});
  assert.equal(await frame.locator('.batch-item').count(),5,'All five files must appear as separate rows');
  assert.equal(await frame.locator('.item-name').count(),5,'Each uploaded video retains its filename');
  assert.equal(await frame.locator('.batch-columns').isVisible(),true,'Loaded queue needs column context');
  assert.equal(await frame.locator('#previewDialog').evaluate(el=>el.open),false,'Adding files must not auto-preview them');
  assert.equal(await frame.locator('.item-quality').count(),5,'Quality guidance belongs to each video row');
  assert.equal(await frame.locator('#compressButton').isEnabled(),true,'Five-file batch must be compressible');
  fs.mkdirSync('artifacts/forge-browser',{recursive:true});
  for (const [label,width,height] of [['fullhd',1920,1080],['compact',1366,768]]) {
    await page.setViewportSize({width,height});
    const metrics=await frame.locator('html').evaluate(()=>{
      const rows=[...document.querySelectorAll('.batch-item')];
      const list=document.getElementById('batchList');
      const queue=document.querySelector('.batch-panel');
      return {
        rows:rows.length, viewport:innerWidth,
        documentWidth:document.documentElement.scrollWidth,
        overflowingRows:rows.filter(r=>r.scrollWidth>r.clientWidth+2).length,
        previewOpen:document.getElementById('previewDialog').open,
        listOverflow:getComputedStyle(list).overflowY,
        headerVisible:getComputedStyle(document.querySelector('.batch-columns')).display!=='none',
        ledgerRows:rows.every(r=>getComputedStyle(r).borderBottomWidth!=='0px'),
        queueHeight:Math.round(queue.getBoundingClientRect().height)
      };
    });
    assert.equal(metrics.rows,5,label+': Five videos must remain in the queue');
    assert.equal(metrics.previewOpen,false,label+': Preview opened without user action');
    assert.equal(metrics.overflowingRows,0,label+': Row content overflows the queue');
    assert.ok(metrics.documentWidth<=metrics.viewport+3,label+': Horizontal scroll from five-file layout '+JSON.stringify(metrics));
    assert.equal(metrics.headerVisible,true,label+': Column context missing');
    console.log('FORGE_FIVE_FILE_BATCH_LAYOUT',label,JSON.stringify(metrics));
    await page.screenshot({path:'artifacts/forge-browser/compressor-five-'+label+'.png'});
  }
  await page.setViewportSize({width:1920,height:1080});

  assert.deepEqual(errors,[],'Client-side page errors');
  console.log('Forge Video Compressor UI smoke PASS: home route, heading, hidden legacy, theme, queued upload, target control, preview');
  await context.close();
} finally {await browser.close();}
