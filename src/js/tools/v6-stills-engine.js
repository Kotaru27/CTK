export default (()=>{
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const round=t=>Number(t.toFixed(3));

function sampleFingerprint(video,scratch){
  const ctx=scratch.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(video,0,0,scratch.width,scratch.height);
  const pixels=ctx.getImageData(0,0,scratch.width,scratch.height).data;
  const n=scratch.width*scratch.height,w=scratch.width;
  const values=new Uint8Array(n),colorHist=new Uint16Array(64);
  let avg=0,sq=0,texture=0,sharpness=0;
  for(let i=0;i<n;i++){
    const j=i*4,r=pixels[j],g=pixels[j+1],b=pixels[j+2];
    const v=Math.round(.2126*r+.7152*g+.0722*b);
    values[i]=v;avg+=v;sq+=v*v;
    colorHist[((r>>6)<<4)|((g>>6)<<2)|(b>>6)]++;
    if(i%w){const d=Math.abs(v-values[i-1]);sharpness+=d;texture+=d;}
    if(i>=w)sharpness+=Math.abs(v-values[i-w]);
  }
  const mean=avg/n;
  return {values,colorHist,avg:mean,texture:texture/n,
    stdDev:Math.sqrt(Math.max(0,sq/n-mean*mean)),sharpness:sharpness/(n*2)};
}

function frameDifference(a,b){
  if(!a?.fp||!b?.fp)return 1;
  const x=a.fp.values,y=b.fp.values;
  if(x.length!==y.length)return 1;
  let sum=0;for(let i=0;i<x.length;i++)sum+=Math.abs(x[i]-y[i]);
  return sum/(x.length*255);
}
function closest(frames,t){
  if(!frames.length)return null;
  let best=frames[0],diff=Math.abs(best.t-t);
  for(const f of frames){const d=Math.abs(f.t-t);if(d<diff){best=f;diff=d;}}
  return best;
}
function probePlan(duration,baseline,scheduled,mode="balanced"){
  const probes=[],skipped=[];
  const add=(t,kind,why,contrast=0)=>{
    if(!Number.isFinite(t)||t<0||t>=duration-.006)return;
    if(baseline.some(f=>Math.abs(f.t-t)<.12)||probes.some(p=>Math.abs(p.t-t)<.08))return;
    probes.push({t,kind,why,contrast});
  };
  if(duration<.3){add(duration/2,"edge","short-clip");return probes;}
  const cap=clamp(duration*.18,.015,.085);
  add(cap,"edge","opening");add(Math.max(0,duration-cap),"edge","ending");
  for(const t of scheduled)if(!baseline.some(f=>Math.abs(f.t-t)<.1))add(t,"rescue","failed-baseline");
  const times=[0,...scheduled,duration];
  for(let i=0;i<times.length-1;i++){
    const a=times[i],b=times[i+1],gap=b-a;
    if(gap<.32||i===0||i===times.length-2)continue;
    const f=closest(baseline,a),g=closest(baseline,b);
    const contrast=f&&g&&f!==g?frameDifference(f,g):1;
    if(!(duration<=30||mode==="thorough"||contrast>=.055||i%3===1)){
      skipped.push({start:round(a),end:round(b),reason:"quiet-interval"});continue;
    }
    add((a+b)/2,"scene",contrast>=.055?"contrast":"sentinel",contrast);
    if(mode==="thorough"&&contrast>=.11&&gap>.5){
      add(a+gap*.25,"scene","high-contrast-quarter",contrast);
      add(a+gap*.75,"scene","high-contrast-quarter",contrast);
    }
  }
  const budget=mode==="balanced"?220:400;
  const retain=probes.filter(p=>p.kind!=="scene"),optional=probes.filter(p=>p.kind==="scene");
  const slots=Math.max(0,budget-retain.length);
  const selected=slots>=optional.length?optional:Array.from({length:slots},(_,i)=>optional[Math.floor(i*optional.length/slots)]);
  return [...retain,...selected].sort((a,b)=>a.t-b.t);
}
function pickProbe(probe,baseline,extras,mode="balanced"){
  const t=probe.t,anchors=baseline.filter(f=>Math.abs(f.t-t)<1.5);
  const primary=closest(anchors,t);
  if(!primary)return {yes:true,score:1};
  let min=frameDifference(probe,primary);
  for(const f of anchors)if(Math.abs(f.t-t)<=1.25)min=Math.min(min,frameDifference(probe,f));
  for(const f of extras)if(Math.abs(f.t-t)<=.7)min=Math.min(min,frameDifference(probe,f));
  const threshold=mode==="balanced"?.10:.075;
  return {yes:min>=threshold,score:min,threshold};
}

return {sampleFingerprint,frameDifference,probePlan,pickProbe};
})();
