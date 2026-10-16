import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const code=fs.readFileSync(new URL('../src/js/core/sharepoint-graph.js', import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../src/js/tools/ad-downloader.js', import.meta.url),'utf8');
function harness(options={}){
  let current='https://kotaru27.github.io/CTK/';
  const session=new Map();const called=[];
  const env={
    CTK_PUBLIC_SHAREPOINT_CONFIG:{clientId:'11111111-1111-4111-8111-111111111111',tenantId:'22222222-2222-4222-8222-222222222222',scopes:['Files.Read.All','Sites.Read.All']},
    URL,URLSearchParams,TextEncoder,TextDecoder,Uint8Array,crypto:webcrypto,
    btoa:str=>Buffer.from(str,'binary').toString('base64'),Date,Blob,console,
    get location(){return {get href(){return current;},get origin(){return new URL(current).origin;},get pathname(){return new URL(current).pathname;},get protocol(){return new URL(current).protocol;},get hostname(){return new URL(current).hostname;},assign(href){current=href;}};},
    history:{replaceState(_state,_title,url){current=new URL(url,current).href;}},
    sessionStorage:{setItem(k,v){session.set(k,v);},getItem(k){return session.get(k)||null;},removeItem(k){session.delete(k);}},
    fetch:async(url,opts)=>{called.push({url:String(url),opts}); if(!options.fetch)throw Error('mock missing');return options.fetch(String(url),opts);},
  };
  vm.runInNewContext(code+'\nglobalThis.ctk=CTKSharePoint;',env);
  return {graph:env.ctk,called,env,get current(){return current;},setCurrent(value){current=value;}};
}
const okJson=value=>({ok:true,status:200,json:async()=>value});
const mimeBlob=(bytes,type)=>new Blob([bytes],{type});
const filename='example.mp4';
async function signedIn(h){
  await h.graph.signIn();
  const authUrl=new URL(h.current);
  assert.equal(authUrl.searchParams.get('code_challenge_method'),'S256');
  assert.equal(authUrl.searchParams.get('response_type'),'code');
  h.setCurrent('https://kotaru27.github.io/CTK/?code=temporary-code&state='+encodeURIComponent(authUrl.searchParams.get('state')));
  assert.equal(await h.graph.finishSignIn(),true);
  assert.equal(h.current,'https://kotaru27.github.io/CTK/');
  assert.equal(h.graph.authenticated(),true);
}

test('GitHub Pages Microsoft Graph sign-in uses PKCE and removes auth codes from URL',async()=>{
  const h=harness({fetch:(url,options)=>{
    assert.match(url,/login.microsoftonline.com\/.*\/token/);
    assert.match(String(options.body),/code_verifier=/);
    return okJson({access_token:'test-graph-token',expires_in:3600});
  }});
  await signedIn(h);
  assert.equal(h.called.length,1);
});

test('SharePoint sharing link downloads original MP4 bytes with graph metadata filename',async()=>{
  const h=harness({fetch:(url,opts)=>{
    if(url.includes('/token'))return okJson({access_token:'mock',expires_in:3600});
    if(url.includes('/shares/')){
      assert.match(opts.headers.Authorization,/^Bearer mock$/);
      return okJson({id:'item123',name:filename,size:12,file:{mimeType:'video/mp4'},'@microsoft.graph.downloadUrl':'https://download.example.com/temporary'});
    }
    if(url.startsWith('https://download.example.com/'))return {ok:true,status:200,headers:{get:()=>null},blob:async()=>mimeBlob(Uint8Array.from([0,0,0,24,102,116,121,112]),'video/mp4')};
    throw Error('unexpected URL '+url);
  }});
  await signedIn(h);
  const item=await h.graph.getAsset({url:'https://example.sharepoint.com/:v:/s/team/EXAMPLE'});
  assert.equal(item.ext,'.mp4');
  assert.equal(item.blob.size,8);
  assert.ok(!h.called.some(x=>x.url.includes('stream.aspx')&&x.opts?.headers?.Authorization));
});

test('SharePoint stream.aspx?id= path resolves site document library and exact drive file',async()=>{
  const h=harness({fetch:(url)=>{
    if(url.includes('/token'))return okJson({access_token:'mock',expires_in:3600});
    if(url.includes('/shares/'))return {ok:false,status:404};
    if(url.includes('/sites/example.sharepoint.com:'))return okJson({id:'example.sharepoint.com,site-guid,web-guid',webUrl:'https://example.sharepoint.com/sites/DACH'});
    if(url.includes('/drives?'))return okJson({value:[{id:'drive-doc',name:'Documents',webUrl:'https://example.sharepoint.com/sites/DACH/Shared Documents'}]});
    if(url.includes('root:/')){
      assert.match(url,/root:\/Folder\/test.mp3/,'must use drive-relative path');
      return okJson({name:'test.mp3',size:4,file:{mimeType:'audio/mpeg'},'@microsoft.graph.downloadUrl':'https://download.example.com/temp-audio'});
    }
    if(url.includes('/temp-audio'))return {ok:true,status:200,headers:{get:()=>null},blob:async()=>mimeBlob(Uint8Array.from([73,68,51,0]),'audio/mpeg')};
    throw Error('unexpected URL '+url);
  }});
  await signedIn(h);
  const item=await h.graph.getAsset({url:'https://example.sharepoint.com/sites/DACH/_layouts/15/stream.aspx?id=%2Fsites%2FDACH%2FShared%20Documents%2FFolder%2Ftest.mp3'});
  assert.equal(item.ext,'.mp3');
});

test('SharePoint HTML preview returned under binary MIME is rejected',async()=>{
  const h=harness({fetch:(url)=>{
    if(url.includes('/token'))return okJson({access_token:'mock',expires_in:3600});
    if(url.includes('/shares/'))return okJson({name:'test.mp4',file:{mimeType:'video/mp4'},'@microsoft.graph.downloadUrl':'https://download.example.com/preview'});
    if(url.includes('/preview'))return {ok:true,status:200,headers:{get:()=>null},blob:async()=>mimeBlob('<!DOCTYPE html><html>SharePoint video player</html>','application/octet-stream')};
    throw Error('unexpected URL '+url);
  }});
  await signedIn(h);
  await assert.rejects(()=>h.graph.getAsset({url:'https://example.sharepoint.com/:v:/s/team/example'}),/web page/);
});

test('No credentials, no file: never silently downloads a SharePoint preview page',async()=>{
  const h=harness();
  await assert.rejects(()=>h.graph.getAsset({url:'https://example.sharepoint.com/_layouts/15/stream.aspx?id=x'}),/Connect Microsoft/);
  assert.equal(h.called.length,0);
  assert.ok(!app.includes('nativeDownload('));
  assert.ok(!app.includes('requestNative('));
});

test('SharePoint stream.aspx?UniqueId= resolves document via the authorized site drives',async()=>{
  const guid='aaaabbbb-1111-2222-3333-444455556666';
  const h=harness({fetch:(url)=>{
    if(url.includes('/token'))return okJson({access_token:'mock',expires_in:3600});
    if(url.includes('/shares/'))return {ok:false,status:404};
    if(url.includes('/sites/example.sharepoint.com:'))return okJson({id:'example.sharepoint.com,site-guid,web-guid'});
    if(url.includes('/drives?'))return okJson({value:[{id:'drive-doc',webUrl:'https://example.sharepoint.com/sites/DACH/Documents'}]});
    if(url.includes('/items/'+guid))return okJson({name:'voice.wav',size:4,file:{mimeType:'audio/wav'},'@microsoft.graph.downloadUrl':'https://download.example.com/sample-wav'});
    if(url.includes('sample-wav'))return {ok:true,status:200,headers:{get:()=>null},blob:async()=>mimeBlob('RIFFyyyyWAVE','audio/wav')};
    throw Error('unexpected '+url);
  }});
  await signedIn(h);
  const item=await h.graph.getAsset({url:'https://example.sharepoint.com/sites/DACH/_layouts/15/stream.aspx?UniqueId='+guid});
  assert.equal(item.ext,'.wav');
});
