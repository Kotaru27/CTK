/* On-device media conversion in a dedicated module worker.
 * Worker isolation avoids tying decoding/encoding to rendering of the Forge
 * iframe. It cannot override a browser-imposed page freeze or tab discard.
 */
import {compressNative} from './native-encode.mjs';

self.onmessage=async event=>{
  if(event.data?.type!=='start')return;
  const {file,targetMB}=event.data;
  try{
    const result=await compressNative({
      file,targetMB,
      onProgress:progress=>self.postMessage({type:'progress',progress}),
      // Cancel is implemented by terminating this dedicated worker from the
      // controlling page. No shared filesystem or global state is involved.
    });
    self.postMessage({type:'complete',result},[result.data.buffer]);
  }catch(error){
    self.postMessage({
      type:'error',
      name:error instanceof Error?error.name:'Error',
      message:error instanceof Error?error.message:String(error)
    });
  }
};
