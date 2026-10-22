import test from 'node:test';
import assert from 'node:assert/strict';
import {compressNativeInWorker} from '../native-worker-bridge.mjs';

test('native encoder runs in dedicated worker and transfers completed MP4 results',async()=>{
 const prior=globalThis.Worker;
 let terminated=0,workerURL='',started=null,registered=null;
 globalThis.Worker=class {
   constructor(url,opts){
     workerURL=String(url);assert.equal(opts.type,'module');
   }
   postMessage(message){
     started=message;
     queueMicrotask(()=>{
       this.onmessage?.({data:{type:'progress',progress:.55}});
       this.onmessage?.({data:{type:'complete',result:{data:new Uint8Array([1,2,3]),width:640,height:360,refined:false}}});
     });
   }
   terminate(){terminated++;}
 };
 try{
  let progress=0;
  const file=new Blob(['PRIVATE VIDEO']);
  const result=await compressNativeInWorker({file,targetMB:8,
    onProgress:n=>progress=n,registerCancel:fn=>registered=fn,isCanceled:()=>false});
  assert.ok(workerURL.endsWith('/native-worker.mjs'));
  assert.equal(started.file,file,'video must stay in this browser, not uploaded');
  assert.equal(started.targetMB,8);
  assert.equal(progress,.55);
  assert.deepEqual([...result.data],[1,2,3]);
  assert.equal(terminated,1);
  assert.equal(registered,null);
 }finally{if(prior===undefined)delete globalThis.Worker;else globalThis.Worker=prior;}
});

test('cancelling a worker terminates conversion and rejects its output',async()=>{
 const prior=globalThis.Worker;
 let cancel,terminated=false;
 globalThis.Worker=class {
  constructor(){}
  postMessage(){}
  terminate(){terminated=true;}
 };
 try{
  const pending=compressNativeInWorker({file:new Blob(['test']),targetMB:8,
    registerCancel:fn=>{if(fn)cancel=fn;},isCanceled:()=>false});
  assert.equal(typeof cancel,'function');
  cancel();
  await assert.rejects(pending,/Canceled/);
  assert.equal(terminated,true);
 }finally{if(prior===undefined)delete globalThis.Worker;else globalThis.Worker=prior;}
});
