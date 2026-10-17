import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';

const source=fs.readFileSync(new URL('../src/js/core/sharepoint-graph.js',import.meta.url),'utf8');
const {default:tools}=await import('../src/js/tools/ad-downloader.js');
const AD=tools.AdDownloader;
function resolver(){
  const ctx={URL};
  vm.runInNewContext(source+'\nglobalThis.Native=CTKSharePoint;',ctx);
  return ctx.Native;
}
const sp=resolver();
const sourceFile='/sites/DACH/Shared Documents/ALDI Nord/2026/Ad Campaign/audio test.mp3';

test('SharePoint stream.aspx id resolves to real site download.aspx path without a player page',()=>{
  const preview='https://example.sharepoint.com/sites/DACH/_layouts/15/stream.aspx?id='+encodeURIComponent(sourceFile)+'&web=1';
  const url=new URL(sp.directUrl(preview));
  assert.equal(url.pathname,'/sites/DACH/_layouts/15/download.aspx');
  assert.equal(url.searchParams.get('SourceUrl'),sourceFile);
  assert.ok(!url.href.includes('stream.aspx'));
});
test('SharePoint file paths with spaces, # and Unicode are handled through the URL query',()=>{
  const file='/sites/DACH/Shared Documents/QRE/Müller Pick me 22s.mp4';
  const preview='https://example.sharepoint.com/sites/DACH/_layouts/15/stream.aspx?id='+encodeURIComponent(file);
  assert.equal(new URL(sp.directUrl(preview)).searchParams.get('SourceUrl'),file);
});
test('SharePoint file path with # in folder name retains its literal segment',()=>{
  const file='/sites/DACH/Shared Documents/#2026 Jan-Dec/QRE/ALDI Frische.mp4';
  const preview='https://example.sharepoint.com/sites/DACH/_layouts/15/stream.aspx?id='+encodeURIComponent(file);
  assert.equal(new URL(sp.directUrl(preview)).searchParams.get('SourceUrl'),file);
});
test('SharePoint :v:/r file links are converted to native download URL',()=>{
  const href='https://example.sharepoint.com/:v:/r/sites/DACH/Shared%20Documents/vid.mp4?csf=1&web=1';
  assert.equal(new URL(sp.directUrl(href)).searchParams.get('SourceUrl'),'/sites/DACH/Shared Documents/vid.mp4');
});
test('reject opaque sharing URLs, preview route with GUID only and malicious URLs',()=>{
  for(const raw of [
    'https://example.sharepoint.com/:v:/s/DACH/Eabc123',
    'https://example.sharepoint.com/sites/DACH/_layouts/15/stream.aspx?UniqueId=11111',
    'https://example.sharepoint.com/sites/DACH/_layouts/15/stream.aspx',
    'https://evil.example.net/sites/DACH/Shared%20Documents/a.mp4',
    'javascript:alert(1)',
    'https://example.sharepoint.com/sites/DACH/Shared%20Documents/%2E%2E/secret.mp4',
    'https://example.sharepoint.com/sites/DACH/Shared%20Documents/folder/',
  ]) assert.equal(sp.directUrl(raw),null,raw);
});
test('SharePoint request isolates navigation from the CTK workspace and never claims success',()=>{
  let clicked=null, removed=false;
  const originalDoc=globalThis.document;
  const originalSP=globalThis.CTKSharePoint;
  globalThis.CTKSharePoint=sp;
  globalThis.document={
    body:{appendChild(a){ assert.ok(a.href); }},
    createElement(type){assert.equal(type,'a');return {click(){ clicked={href:this.href,target:this.target,rel:this.rel};},remove(){removed=true;}}},
  };
  const statuses=[];
  const entry={url:'https://example.sharepoint.com/sites/DACH/_layouts/15/stream.aspx?id='+encodeURIComponent(sourceFile),displayName:'AD1_foo',downloaded:false,downloadButton:{textContent:'Download'}};
  try {
    const copy=Object.assign({},AD,{status:(message,err)=>statuses.push([message,err])});
    copy.downloadSharePoint(entry);
    assert.equal(clicked.target,'_blank');
    assert.match(clicked.rel,/noopener/);
    assert.match(clicked.rel,/noreferrer/);
    assert.match(clicked.href,/download\.aspx/);
    assert.equal(removed,true);
    assert.equal(entry.downloaded,false);
    assert.equal(entry.downloadButton.textContent,'Download again');
    assert.match(statuses[0][0],/cannot be confirmed/);
  }finally{globalThis.document=originalDoc;globalThis.CTKSharePoint=originalSP;}
});
test('SharePoint sources are explicitly excluded from client-side ZIP',async()=>{
  const originalSP=globalThis.CTKSharePoint;
  globalThis.CTKSharePoint=sp;
  try {
    const calls=[];
    const engine=Object.assign({},AD,{entries:[{url:'https://example.sharepoint.com/sites/DACH/Shared%20Documents/vid.mp4',selected:true,downloaded:false}],status:(message)=>calls.push(message)});
    await engine.downloadBulk();
    assert.match(calls[0],/cannot be added to a client-side ZIP/);
  }finally{globalThis.CTKSharePoint=originalSP;}
});

test('SharePoint recovery copies a deliberately picked local media file with spreadsheet naming',async()=>{
  const originalDoc=globalThis.document, originalWindow=globalThis.window;
  const originalSP=globalThis.CTKSharePoint, originalRenamer=globalThis.CTKDownloadRenamer;
  const file={name:'audio test.mp3',size:42,type:'audio/mpeg'};
  const widgets=[];
  globalThis.CTKSharePoint=sp;
  globalThis.CTKDownloadRenamer={
    sourceFilename(){return 'audio test.mp3';},
    matchesOriginal(){return true;},
    targetFilename(entry,name){return entry.displayName+name.slice(name.lastIndexOf('.'));}
  };
  globalThis.document={
    body:{appendChild(node){widgets.push(node);}},
    createElement(type){assert.equal(type,'input');return {style:{},click(){this.files=[file];this.onchange();},remove(){}};}
  };
  globalThis.window={confirm(){throw Error('Unexpected mismatched file confirmation')}};
  const copies=[], statuses=[];
  try{
    const target=Object.assign({},AD,{
      saveBlob(blob,name){copies.push([blob,name]);},
      status(message){statuses.push(message);}
    });
    await target.saveSharePointCopy({url:'https://example.sharepoint.com/sites/DACH/Shared%20Documents/file.mp3',displayName:'AD1_campaign'});
    assert.equal(copies[0][0],file);
    assert.equal(copies[0][1],'AD1_campaign.mp3');
    assert.match(statuses[0],/original is still present/);
  }finally{
    globalThis.document=originalDoc;globalThis.window=originalWindow;
    globalThis.CTKSharePoint=originalSP;globalThis.CTKDownloadRenamer=originalRenamer;
  }
});

test('Local renamed copy refuses an HTML/preview result rather than saving it as media',async()=>{
  const originalDoc=globalThis.document, originalSP=globalThis.CTKSharePoint;
  globalThis.CTKSharePoint=sp;
  globalThis.document={
    body:{appendChild(){}},
    createElement(){return {style:{},click(){this.files=[{name:'preview.html',size:42,type:'text/html'}];this.onchange();},remove(){}};}
  };
  const errors=[];
  try{
    const target=Object.assign({},AD,{saveBlob(){throw Error('saved invalid file')},status:(s,e)=>errors.push([s,e])});
    await target.saveSharePointCopy({url:'https://example.sharepoint.com/sites/DACH/Shared%20Documents/file.mp3',displayName:'AD1_campaign'});
    assert.equal(errors[0][1],true);
    assert.match(errors[0][0],/Select the finished media file/);
  }finally{globalThis.document=originalDoc;globalThis.CTKSharePoint=originalSP;}
});

test('Fix downloaded name recovers a finished SharePoint file without saving a duplicate',async()=>{
  const oldSP=globalThis.CTKSharePoint,oldRenamer=globalThis.CTKDownloadRenamer,oldDoc=globalThis.document,oldWindow=globalThis.window;
  const statuses=[], operations=[];
  globalThis.CTKSharePoint=sp;
  globalThis.CTKDownloadRenamer={
    active:()=>false,async chooseFolder(){operations.push('chooseFolder');return 'Downloads';},
    async findExisting(){operations.push('findExisting');return [{name:'ALDI Frische Social LT3 OLV Social Pick me 22s (1).mp4'}];},
    async renameExisting(entry,name){operations.push(name);return 'AD1_ALDI_Frische_Social_LT3_OLV_SOCIAL1_Pick_me_22s.mp4';}
  };
  globalThis.document={getElementById:()=>({textContent:''})};
  globalThis.window={prompt(){throw Error('single candidate must not ask for choice')}};
  const button={textContent:'Fix downloaded name',disabled:false};
  try{
    const copy=Object.assign({},AD,{status:s=>statuses.push(s)});
    await copy.fixSharePointName({url:'https://example.sharepoint.com/sites/DACH/Shared%20Documents/video.mp4',fixNameButton:button});
    assert.deepEqual(operations,['chooseFolder','findExisting','ALDI Frische Social LT3 OLV Social Pick me 22s (1).mp4']);
    assert.equal(button.disabled,false);
    assert.equal(button.textContent,'Name fixed');
    assert.match(statuses[0],/Renamed existing file in place/);
  }finally{globalThis.CTKSharePoint=oldSP;globalThis.CTKDownloadRenamer=oldRenamer;globalThis.document=oldDoc;globalThis.window=oldWindow;}
});
