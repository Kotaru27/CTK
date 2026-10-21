import assert from 'node:assert/strict';
import {chromium} from 'playwright';

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

  assert.deepEqual(errors,[],'Client-side page errors');
  console.log('Forge Video Compressor UI smoke PASS: home route, heading, hidden legacy, theme, queued upload, target control, preview');
  await context.close();
} finally {await browser.close();}
