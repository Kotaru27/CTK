/* The Forge / native browser compression engine.
 * Mediabunny 1.61.6 is vendored and loaded on demand from this same GitHub
 * Pages origin. Original files are always local to the browser.
 * Every unsupported stream and encoder configuration falls back to FFmpeg.
 */
import {makePlan,validateMp4,nativeRefinementBitrate} from './codec.mjs';

export class NativeUnavailable extends Error {
  constructor(message){super(message);this.name='NativeUnavailable';}
}

export function nativeCandidate(name,videoCount,audioCodecs) {
  return /\.mp4$/i.test(String(name)) &&
    videoCount===1 &&
    Array.isArray(audioCodecs) &&
    audioCodecs.length<=2 &&
    audioCodecs.every(codec=>codec==='aac');
}

let modulePromise=null;
function library(){
  if(!modulePromise)modulePromise=import('./vendor/mediabunny-1.61.6.mjs').catch(error=>{
    modulePromise=null;throw error;
  });
  return modulePromise;
}

export async function compressNative({file,targetMB,onProgress=()=>{},registerCancel=()=>{},isCanceled=()=>false}){
  if(!/\.mp4$/i.test(file.name))throw new NativeUnavailable('Non-MP4 source uses the compatible encoder.');
  if(typeof VideoEncoder!=='function'||typeof VideoDecoder!=='function')
    throw new NativeUnavailable('Browser does not expose native video encoding and decoding.');
  if(isCanceled())throw new Error('Canceled.');
  let input=null,outputInput=null,refinementInput=null,conversion=null;
  try{
    const lib=await library();
    if(isCanceled())throw new Error('Canceled.');
    input=new lib.Input({formats:lib.ALL_FORMATS,source:new lib.BlobSource(file)});
    const [videos,audios,duration]=await Promise.all([
      input.getVideoTracks(),
      input.getAudioTracks(),
      input.getDurationFromMetadata()
    ]);
    const audioCodecs=await Promise.all(audios.map(a=>a.getCodec()));
    if(!nativeCandidate(file.name,videos.length,audioCodecs))
      throw new NativeUnavailable('Complex or unsupported tracks require FFmpeg.');
    const video=videos[0];
    const [width,height,rate]=await Promise.all([
      video.getDisplayWidth(),video.getDisplayHeight(),video.getFrameRate?.()||Promise.resolve(0)
    ]);
    if(!Number.isFinite(duration)||duration<=0||!width||!height)
      throw new NativeUnavailable('Source dimensions or duration need FFprobe.');
    // Audio bitrates determine how much of the strict size budget is available
    // to the picture. Preserve compatible AAC directly whenever possible.
    const tracks=await Promise.all(audios.map(async a=>({
      codec:'aac',kbps:(await a.getAverageBitrate())/1000
    })));
    if(tracks.some(a=>!Number.isFinite(a.kbps)||a.kbps<=0))
      throw new NativeUnavailable('Audio bitrate is unavailable; using verified FFmpeg path.');
    const plan=makePlan({
      duration,targetMB,originalBytes:file.size,width,height,fps:rate||30,
      audioPresent:audios.length>0,audioTracks:tracks
    });
    const startBitrate=Math.max(70_000,Math.floor(plan.videoKbps*950));
    // Native AAC encoding is attempted only when a high-bitrate source
    // would consume too much of the target; incompatible devices still
    // fall back to the existing FFmpeg path.
    const audioOptions=!audios.length?{discard:true}:plan.copyAudio?{codec:'aac'}:{
      codec:'aac',bitrate:plan.audioKbps*1000,forceTranscode:true
    };
    const encodeAttempt=async(source,videoBitrate,from,to)=>{
      const output=new lib.Output({format:new lib.Mp4OutputFormat(),target:new lib.BufferTarget()});
      conversion=await lib.Conversion.init({
        input:source,output,tracks:'all',
        video:{
          codec:'avc',
          bitrate:videoBitrate,
          forceTranscode:true,
          hardwareAcceleration:'no-preference'
        },
        audio:audioOptions,
        showWarnings:false
      });
      if(!conversion.isValid||conversion.discardedTracks.length)
        throw new NativeUnavailable('Native encoder cannot preserve every media track.');
      if(isCanceled())throw new Error('Canceled.');
      registerCancel(()=>{void conversion.cancel().catch(()=>{});});
      conversion.onProgress=fraction=>{
        if(isCanceled()){void conversion.cancel().catch(()=>{});return;}
        if(Number.isFinite(fraction))
          onProgress(from+Math.min(1,Math.max(0,fraction))*(to-from));
      };
      await conversion.execute();
      if(isCanceled())throw new Error('Canceled.');
      const buffer=output.target.buffer;
      if(!(buffer instanceof ArrayBuffer))
        throw new Error('Native encoder returned no completed output.');
      const candidate=new Uint8Array(buffer);
      validateMp4(candidate);
      registerCancel(null);
      conversion=null;
      return candidate;
    };
    const startTime=performance.now();
    let data=await encodeAttempt(input,startBitrate,0,.76);
    // Hardware bitrate control is approximate. Never offer an output above
    // target and never re-encode merely because a larger one was requested.
    if(data.length>plan.targetBytes)
      throw new NativeUnavailable('Native bitrate overshot the requested size.');
    let refined=false;
    const betterBitrate=nativeRefinementBitrate({
      targetBytes:plan.targetBytes,outputBytes:data.length,
      videoBps:startBitrate,audioBps:plan.audioTotalKbps*1000,
      duration,elapsedMs:performance.now()-startTime,originalBytes:file.size
    });
    if(betterBitrate!==null&&!isCanceled()){
      try{
        // A fresh BlobSource ensures a second encode starts at frame zero.
        // Keep the entire first valid result if the refinement overshoots
        // or fails: quality must never regress because a retry misbehaved.
        refinementInput=new lib.Input({formats:lib.ALL_FORMATS,source:new lib.BlobSource(file)});
        const candidate=await encodeAttempt(refinementInput,betterBitrate,.76,.98);
        if(candidate.length<=plan.targetBytes && candidate.length>data.length){
          data=candidate;
          refined=true;
        }
      }catch(error){
        if(isCanceled())throw error;
        // Refinement is opportunistic, not a reason to discard a valid MP4.
      }
    }
    if(isCanceled())throw new Error('Canceled.');
    onProgress(1);
    outputInput=new lib.Input({formats:lib.ALL_FORMATS,source:new lib.BlobSource(new Blob([data],{type:'video/mp4'}))});
    const [outVideos,outAudio,outDuration]=await Promise.all([
      outputInput.getVideoTracks(),outputInput.getAudioTracks(),outputInput.getDurationFromMetadata()
    ]);
    if(outVideos.length!==1||await outVideos[0].getCodec()!=='avc' ||
       await outVideos[0].getDisplayWidth()!==width ||
       await outVideos[0].getDisplayHeight()!==height ||
       outAudio.length!==audios.length ||
       (await Promise.all(outAudio.map(a=>a.getCodec()))).some(x=>x!=='aac') ||
       !Number.isFinite(outDuration)||Math.abs(outDuration-duration)>Math.max(.45,duration*.02))
      throw new Error('Native MP4 verification failed: streams or duration changed.');
    return {data,plan,duration,width,height,fps:rate||30,audioTracks:tracks,refined,audioCopied:plan.copyAudio};
  }finally{
    registerCancel(null);
    try{outputInput?.dispose();}catch{}
    try{refinementInput?.dispose();}catch{}
    try{input?.dispose();}catch{}
  }
}
