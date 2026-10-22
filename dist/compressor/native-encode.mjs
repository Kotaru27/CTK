/* The Forge / native browser compression engine.
 * Mediabunny 1.61.6 is vendored and loaded on demand from this same GitHub
 * Pages origin. Original files are always local to the browser.
 * Every unsupported stream and encoder configuration falls back to FFmpeg.
 */
import {makePlan,validateMp4,MB} from './codec.mjs';

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
  let input=null,outputInput=null,conversion=null;
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
    // Conservative, accurate audio budgeting: only directly copy AAC tracks
    // when their bitrate metadata confirms they fit. Otherwise use FFmpeg.
    const tracks=await Promise.all(audios.map(async a=>({
      codec:'aac',kbps:(await a.getAverageBitrate())/1000
    })));
    if(tracks.some(a=>!Number.isFinite(a.kbps)||a.kbps<=0))
      throw new NativeUnavailable('Audio bitrate is unavailable; using verified FFmpeg path.');
    const plan=makePlan({
      duration,targetMB,originalBytes:file.size,width,height,fps:rate||30,
      audioPresent:audios.length>0,audioTracks:tracks
    });
    if(audios.length && !plan.copyAudio)
      throw new NativeUnavailable('Audio needs transcoding to fit; use the FFmpeg verified path.');
    const output=new lib.Output({format:new lib.Mp4OutputFormat(),target:new lib.BufferTarget()});
    conversion=await lib.Conversion.init({
      input,output,tracks:'all',
      video:{
        codec:'avc',
        // Hardware bitrates are approximate. Reserve a safety margin for the
        // output muxer and rate control; never promise exact target sizing.
        bitrate:Math.max(70_000,Math.floor(plan.videoKbps*950)),
        forceTranscode:true,
        hardwareAcceleration:'prefer-hardware'
      },
      audio:{codec:'aac'},
      showWarnings:false
    });
    if(!conversion.isValid || conversion.discardedTracks.length)
      throw new NativeUnavailable('Native encoder cannot preserve every media track.');
    if(isCanceled())throw new Error('Canceled.');
    registerCancel(()=>{void conversion.cancel().catch(()=>{});});
    conversion.onProgress=fraction=>{
      if(isCanceled()){void conversion.cancel().catch(()=>{});return;}
      if(Number.isFinite(fraction))onProgress(Math.min(1,Math.max(0,fraction)));
    };
    await conversion.execute();
    if(isCanceled())throw new Error('Canceled.');
    const buffer=output.target.buffer;
    if(!(buffer instanceof ArrayBuffer))throw new Error('Native encoder returned no completed output.');
    const data=new Uint8Array(buffer);
    validateMp4(data);
    // Keep exact-size semantics: if hardware encoding overshoots, the
    // software fallback will retry with more exact bitrate control.
    if(data.length>plan.targetBytes)
      throw new NativeUnavailable('Native bitrate overshot the requested size.');
    outputInput=new lib.Input({formats:lib.ALL_FORMATS,source:new lib.BlobSource(new Blob([data],{type:'video/mp4'}))});
    const [outVideos,outAudio,outDuration]=await Promise.all([
      outputInput.getVideoTracks(),outputInput.getAudioTracks(),outputInput.getDurationFromMetadata()
    ]);
    if(outVideos.length!==1||await outVideos[0].getCodec()!=='avc' ||
       outAudio.length!==audios.length ||
       (await Promise.all(outAudio.map(a=>a.getCodec()))).some(x=>x!=='aac') ||
       !Number.isFinite(outDuration)||Math.abs(outDuration-duration)>Math.max(.45,duration*.02))
      throw new Error('Native MP4 verification failed: streams or duration changed.');
    return {data,plan,duration,width,height,fps:rate||30,audioTracks:tracks};
  }finally{
    registerCancel(null);
    try{outputInput?.dispose();}catch{}
    try{input?.dispose();}catch{}
  }
}
