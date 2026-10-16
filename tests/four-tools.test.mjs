import test from 'node:test';
import assert from 'node:assert/strict';
import {Blob} from 'node:buffer';
globalThis.document={getElementById:()=>null};
const {default:ad}=await import('../src/js/tools/ad-downloader.js');
const {default:links}=await import('../src/js/tools/link-gen.js');
const {default:stills}=await import('../src/js/tools/video-stills.js');
const {default:story}=await import('../src/js/tools/storyboard.js');
const {default:film}=await import('../src/js/tools/storyboard-filmstrip.js');
const AD=ad.AdDownloader, LINK=links.AdLinkGen, VIDEO=stills.Stills, STORY=story.Story, FILM=film.Filmstrip;

test('ad downloader: header detection, URL restrictions and safe names',()=>{
  const rows=[[{v:'Media URI'},{v:'Batch'},{v:'FormatName'}],[]];
  assert.equal(AD.detectColumns(rows).recognized,false,'a workbook without required columns uses legacy fallback');
  const headings=[[{v:'Category'},{v:'Ad No'},{v:'Link'}]];
  assert.deepEqual({...AD.detectColumns(headings)},{start:1,no:1,link:2,type:0,recognized:true});
  globalThis.location={href:'https://example.test/'};
  assert.equal(AD.safeUrl('javascript:alert(1)'),'');
  assert.equal(AD.safeUrl('file:///secret'),'');
  assert.equal(AD.safeUrl('https://cdn.example/media.jpg?token=abc'),'https://cdn.example/media.jpg?token=abc');
  assert.equal(AD.safeName('Müller / Bio'), 'Muller_Bio');
  assert.equal(AD.extensionHint('https://cdn.example/download?x=1','a.mp4','TVC').confidence,'high');
  assert.equal(AD.extensionHint('https://cdn.example/download','No suffix','unknown').confidence,'unknown');
});

test('ad downloader: media type sniffing overrides ambiguous sheet category',()=>{
  const hint={ext:'.jpg',confidence:'inferred'};
  assert.equal(AD.guessType({type:'application/octet-stream'},hint,Uint8Array.from([0,0,0,24,102,116,121,112])),'.mp4');
  assert.equal(AD.guessType({type:'application/octet-stream'},hint,Uint8Array.from([0x89,80,78,71])),'.png');
  assert.equal(AD.guessType({type:'application/octet-stream'},{ext:'',confidence:'unknown'},[]),'.bin');
  assert.throws(()=>AD.guessType({type:'text/html'},hint,[]),/web page/);
});

test('ad downloader: direct CORS fetch preserves token and reports filename',async()=>{
  const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,status:200,headers:{get:(name)=>name==='content-type'?'image/png':null},body:null,blob:async()=>new Blob([Uint8Array.from([0x89,80,78,71,1])],{type:'image/png'})};};
  const entry={url:'https://cdn.example/asset?id=111&sig=secret',displayName:'AD1_campaign',confidence:'unknown',ext:''};
  const result=await AD.getAsset(entry);
  assert.equal(result.name,'AD1_campaign.png');
  assert.equal(calls[0].url,entry.url);
  assert.equal(calls[0].options.mode,'cors');
  assert.equal(calls[0].options.credentials,'omit');
});

test('ad downloader: CORS rejection stays explicit (no false success)',async()=>{
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch (CORS)');};
  await assert.rejects(AD.getAsset({url:'https://cdn.example/no-cors',displayName:'AD2',confidence:'unknown',ext:''}),/CORS/);
});

test('ad downloader: bulk creates ZIP for successes only and marks only those rows',async()=>{
  const a={url:'https://cdn.example/a',displayName:'AD1_A',selected:true,downloaded:false,confidence:'unknown',ext:''};
  const b={url:'https://cdn.example/b',displayName:'AD2_B',selected:true,downloaded:false,confidence:'unknown',ext:''};
  const engine=Object.assign({},AD,{entries:[a,b],_downloadBusy:false,downloadedNames:[],status(){},updateBulkButton(){},saveBlob(blob,name){this.downloadedNames.push(name);},markDownloaded(entry){entry.downloaded=true;}});
  engine.getAsset=async(e)=>{if(e===b)throw Error('CORS blocked');return {blob:new Blob(['asset']),name:'AD1_A.mp4'};};
  globalThis.JSZip=class {files=[];file(name,blob){this.files.push([name,blob]);}async generateAsync(){return new Blob([this.files.map(x=>x[0]).join(',')]);}};
  await engine.downloadBulk();
  assert.deepEqual(engine.downloadedNames,['ad_assets.zip']);
  assert.equal(a.downloaded,true);
  assert.equal(b.downloaded,false);
  assert.equal(engine._downloadBusy,false);
});

test('Link Gen: encoded URLs, HTML safe output and blocked paths',()=>{
  const els={
    'alg-server':{value:'aldi'},'alg-mode-toggle':{checked:false},'alg-folder':{value:'campaign/2026'},
    'alg-input':{value:'my photo & design.jpg\n../../bad.jpg\nevil\" x.png\nclip.mp4'},
    'alg-out-ads':{value:''},'alg-out-story':{value:''},
  };
  globalThis.document={getElementById:id=>els[id]};
  const errors=[];globalThis.UI={showError:e=>errors.push(e)};
  LINK.generate();
  assert.ok(els['alg-out-ads'].value.includes('my%20photo%20%26%20design.jpg'));
  assert.ok(els['alg-out-ads'].value.includes('evil%22%20x.png'));
  assert.ok(!els['alg-out-ads'].value.includes('..%2F..'));
  assert.equal(errors.length,1);
  assert.ok(!els['alg-out-story'].value.includes('onerror='));
});

test('Video Stills optional scorer rejects black and duplicates, accepts changed scenes',()=>{
  const n=48*27;
  const black={avg:0.0,variance:0,texture:0,values:new Float32Array(n).fill(0)};
  const sample={avg:0.5,variance:0.16,texture:0.2,values:new Float32Array(n).fill(0.3)};
  const changed={...sample,values:new Float32Array(n).fill(0.7)};
  assert.equal(VIDEO.acceptFrame(black,null),false);
  assert.equal(VIDEO.acceptFrame(sample,null),true);
  assert.equal(VIDEO.acceptFrame(sample,sample),false);
  assert.equal(VIDEO.acceptFrame(changed,sample),true);
});

test('Storyboard validates broken images and refuses empty canvas exports',async()=>{
  assert.equal(STORY.validateImage({naturalWidth:100,naturalHeight:50}),true);
  assert.equal(STORY.validateImage({naturalWidth:0,naturalHeight:0}),false);
  assert.equal(STORY.safeExportName('../Bad:Name'),'___Bad_Name');
  await assert.rejects(STORY.encodeBoard({width:0,height:100}),/No rendered/);
  await assert.rejects(STORY.encodeBoard({width:100,height:100,toBlob(cb){cb(null)}}),/no image data/i);
  assert.equal(FILM.validImage({naturalWidth:20,naturalHeight:11}),true);
  assert.equal(FILM.validImage({naturalWidth:0,naturalHeight:11}),false);
});
