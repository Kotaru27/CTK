/* Production-like browser encode: synthetic public test pattern, no user media.
 * This tests the ACTUAL ffmpeg.wasm worker and downloaded MP4; the regular
 * UI smoke already tests navigation and controls. GitHub CI is not a real
 * user's hardware or a guarantee of exact output size on every input.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {chromium} from 'playwright';

const root=path.resolve('artifacts/forge-compressor-encode');
const highAudio=process.env.FORGE_QA_HIGH_AUDIO==='1';
const input=path.join(root,highAudio?'synthetic-high-audio.mp4':'synthetic-source.mp4');
const browserChannel=process.env.FORGE_BROWSER_CHANNEL==='chrome'?'chrome':null;
const forceWasm=process.env.FORGE_COMPARE_WASM==='1';
const variant=(browserChannel||'chromium')+(forceWasm?'-wasm':'')+(highAudio?'-high-audio':'');
const output=path.join(root,'verified-compressed-'+variant+'.mp4');
fs.mkdirSync(root,{recursive:true});
if(!fs.existsSync(input))throw Error('Synthetic FFmpeg fixture was not generated');
const sourceBytes=fs.statSync(input).size;
assert.ok(sourceBytes>750_000,'Synthetic source unexpectedly small; fixture would not exercise encoding');
const targetMB=0.60;
assert.ok(sourceBytes>targetMB*1e6,'Fixture must exceed the target');
const logs=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(browserChannel?{channel:browserChannel}:{})});
try {
  const context=await browser.newContext({viewport:{width:1920,height:1080},acceptDownloads:true});
  await context.addInitScript(()=>{
    try {
      sessionStorage.setItem('forge_intro_suppress','1');
      sessionStorage.setItem('forge_whatsnew_suppress','1');
    } catch {}
  });
  const page=await context.newPage();
  // Simulate the native engine being unavailable via a local asset
  // request failure. This exercises the real production fallback without
  // adding any production-only test toggle.
  if(forceWasm){
    await page.route('**/compressor/vendor/mediabunny-1.61.6.mjs',
      route=>route.abort('failed'));
  }
  page.on('pageerror',e=>logs.push('PAGE_ERROR '+e.message));
  page.on('console',m=>{if(m.type()==='error'||m.text().startsWith('FORGE_NATIVE_FALLBACK'))logs.push('CONSOLE '+m.text());});
  page.on('requestfailed',r=>logs.push('REQUEST_FAILED '+r.url()+' '+r.failure()?.errorText));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('.home-card.tool-video').click();
  const iframe=page.frameLocator('#section-yt-helper iframe.forge-compressor-frame');
  await iframe.locator('#fileInput').waitFor({state:'attached',timeout:20000});
  const nativeSupport=await iframe.locator('html').evaluate(async()=>{
    if(typeof VideoEncoder!=='function'||typeof VideoDecoder!=='function')return {api:false};
    try{
      const probe=await VideoEncoder.isConfigSupported({
        codec:'avc1.42001e',width:640,height:360,bitrate:550_000,framerate:24,
        hardwareAcceleration:'no-preference'
      });
      let aacSupported=false;
      try{
        if(typeof AudioEncoder==='function'){
          const audio=await AudioEncoder.isConfigSupported({
            codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:160_000
          });
          aacSupported=!!audio.supported;
        }
      }catch{}
      return {api:true,avcSupported:!!probe.supported,aacSupported};
    }catch(e){return {api:true,error:String(e)};}
  });
  console.log('FORGE_BROWSER_NATIVE_SUPPORT',JSON.stringify(nativeSupport));
  await iframe.locator('#fileInput').setInputFiles(input);
  await iframe.locator('.batch-item').first().waitFor({timeout:15000});
  await iframe.locator('#targetSize').fill(String(targetMB));
  await iframe.locator('#compressButton').click();
  const startTime=Date.now();
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
  if(highAudio)console.log('FORGE_HIGH_AUDIO_RESULT',JSON.stringify({
    browser:variant,nativeSupport,engineHint:itemText.includes('Native H.264')?'native':'wasm',
    recentDiagnostics:logs.slice(-8),resultText:itemText.slice(-550)
  }));
  if(nativeSupport.avcSupported && (!highAudio || nativeSupport.aacSupported) && !forceWasm){
    assert.match(itemText,/Native H\.264 encoding completed/,
      'Browser supports H264 native encoding but silently fell back to FFmpeg.');
  }
  if(forceWasm)assert.match(itemText,/Size-aware encoding|Quality-focused two-pass/,
    'Forced FFmpeg comparison did not use the established software path.');

  const [download]=await Promise.all([
    page.waitForEvent('download',{timeout:60000}),
    iframe.locator('a.download-one').first().click()
  ]);
  await download.saveAs(output);
  const outputBytes=fs.statSync(output).size;
  assert.ok(outputBytes>10_000,'Output is empty or not a real MP4');
  assert.ok(outputBytes<sourceBytes,'Output did not reduce the original file');
  const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height,bit_rate','-of','json',output],{encoding:'utf8'}));
  const video=info.streams.find(x=>x.codec_type==='video');
  const audio=info.streams.find(x=>x.codec_type==='audio');
  assert.equal(video?.codec_name,'h264','Actual encoded video must be H.264');
  assert.equal(audio?.codec_name,'aac','Actual encoded audio must be AAC');
  if(highAudio){
    const audioKbps=Number(audio?.bit_rate)/1000;
    assert.ok(Number.isFinite(audioKbps)&&audioKbps>=48&&audioKbps<300,
      'Native high-bitrate AAC source must be re-encoded under the size budget');
  }
  assert.equal(video?.width,640,'Video dimensions must be retained');
  assert.equal(video?.height,360,'Video dimensions must be retained');
  assert.ok(Number(info.format?.duration)>4,'Output duration is too short');
  // Compare decoded frames only on synthetic input. SSIM is useful
  // regression telemetry, not a promise of perceptual identity.
  const compare=spawnSync('ffmpeg',['-hide_banner','-i',input,'-i',output,
    '-lavfi','ssim','-f','null','-'],{encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024});
  const ssimMatch=compare.stderr?.match(/SSIM\s+Y:[^\n]*?All:([\d.]+)/);
  const ssim=compare.status===0 && ssimMatch?Number(ssimMatch[1]):null;
  assert.ok(ssim===null || ssim>0.90,'Synthetic video has severe measured visual degradation');
  const result={sourceBytes,outputBytes,targetBytes:targetMB*1e6,ssim,
    reductionPercent:Math.round((1-outputBytes/sourceBytes)*100),
    durationSeconds:Number(info.format.duration),videoCodec:video.codec_name,
    audioCodec:audio.codec_name,videoWidth:video.width,videoHeight:video.height,
    targetMet:outputBytes<=targetMB*1e6,
    browser:variant,forcedWasm:forceWasm,highAudio,nativeSupport,
    engine:itemText.includes('Native H.264 encoding completed')?'native':'wasm-fallback',
    encodeWallMs:Date.now()-startTime,
    statusText:itemText.slice(0,400),consoleDiagnostics:logs.slice(-8)};
  fs.writeFileSync(path.join(root,'result-'+variant+'.json'),JSON.stringify(result,null,2));
  console.log('FORGE_ACTUAL_BROWSER_ENCODE_VERIFIED '+JSON.stringify(result));
  await context.close();
} finally {await browser.close();}
