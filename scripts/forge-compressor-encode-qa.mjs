/* Production-like browser encode: synthetic public test pattern, no user media.
 * This tests the ACTUAL ffmpeg.wasm worker and downloaded MP4; the regular
 * UI smoke already tests navigation and controls. GitHub CI is not a real
 * user's hardware or a guarantee of exact output size on every input.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const root=path.resolve('artifacts/forge-compressor-encode');
const input=path.join(root,'synthetic-source.mp4');
const output=path.join(root,'verified-compressed.mp4');
fs.mkdirSync(root,{recursive:true});
if(!fs.existsSync(input))throw Error('Synthetic FFmpeg fixture was not generated');
const sourceBytes=fs.statSync(input).size;
assert.ok(sourceBytes>750_000,'Synthetic source unexpectedly small; fixture would not exercise encoding');
const targetMB=0.60;
assert.ok(sourceBytes>targetMB*1e6,'Fixture must exceed the target');
const logs=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  const context=await browser.newContext({viewport:{width:1920,height:1080},acceptDownloads:true});
  await context.addInitScript(()=>{
    try{sessionStorage.setItem('forge_intro_suppress','1');sessionStorage.setItem('forge_whatsnew_suppress','1');}catch{}
  });
  const page=await context.newPage();
  page.on('pageerror',e=>logs.push('PAGE_ERROR '+e.message));
  page.on('console',m=>{if(m.type()==='error')logs.push('CONSOLE_ERROR '+m.text());});
  page.on('requestfailed',r=>logs.push('REQUEST_FAILED '+r.url()+' '+r.failure()?.errorText));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('.home-card.tool-video').click();
  const iframe=page.frameLocator('#section-yt-helper iframe.forge-compressor-frame');
  await iframe.locator('#fileInput').waitFor({state:'attached',timeout:20000});
  await iframe.locator('#fileInput').setInputFiles(input);
  await iframe.locator('.batch-item').first().waitFor({timeout:15000});
  await iframe.locator('#targetSize').fill(String(targetMB));
  await iframe.locator('#compressButton').click();
  let itemText='';
  try{
    await iframe.locator('a.download-one').first().waitFor({state:'visible',timeout:240000});
  }catch(e){
    itemText=await iframe.locator('.batch-item').first().innerText().catch(()=>'<unavailable>');
    const errorBox=await iframe.locator('#errorBox').textContent().catch(()=>'<unavailable>');
    throw Error('Actual wasm encode did not finish: '+itemText+' | error: '+errorBox+' | browser: '+logs.slice(-10).join(' ; ')+' | '+String(e));
  }
  const item=iframe.locator('.batch-item').first();
  itemText=await item.innerText();
  const [download]=await Promise.all([
    page.waitForEvent('download',{timeout:60000}),
    iframe.locator('a.download-one').first().click()
  ]);
  await download.saveAs(output);
  const outputBytes=fs.statSync(output).size;
  assert.ok(outputBytes>10_000,'Output is empty or not a real MP4');
  assert.ok(outputBytes<sourceBytes,'Output did not reduce the original file');
  const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height','-of','json',output],{encoding:'utf8'}));
  const video=info.streams.find(x=>x.codec_type==='video');
  const audio=info.streams.find(x=>x.codec_type==='audio');
  assert.equal(video?.codec_name,'h264','Actual encoded video must be H.264');
  assert.equal(audio?.codec_name,'aac','Actual encoded audio must be AAC');
  assert.equal(video?.width,640,'Video dimensions must be retained');
  assert.equal(video?.height,360,'Video dimensions must be retained');
  assert.ok(Number(info.format?.duration)>4,'Output duration is too short');
  const result={sourceBytes,outputBytes,targetBytes:targetMB*1e6,
    reductionPercent:Math.round((1-outputBytes/sourceBytes)*100),
    durationSeconds:Number(info.format.duration),videoCodec:video.codec_name,
    audioCodec:audio.codec_name,videoWidth:video.width,videoHeight:video.height,
    targetMet:outputBytes<=targetMB*1e6,
    statusText:itemText.slice(0,400),consoleDiagnostics:logs.slice(-8)};
  fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(result,null,2));
  console.log('FORGE_ACTUAL_BROWSER_ENCODE_VERIFIED '+JSON.stringify(result));
  await context.close();
} finally {await browser.close();}
