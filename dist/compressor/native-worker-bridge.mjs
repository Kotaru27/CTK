/* Bridge between the Forge page and its isolated native video worker.
 * A browser may still freeze the whole page under Energy/Memory Saver.
 * FFmpeg.wasm remains the compatibility fallback in app.mjs.
 */
import {compressNative} from './native-encode.mjs';

export function compressNativeInWorker(options){
  if(typeof Worker!=='function')return compressNative(options).then(result=>({...result,ranInWorker:false}));
  let worker;
  try{
    worker=new Worker(new URL('./native-worker.mjs',import.meta.url),{
      type:'module',name:'forge-video-encoder'
    });
  }catch{
    // Module workers are not universal. Keep the established browser path.
    return compressNative(options).then(result=>({...result,ranInWorker:false}));
  }
  return new Promise((resolve,reject)=>{
    let completed=false;
    const finish=(error,value)=>{
      if(completed)return;
      completed=true;
      worker.onmessage=null;
      worker.onerror=null;
      worker.onmessageerror=null;
      try{worker.terminate();}catch{}
      options.registerCancel?.(null);
      if(error)reject(error);
      else resolve(value);
    };
    options.registerCancel?.(()=>{
      finish(new Error('Canceled.'));
    });
    worker.onmessage=event=>{
      if(completed)return;
      const data=event.data;
      if(data?.type==='progress'){
        if(options.isCanceled?.())return finish(new Error('Canceled.'));
        if(Number.isFinite(data.progress))options.onProgress?.(data.progress);
      }else if(data?.type==='complete'){
        if(options.isCanceled?.())return finish(new Error('Canceled.'));
        finish(null,{...data.result,ranInWorker:true});
      }else if(data?.type==='error'){
        const error=new Error(String(data.message||'Native worker could not process the file.'));
        error.name=data.name||'Error';
        finish(error);
      }
    };
    worker.onerror=event=>{
      event.preventDefault?.();
      finish(new Error('Native worker unavailable: '+String(event.message||'worker failed to load')));
    };
    worker.onmessageerror=()=>finish(new Error('Native worker returned an unreadable result.'));
    try{
      worker.postMessage({
        type:'start',file:options.file,targetMB:options.targetMB
      });
    }catch(error){
      finish(error);
    }
  });
}
