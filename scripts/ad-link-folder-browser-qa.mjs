/* CTK Link Gen folder picker: real Chromium interaction and unchanged output logic. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';

const dir=mkdtempSync(join(tmpdir(),'ctk-link-folder-'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
  mkdirSync(join(dir,'Nested'));
  for(const name of ['Ad_10.mp4','Ad_2.jpg','Ad_1.png','notes.txt']){
    writeFileSync(join(dir,name),'fixture');
  }
  writeFileSync(join(dir,'Nested','ignore.jpg'),'fixture');
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[],uploads=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(['POST','PUT','PATCH'].includes(r.method()))uploads.push(r.url());});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!document.getElementById('alg-folder-picker') &&
    typeof Tools!=='undefined' && typeof Tools.AdLinkGen?.importFolder==='function');
  const picker=page.locator('#alg-folder-picker');
  await picker.setInputFiles(dir);
  assert.equal(await page.locator('#alg-input').inputValue(),'Ad_1.png\nAd_2.jpg\nAd_10.mp4');
  assert.match(await page.locator('#alg-folder-status').textContent(),/1 unsupported skipped/);
  assert.match(await page.locator('#alg-folder-status').textContent(),/1 nested excluded/);
  assert.equal(await page.locator('#alg-folder-preview li').count(),3);

  await page.locator('#alg-folder').fill('Campaign/Ads');
  await page.evaluate(()=>{Tools.AdLinkGen.generate();});
  const exposure=await page.locator('#alg-out-ads').inputValue();
  const storyboard=await page.locator('#alg-out-story').inputValue();
  assert.match(exposure,/Campaign\/Ads\/Ad_1\.png/);
  assert.ok(exposure.indexOf('Ad_2.jpg') < exposure.indexOf('Ad_10.mp4'));
  assert.match(storyboard,/Ad_10\.jpg/);

  await page.locator('#alg-input').fill('Manual_9.mp3\nManual_1.jpg');
  assert.equal(await page.locator('#alg-folder-preview li').count(),2);
  assert.match(await page.locator('#alg-folder-status').textContent(),/Manual entry/);
  await page.evaluate(()=>{Tools.AdLinkGen.generate();});
  assert.match(await page.locator('#alg-out-ads').inputValue(),/Manual_9\.mp3/);

  await picker.setInputFiles(dir);
  assert.equal(await page.locator('#alg-input').inputValue(),'Ad_1.png\nAd_2.jpg\nAd_10.mp4',
    'reimporting the same folder must work');
  assert.deepEqual(errors,[],'browser runtime errors');
  assert.deepEqual(uploads,[],'local files must never be posted to any endpoint');
  console.log('CTK_LINK_FOLDER_BROWSER_QA PASS');
  await page.close();
}finally{
  await browser.close();
  rmSync(dir,{recursive:true,force:true});
}
