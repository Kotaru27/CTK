/* CTK Final V6 port — browser-only extraction analysis, no native decoder or OCR.
 * Pure frame curation is independent of the multi-video UI. All captured JPEGs remain available.
 */
export default (()=>{
const W=160,H=90;
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

function detailFingerprint(source,scratch){
  const ctx=scratch.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(source,0,0,W,H);
  const d=ctx.getImageData(0,0,W,H).data,n=W*H,rgb=new Uint8Array(n*3),hist=new Uint16Array(512);
  let avg=0,sq=0,edge=0,centerFlat=0,centerTotal=0,topBlue=0,dominant=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x,j=i*4,k=i*3,r=d[j],g=d[j+1],b=d[j+2];
    rgb[k]=r;rgb[k+1]=g;rgb[k+2]=b;
    const lum=.2126*r+.7152*g+.0722*b;
    avg+=lum;sq+=lum*lum;
    const bin=(r>>5)*64+(g>>5)*8+(b>>5),v=++hist[bin];if(v>dominant)dominant=v;
    if(y<15&&b>80&&b>r*1.22&&b>g*1.12)topBlue++;
    if(x&&y){const q=k-3,h=k-W*3;let e=0;
      for(let c=0;c<3;c++)e+=Math.abs(rgb[k+c]-rgb[q+c])+Math.abs(rgb[k+c]-rgb[h+c]);
      const norm=e/6;edge+=norm;
      if(x>=24&&x<136&&y>=15&&y<75){centerTotal++;if(norm<5)centerFlat++;}
    }
  }
  const mean=avg/n,std=Math.sqrt(Math.max(0,sq/n-mean*mean));
  return {rgb,hist,mean,std,quality:edge/n,dominant:dominant/n,
    flatCenter:centerTotal?centerFlat/centerTotal:0,blueHeader:topBlue/(W*15)};
}

function colorMatch(a,b){
  if(!a?.colorHist||!b?.colorHist)return 0;
  let sum=0;
  for(let i=0;i<64;i++)sum+=Math.sqrt(a.colorHist[i]*b.colorHist[i]);
  return sum/Math.sqrt(a.values.length*b.values.length);
}
function frameDifference(a,b){
  if(!a?.fp||!b?.fp)return 1;
  const x=a.fp.values,y=b.fp.values;
  if(x.length!==y.length)return 1;
  let sum=0;for(let i=0;i<x.length;i++)sum+=Math.abs(x[i]-y[i]);
  return sum/(x.length*255);
}
function contentDifference(a,b){
  if(!a?.detail?.rgb||!b?.detail?.rgb)return {pixel:1,center:1,color:0};
  const x=a.detail.rgb,y=b.detail.rgb;
  let color=0;for(let i=0;i<512;i++)color+=Math.sqrt(a.detail.hist[i]*b.detail.hist[i]);
  color/=(W*H);
  if(color<.90)return {pixel:1,center:1,color,maxPatch:1};
  let all=0,mid=0,nMid=0;const patch=new Uint16Array(48);
  for(let i=0;i<x.length;i+=3){
    const d=(Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2]))/3;
    all+=d;
    const pixel=i/3,px=pixel%W,py=(pixel/W)|0;
    if((Math.abs(x[i]-y[i])>22||Math.abs(x[i+1]-y[i+1])>22||Math.abs(x[i+2]-y[i+2])>22)&&px>20&&py>15)
      patch[Math.min(47,Math.floor(py/15)*8+Math.floor(px/20))]++;
    if(px>=38&&px<154&&py>=15&&py<83){mid+=d;nMid++;}
  }
  return {pixel:all/(W*H*255),center:mid/(nMid*255),color,maxPatch:Math.max(...patch)/300};
}
function signature(f){
  if(f.v5)return f.v5;
  const rgb=f.detail?.rgb;if(!rgb)return null;
  const hist=new Uint32Array(512),edges=new Uint16Array(24);
  let n=0;
  for(let y=17;y<78;y++)for(let x=5;x<155;x++){
    const k=(y*W+x)*3,r=rgb[k],g=rgb[k+1],b=rgb[k+2];
    hist[(r>>5)*64+(g>>5)*8+(b>>5)]++;n++;
    if(x>5){
      const q=k-3,delta=(Math.abs(r-rgb[q])+Math.abs(g-rgb[q+1])+Math.abs(b-rgb[q+2]))/3;
      if(delta>24)edges[Math.min(23,Math.floor((y-17)/16)*6+Math.floor((x-5)/25))]++;
    }
  }
  let occupied=0;for(const v of edges)if(v>14)occupied++;
  return f.v5={hist,centerCount:n,coverage:occupied/edges.length};
}
function v5Compare(a,b){
  const ra=a.detail?.rgb,rb=b.detail?.rgb,sa=signature(a),sb=signature(b);
  if(!ra||!rb||!sa||!sb)return {color:0,top:1,bottom:1,middle:1,changeFraction:1,changeBox:1};
  let color=0;for(let k=0;k<512;k++)color+=Math.sqrt(sa.hist[k]*sb.hist[k]);
  color/=Math.sqrt(sa.centerCount*sb.centerCount);
  let top=0,bottom=0,middle=0,topN=0,bottomN=0,middleN=0,changed=0;
  let xMin=160,xMax=-1,yMin=90,yMax=-1;
  for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2){
    const k=(y*W+x)*3;
    const d=(Math.abs(ra[k]-rb[k])+Math.abs(ra[k+1]-rb[k+1])+Math.abs(ra[k+2]-rb[k+2]))/3;
    if(y<15){top+=d;topN++;}
    else if(y>=78){bottom+=d;bottomN++;}
    else if(x>5&&x<155){middle+=d;middleN++;
      if(d>25){changed++;xMin=Math.min(xMin,x);xMax=Math.max(xMax,x);yMin=Math.min(yMin,y);yMax=Math.max(yMax,y);}
    }
  }
  return {color,top:top/(topN*255),bottom:bottom/(bottomN*255),middle:middle/(middleN*255),
    changeFraction:changed/Math.max(middleN,1),
    changeBox:xMax>=0?((xMax-xMin+2)*(yMax-yMin+2))/(150*62):0};
}
function localizedChange(d){
  return d.color>.985&&d.changeFraction>.003&&d.changeFraction<.085&&
    d.changeBox>.002&&d.changeBox<.17&&d.middle>.0019&&d.middle<.065;
}
function v5SameSequence(a,b){
  const delta=b.t-a.t;if(delta<0||delta>1.6)return {same:false,reason:"time-gap"};
  const d=v5Compare(a,b);
  const strict=d.top<.066&&d.bottom<.088&&d.color>.665&&d.middle<.15;
  const tail=delta<.72&&d.top<.135&&d.bottom<.145&&d.color>.705&&d.middle<.155;
  const near=colorMatch(a.fp,b.fp)>.963&&frameDifference(a,b)<.105&&d.color>.77;
  if(!(strict||tail||near))return {same:false,reason:"different-layout",d};
  if(localizedChange(d))return {same:false,reason:"localized-change-review",d};
  return {same:true,reason:strict?"stable-template":tail?"animation-tail":"near-identical",d};
}
function lowContent(f){const p=f.fp;return !p||(p.stdDev<3&&p.sharpness<2)||(p.stdDev<7&&p.sharpness<1);}
function hardTransition(f,all,i){
  const d=f?.detail;if(!d)return false;
  const suspicious=(d.dominant>.59&&d.flatCenter>.76)||(d.dominant>.72&&d.flatCenter>.61);
  if(!suspicious)return false;
  const a=all[i-1]?.detail,b=all[i+1]?.detail;
  return !!(a&&b&&a.dominant<.58&&b.dominant<.58&&a.flatCenter<.78&&b.flatCenter<.78);
}
function quality(f){const p=f.fp||{},d=f.detail||{},v=signature(f);
  const base=(p.sharpness||0)*(1+.13*Math.min(1,(p.stdDev||0)/70))+(f.verified?1.4:0)+.16*(d.quality||0);
  return base+(v?.coverage||0)*7-(d.dominant||0)*5-(d.flatCenter||0)*1.8;
}
function metrics(f){
  if(f.v6Metrics)return f.v6Metrics;
  const rgb=f.detail?.rgb;if(!rgb)return f.v6Metrics={lap:0,white:0,black:0,mean:0};
  const gray=new Float32Array(W*H);let white=0,black=0,sum=0;
  for(let i=0;i<gray.length;i++){
    const j=i*3,v=.2126*rgb[j]+.7152*rgb[j+1]+.0722*rgb[j+2];gray[i]=v;sum+=v;
    if(v>242)white++;if(v<12)black++;
  }
  let lapSum=0,lapSq=0,N=0;
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
    const k=y*W+x,v=gray[k-W]+gray[k+W]+gray[k-1]+gray[k+1]-4*gray[k];
    lapSum+=v;lapSq+=v*v;N++;
  }
  return f.v6Metrics={lap:Math.max(0,lapSq/N-(lapSum/N)**2),white:white/(W*H),black:black/(W*H),mean:sum/(W*H)};
}
// Detect mostly empty frames using the actual displayed-content area, not
// the entire canvas. This handles portrait ads with neutral sidebars as well
// as landscape title cards. No brand, color, or timestamp special cases.
function contentDensity(f){
  if(f.v6Density)return f.v6Density;
  const rgb=f.detail?.rgb;
  if(!rgb||rgb.length!==W*H*3)return {sparse:false,occupied:1,dominance:0,activeWidth:1};
  const column=(x)=>{
    let r=0,g=0,b=0,sq=0;
    for(let y=0;y<H;y+=3){
      const k=(y*W+x)*3,R=rgb[k],G=rgb[k+1],B=rgb[k+2];
      r+=R;g+=G;b+=B;sq+=R*R+G*G+B*B;
    }
    const n=Math.ceil(H/3);
    r/=n;g/=n;b/=n;
    return {r,g,b,spread:Math.sqrt(Math.max(0,sq/n-r*r-g*g-b*b)/3)};
  };
  const left=column(1),right=column(W-2);
  const distance=(a,b)=>Math.sqrt(((a.r-b.r)**2+(a.g-b.g)**2+(a.b-b.b)**2)/3);
  let first=0,last=W-1;
  if(left.spread<17){
    for(let x=1;x<W-1;x++){
      const c=column(x);
      if(distance(c,left)>24||c.spread>23){first=x;break;}
    }
  }
  if(right.spread<17){
    for(let x=W-2;x>0;x--){
      const c=column(x);
      if(distance(c,right)>24||c.spread>23){last=x;break;}
    }
  }
  if(last-first<Math.ceil(W*.14)){first=0;last=W-1;}
  const hist=new Uint16Array(512);
  let dominant=0,count=0,occupied=0,tiles=0;
  for(let y=0;y<H;y+=9)for(let x=first;x<=last;x+=8){
    let luminance=0,squared=0,n=0;
    const stopY=Math.min(H,y+9),stopX=Math.min(last+1,x+8);
    for(let py=y;py<stopY;py++)for(let px=x;px<stopX;px++){
      const i=(py*W+px)*3,r=rgb[i],g=rgb[i+1],b=rgb[i+2];
      const lum=.2126*r+.7152*g+.0722*b;
      luminance+=lum;squared+=lum*lum;n++;count++;
      const bin=(r>>5)*64+(g>>5)*8+(b>>5);
      dominant=Math.max(dominant,++hist[bin]);
    }
    if(n>0){
      const variance=Math.max(0,squared/n-(luminance/n)**2);
      if(variance>16*16)occupied++;
      tiles++;
    }
  }
  const coverage=tiles?occupied/tiles:0,majority=count?dominant/count:0;
  const info={occupied:coverage,dominance:majority,activeWidth:(last-first+1)/W,
    sparse:(majority>.77&&coverage<.20)||(majority>.65&&coverage<.09)};
  f.v6Density=info;
  return info;
}
function qualityGate(all,i){
  const f=all[i],m=metrics(f);
  if(contentDensity(f).sparse)return {drop:false,reason:"sparse-content-review",review:true};
  if(hardTransition(f,all,i))return {drop:true,reason:"transition-wipe"};
  const a=[...all.slice(0,i)].reverse().find(x=>f.t-x.t<2.15);
  const b=all.slice(i+1).find(x=>x.t-f.t<2.15);
  if(!a||!b)return {drop:false,reason:"edge-or-unpaired"};
  const ma=metrics(a),mb=metrics(b),peak=Math.max(ma.lap,mb.lap);
  if(lowContent(f)&&ma.lap>550&&mb.lap>550)return {drop:true,reason:"near-blank-interstitial"};
  const flash=m.white>.16&&m.mean>166&&ma.white<.13&&mb.white<.13&&Math.max(ma.white,mb.white)<m.white*.58;
  if(flash)return {drop:true,reason:"exposure-flash"};
  const blur=m.lap<1100&&peak>1400&&m.lap<peak*.43&&(ma.lap>m.lap*1.38||mb.lap>m.lap*1.38);
  if(blur)return {drop:true,reason:"motion-blur-transition"};
  const soft=m.lap<1250&&peak>1500&&m.lap<peak*.68;
  return {drop:false,reason:soft?"possibly-soft":"usable",review:soft};
}
function sameV6(a,b){
  if(b.t-a.t>1.35)return {same:false,reason:"time-gap"};
  if(b.v6LegacyProtected&&a.v6LegacyGroup!==b.v6LegacyGroup)return {same:false,reason:"legacy-content-boundary",review:true};
  const semantic=v5SameSequence(a,b),d=contentDifference(a,b),v=v5Compare(a,b);
  const qa=metrics(a).lap,qb=metrics(b).lap;
  if(localizedChange(v))return {same:false,reason:"localized-content-change",review:true};
  const movement=v.changeFraction>.48&&Math.min(qa,qb)>1200&&Math.min(qa,qb)/Math.max(1,Math.max(qa,qb))>.69;
  if(movement&&!semantic.same)return {same:false,reason:"distinct-actions-review",review:true};
  if(semantic.same)return {same:true,reason:semantic.reason};
  const related=d.color>.923&&d.pixel<.205&&v.color>.885;
  if(!related)return {same:false,reason:"different-scene"};
  if(movement)return {same:false,reason:"meaningful-motion-review",review:true};
  if((d.pixel<.12&&d.color>.96)||(d.pixel<.178&&d.color>.93&&Math.min(qa,qb)<Math.max(qa,qb)*.83))
    return {same:true,reason:"similar-composition"};
  return {same:false,reason:"possible-content-change",review:true};
}
function value(f){
  const m=metrics(f),d=f.detail||{};
  return quality(f)+Math.log1p(m.lap)*2.8-Math.max(0,m.white-.10)*34-
    (m.lap<1100?(1100-m.lap)/1100*4:0)+(d.dominant>.9?-2:0)-
    (contentDensity(f).sparse?18:0);
}
function curate(frames){
  const all=[...frames].sort((a,b)=>a.t-b.t);
  // Preserve the V5 content-boundary safeguard used by the approved V6 selector.
  let legacyGroup=0,legacyPrior=null;
  for(const f of all){
    f.v6Metrics=null;f.v6Density=null;f.v5=null;f.v6Review=false;f.recommended=false;f.selected=false;
    f.curationGroup=-1;f.curationReason="";f.rejectedBy=null;f.v6LegacyProtected=false;
    if(!legacyPrior){legacyGroup=1;}
    else {const decision=v5SameSequence(legacyPrior,f);
      if(!decision.same){legacyGroup++;f.v6LegacyProtected=decision.reason==="localized-change-review";}
    }
    f.v6LegacyGroup=legacyGroup;legacyPrior=f;
  }
  const qualityExcluded=[],valid=[],groups=[],matches=[],reviews=[];
  const qualityStats={blur:0,exposure:0,wipes:0,nearBlank:0};
  for(let i=0;i<all.length;i++){
    const f=all[i],q=qualityGate(all,i);
    if(q.drop){
      f.curationReason=q.reason;qualityExcluded.push(f);
      if(q.reason==="motion-blur-transition")qualityStats.blur++;
      else if(q.reason==="exposure-flash")qualityStats.exposure++;
      else if(q.reason==="transition-wipe")qualityStats.wipes++;
      else qualityStats.nearBlank++;
    }else{if(q.review){f.v6Review=true;f.v6ReviewReason=q.reason||"soft-frame-check";}valid.push(f);}
  }
  for(const f of valid){
    const g=groups.at(-1);
    if(!g){groups.push([f]);continue;}
    const check=sameV6(g.at(-1),f);
    if(check.same)g.push(f);
    else{if(check.review){f.v6Review=true;f.v6ReviewReason=check.reason;}groups.push([f]);}
  }
  const candidates=[];
  for(let i=0;i<groups.length;i++){
    const g=groups[i],winner=g.reduce((a,b)=>value(a)>=value(b)?a:b);
    candidates.push(winner);
    for(const f of g){f.curationGroup=i+1;if(f!==winner){f.curationReason="same-scene-variation";f.rejectedBy=round(winner.t);}}
  }
  const reps=[];
  for(const f of [...candidates].sort((a,b)=>value(b)-value(a))){
    let match=null;
    for(const p of reps){
      if(f.v6Review||p.v6Review)continue;
      const d=contentDifference(f,p);
      if(d.color>.974&&d.pixel<.055&&d.center<.065){
        if(localizedChange(v5Compare(f,p))){f.v6Review=true;f.v6ReviewReason="localized-change-review";continue;}
        match={p,d};break;
      }
    }
    if(match){f.curationReason="global-near-duplicate";f.rejectedBy=round(match.p.t);
      matches.push({removed:round(f.t),representative:round(match.p.t)});}
    else reps.push(f);
  }
  reps.sort((a,b)=>a.t-b.t);
  for(const f of reps){
    const i=all.indexOf(f),before=all[i-1],after=all[i+1];
    if(!f.v6Review&&before&&after&&f.kind==="scene"){
      if(v5Compare(before,f).color<.72&&v5Compare(f,after).color<.72){
        f.v6Review=true;f.v6ReviewReason="isolated-scene-review";
      }
    }
    f.recommended=true;f.selected=!f.v6Review;
    f.curationReason=f.v6Review?"review-"+(f.v6ReviewReason||"content"):"best-usable-frame";
    if(f.v6Review)reviews.push(round(f.t));
  }
  if(!reps.length&&all.length){
    const best=all.reduce((a,b)=>value(a)>=value(b)?a:b);
    best.recommended=true;best.selected=false;best.v6Review=true;best.curationReason="fallback-needs-review";reps.push(best);reviews.push(round(best.t));
  }
  return {
    version:"V6",captured:all.length,recommended:reps.length,
    selected:all.filter(x=>x.selected).length,excluded:all.length-reps.length,
    sceneGroups:groups.length,sceneVariationsRemoved:all.filter(x=>x.curationReason==="same-scene-variation").length,
    quality:qualityStats,reviewFrames:reviews,globalDuplicates:matches.length,
    decisions:all.map(f=>({time:round(f.t),kind:f.kind,decision:f.recommended?(f.v6Review?"review":"recommended"):"excluded",
      reason:f.curationReason,group:f.curationGroup,replacedBy:f.rejectedBy,
      verifiedTimestamp:!!f.verified,selected:!!f.selected,
      contentDensity:Math.round(contentDensity(f).occupied*100)/100,
      sparseContent:contentDensity(f).sparse}))
  };
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

return {sampleFingerprint,detailFingerprint,frameDifference,probePlan,pickProbe,curate,contentDensity};
})();
