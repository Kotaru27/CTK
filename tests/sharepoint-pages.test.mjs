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
