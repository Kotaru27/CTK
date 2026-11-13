/* CTK V6 multi-video manual-selection QA: synthetic local fixtures only. */
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const directory=mkdtempSync(join(tmpdir(),'ctk-v6-qa-'));
const source=join(directory,'motion.mp4');
let browser;
try{
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi',
    '-i','testsrc2=size=320x180:rate=8:duration=2.3',
    '-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',source]);
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
  const runtimeErrors=[];
  page.on('pageerror',e=>runtimeErrors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof Tools!=='undefined'&&!!Tools.Stills?.els?.input);
  const data=readFileSync(source);
  await page.evaluate(()=>{
    const original=Tools.Stills.seekV6;
    Tools.Stills.seekV6=async function(...args){
      await new Promise(resolve=>setTimeout(resolve,85));
      return original.apply(this,args);
    };
  });
  await page.locator('#stillsInput').setInputFiles([
    {name:'same-name.mp4',mimeType:'video/mp4',buffer:data},
    {name:'same-name.mp4',mimeType:'video/mp4',buffer:data}
  ]);
  const pendingCard=page.locator('#stillsStacksContainer .pdf-stack-wrapper').first();
  await pendingCard.waitFor({state:'attached',timeout:15000});
  const pending=await pendingCard.evaluate(card=>({
    src:card.querySelector('img')?.getAttribute('src'),
    placeholder:card.querySelector('.stills-pending-preview')?.hidden,
    status:card.querySelector('.stack-count')?.textContent
  }));
  assert.equal(pending.src,null,'loading card must not request an empty thumbnail URL');
  assert.equal(pending.placeholder,false,'the neutral loading placeholder is visible');
  await page.waitForFunction(()=>{
    const card=document.querySelector('#stillsStacksContainer .pdf-stack-wrapper');
    return !!card?.querySelector('img')?.src?.startsWith('blob:')&&
      card.querySelector('.stills-pending-preview')?.hidden===true;
  },null,{timeout:25000});
  await page.waitForFunction(()=>{
    const tool=Tools.Stills;
    return tool.queue.length===0&&!tool._processing&&Object.keys(tool.collection).length===2;
  },null,{timeout:120000});
  const state=await page.evaluate(()=>{
    const t=Tools.Stills;
    return Object.entries(t.collection).map(([id,v])=>({
      id,name:v.name,total:v.frames.filter(f=>f.type==='still').length,
      checked:v.frames.filter(f=>f.type==='still'&&f.checked).length,
      allUnchecked:v.frames.filter(f=>f.type==='still').every(f=>f.checked===false),
      errors:v.failures?.length||0,hasCurationReport:!!v.v6Summary
    }));
  });
  assert.equal(state.length,2);
  assert.notEqual(state[0].name,state[1].name,'same source filename must create distinct collections');
  assert.ok(state.every(v=>v.total>0),'each video must expose decoded captures');
  assert.ok(state.every(v=>v.checked===0&&v.allUnchecked&&!v.hasCurationReport),
    'every captured frame from every video must begin unchecked without smart curation');
  await page.evaluate(id=>Tools.Stills.openDetail(id),state[0].id);
  const count=await page.locator('#stillsOverlayGrid .detail-check').count();
  assert.equal(count,state[0].total,'all stills must remain visible including unchecked ones');
  await page.evaluate(()=>{
    const cb=document.querySelector('#stillsOverlayGrid .detail-check');
    cb.checked=!cb.checked;cb.dispatchEvent(new Event('change',{bubbles:true}));
  });
  const changed=await page.evaluate(id=>Tools.Stills.collection[id].frames[0].checked,state[0].id);
  await page.evaluate(id=>Tools.Stills.openDetail(id),state[1].id);
  await page.evaluate(id=>Tools.Stills.openDetail(id),state[0].id);
  const persisted=await page.evaluate(id=>Tools.Stills.collection[id].frames[0].checked,state[0].id);
  assert.equal(persisted,changed,'manual choice survives switching collections');
  assert.equal(await page.locator('#stillsResetSmartSelection').count(),0,
    'obsolete Smart Selection reset control must be removed');
  await page.locator('#stillsSelectAll').check();
  assert.ok(await page.evaluate(id=>
    Tools.Stills.collection[id].frames.filter(f=>f.type==='still').every(f=>f.checked),state[0].id),
    'Select all checks every frame in only the current video');
  assert.ok(await page.evaluate(id=>
    Tools.Stills.collection[id].frames.filter(f=>f.type==='still').every(f=>!f.checked),state[1].id),
    'Select all must not modify a different video');
  await page.locator('#stillsSelectAll').uncheck();
  assert.ok(await page.evaluate(id=>
    Tools.Stills.collection[id].frames.filter(f=>f.type==='still').every(f=>!f.checked),state[0].id),
    'Deselect all restores the unchecked state');
  // Select one frame in each collection for the existing ZIP export workflow.
  await page.evaluate(()=>{
    for(const entry of Object.values(Tools.Stills.collection))
      if(entry.frames[0])entry.frames[0].checked=true;
  });
  const [download]=await Promise.all([
    page.waitForEvent('download',{timeout:45000}),
    page.evaluate(()=>Tools.Stills.downloadAll())
  ]);
  const result=execFileSync('unzip',['-Z1',await download.path()],{encoding:'utf8'});
  assert.match(result,/same-name\//);
  assert.match(result,/same-name_2\//);

  // A portrait-format advertisement with plain sidebars and a tiny corner mark
  // is technically decodable but must not be a confident smart export.
  const sparseSource=join(directory,'sparse-portrait.mp4');
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi',
    '-i','color=c=gray:size=320x180:rate=8:duration=2.3',
    '-vf','drawbox=x=112:y=0:w=96:h=180:color=0x17308f:t=fill,drawbox=x=146:y=18:w=16:h=10:color=white:t=fill',
    '-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',sparseSource]);
  await page.locator('#stillsInput').setInputFiles({
    name:'sparse-portrait.mp4',mimeType:'video/mp4',buffer:readFileSync(sparseSource)
  });
  await page.waitForFunction(()=>{
    const t=Tools.Stills;
    return !t._processing&&t.queue.length===0&&Object.keys(t.collection).length===3;
  },null,{timeout:120000});
  const sparse=await page.evaluate(()=>{
    const item=Object.values(Tools.Stills.collection).find(v=>v.name==='sparse-portrait');
    return {count:item?.frames.filter(f=>f.type==='still').length,
      checked:item?.frames.filter(f=>f.type==='still'&&f.checked).length,
      allPresent:item?.frames.filter(f=>f.type==='still').every(f=>!!f.blob)};
  });
  assert.ok(sparse.count>0,'sparse frames remain available for manual selection');
  assert.equal(sparse.checked,0,'portrait captures must start unchecked');
  assert.equal(sparse.allPresent,true,'portrait captures remain available for manual review');

  // Failed seeks must leave a readable status, not a perpetual Processing card.
  await page.evaluate(()=>{
    Tools.Stills.seekV6=async()=>{throw Error('QA simulated decoder failure');};
  });
  await page.locator('#stillsInput').setInputFiles({
    name:'decode-failure.mp4',mimeType:'video/mp4',buffer:data
  });
  await page.waitForFunction(()=>{
    const t=Tools.Stills;
    return !t._processing&&t.queue.length===0&&Object.keys(t.collection).length===4;
  },null,{timeout:120000});
  const failed=await page.evaluate(()=>{
    const card=Array.from(document.querySelectorAll('#stillsStacksContainer .pdf-stack-wrapper'))
      .find(el=>el.querySelector('.stack-title')?.textContent==='decode-failure');
    return {status:card?.querySelector('.stack-count')?.textContent,
      pending:card?.querySelector('.stills-pending-preview')?.textContent,
      src:card?.querySelector('img')?.getAttribute('src')};
  });
  assert.match(failed.status,/No frames extracted/);
  assert.match(failed.pending,/Preview unavailable/);
  assert.equal(failed.src,null);
  assert.deepEqual(runtimeErrors,[],'no uncaught browser errors');
  console.log('CTK_V6_MULTIVIDEO_QA PASS',JSON.stringify(state));
}finally{
  if(browser)await browser.close();
  rmSync(directory,{force:true,recursive:true});
}
