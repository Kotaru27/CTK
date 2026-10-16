import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

globalThis.document = {getElementById: () => null};
const {default: module} = await import('../src/js/tools/ad-downloader.js');
const AD = module.AdDownloader;

test('one-click: native helper starts named download without popup or CORS fetch', async () => {
  const calls=[];
  const row={classList:{add(){ }},style:{}};
  const entry={url:'https://example.test/ad-video',ext:'.mp4',displayName:'AD1_ALDI_Frische_Social_LT3_OLV_SOCIAL1_Pick_me_22s',downloadButton:{disabled:false},row};
  const ctx=Object.assign({},AD,{status:()=>{},updateBulkButton(){},nativeAvailable:async()=>true,nativeDownload:async e=>{calls.push(e);return {downloadId:123}}});
  ctx.markDownloaded=e=>e.downloaded=true;
  ctx.getAsset=async()=>{throw Error('must not use CORS fetch when extension is present');};
  globalThis.window={open:()=>{throw Error('must not open a tab or popup');}};
  await ctx.downloadFile(entry);
  assert.equal(calls.length,1);
  assert.equal(calls[0].displayName,entry.displayName);
  assert.equal(entry.downloaded,true);
});

test('one-click: failed native request never marks success',async()=>{
  const entry={downloadButton:{disabled:false},displayName:'AD2'};
  let marked=0;
  const ctx=Object.assign({},AD,{status:()=>{},nativeAvailable:async()=>true,nativeDownload:async()=>{throw Error('Forbidden by policy');},markDownloaded:()=>marked++});
  await ctx.downloadFile(entry);
  assert.equal(marked,0);
  assert.equal(entry.downloadButton.disabled,false);
});

test('native bulk queues selected downloads, ignores unselected, preserves per-file names',async()=>{
  const items=[{selected:true,downloaded:false,displayName:'AD1'},{selected:false,downloaded:false,displayName:'AD2'},{selected:true,downloaded:false,displayName:'AD3'}];
  const recorded=[];
  const ctx=Object.assign({},AD,{entries:items,_downloadBusy:false,status(){},updateBulkButton(){},nativeAvailable:async()=>true,nativeDownload:async e=>{recorded.push(e.displayName);return {downloadId:1}},markDownloaded:e=>e.downloaded=true});
  await ctx.downloadBulk();
  assert.deepEqual(recorded,['AD1','AD3']);
  assert.deepEqual(items.map(x=>x.downloaded),[true,false,true]);
  assert.equal(ctx._downloadBusy,false);
});

test('Chrome Downloads API extension validates source, names and sends saveAs:false',async()=>{
  const script=readFileSync(new URL('../optional/chrome-native-downloader/background.js',import.meta.url),'utf8');
  let listener, args;
  const api={runtime:{onMessage:{addListener:fn=>listener=fn},lastError:null},downloads:{download:(opts,done)=>{args=opts;done(7);}}};
  runInNewContext(script,{chrome:api,URL});
  let response;
  listener({action:'download',url:'https://cdn.example.test/video.mp4',filename:'AD1_ALDI_Social.mp4'},{tab:{id:1},url:'file:///C:/Tools/CTK.html'},v=>response=v);
  assert.equal(response.ok,true);
  assert.equal(response.downloadId,7);
  assert.equal(args.saveAs,false);
  assert.equal(args.filename,'AD1_ALDI_Social.mp4');
  assert.equal(args.conflictAction,'uniquify');
  listener({action:'download',url:'file:///etc/passwd',filename:'x'},{tab:{id:1},url:'file:///tmp/CTK.html'},v=>response=v);
  assert.equal(response.ok,false);
  listener({action:'download',url:'https://example.test/a',filename:'../../foo'},{tab:{id:1},url:'https://example.com'},v=>response=v);
  assert.equal(response.ok,false);
});

test('Storyboard no longer injects smart-fit framing control or border decoration',()=>{
  const story=readFileSync(new URL('../src/js/tools/storyboard.js',import.meta.url),'utf8');
  assert.ok(!story.includes('fit.insertAdjacentElement("afterend",advice)'));
  assert.match(story,/area\.style\.setProperty\("border", "0", "important"\)/);
  assert.match(story,/c\.style\.setProperty\("border", "0", "important"\)/);
});
