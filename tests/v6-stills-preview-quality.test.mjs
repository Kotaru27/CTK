import test from 'node:test';
import assert from 'node:assert/strict';
import v6 from '../src/js/tools/v6-stills-engine.js';

function fakeFrame(t,{pillar=true,detail=false,patch=false}={}){
  const W=160,H=90,rgb=new Uint8Array(W*H*3);
  const l=pillar?52:0,r=pillar?108:160;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=(y*W+x)*3;
    let R=95,G=101,B=99;
    if(x>=l&&x<r){
      if(detail){
        R=(x*17+y*11)%256;G=(x*7+y*29)%256;B=(x*13+y*23)%256;
      }else{
        R=23;G=47;B=143;
        if(patch&&x>=76&&x<86&&y>=10&&y<18){
          R=(x*y*31)%256;G=200;B=(x+y)%256;
        }
      }
    }
    rgb[i]=R;rgb[i+1]=G;rgb[i+2]=B;
  }
  const hist=new Uint16Array(512);
  for(let k=0;k<rgb.length;k+=3)hist[(rgb[k]>>5)*64+(rgb[k+1]>>5)*8+(rgb[k+2]>>5)]++;
  const gray=new Uint8Array(48*27),colorHist=new Uint16Array(64);
  for(let y=0;y<27;y++)for(let x=0;x<48;x++){
    const sx=Math.min(W-1,Math.floor(x*W/48));
    const sy=Math.min(H-1,Math.floor(y*H/27));
    const k=(sy*W+sx)*3,q=y*48+x;
    gray[q]=Math.round((rgb[k]+rgb[k+1]+rgb[k+2])/3);
    colorHist[((rgb[k]>>6)<<4)|((rgb[k+1]>>6)<<2)|(rgb[k+2]>>6)]++;
  }
  const mean=gray.reduce((a,b)=>a+b,0)/gray.length;
  const stdDev=Math.sqrt(gray.reduce((a,b)=>a+(b-mean)**2,0)/gray.length);
  return {
    t,kind:'base',verified:true,
    fp:{values:gray,colorHist,stdDev,sharpness:detail?46:5},
    detail:{rgb,hist,dominant:detail?.10:.72,flatCenter:detail?.08:.78,quality:detail?44:3}
  };
}

test('V6 identifies low-information colored portrait panels with small logo patches without color or brand rules',()=>{
  const blue=fakeFrame(1,{pillar:true,patch:true});
  const gray=fakeFrame(2,{pillar:true,patch:false});
  const art=fakeFrame(3,{pillar:true,detail:true});
  assert.equal(v6.contentDensity(blue).sparse,true);
  assert.equal(v6.contentDensity(gray).sparse,true);
  assert.equal(v6.contentDensity(art).sparse,false);
});

test('V6 keeps sparse captures visible but starts them unchecked, retaining richer portrait frames',()=>{
  const frames=[
    fakeFrame(.5,{pillar:true,detail:true}),
    fakeFrame(1.5,{pillar:true,patch:true}),
    fakeFrame(2.5,{pillar:true,detail:true})
  ];
  const report=v6.curate(frames);
  assert.equal(report.captured,3);
  const muted=frames[1];
  assert.equal(muted.selected,false,'near-empty portrait panel must not be auto-exported');
  assert.match(muted.curationReason,/sparse|blank|review|same-scene/);
  assert.equal(frames.length,3,'curation must not delete frames');
});

test('V6 does not penalize richly detailed portrait artwork as an empty interstitial',()=>{
  const detailed=fakeFrame(.5,{pillar:true,detail:true});
  const density=v6.contentDensity(detailed);
  assert.equal(density.sparse,false);
  assert.ok(density.occupied>0.18);
});

test('V6 keeps a landscape filled image distinct from a near-empty title card',()=>{
  const full=fakeFrame(.5,{pillar:false,detail:true});
  const sparse=fakeFrame(1.5,{pillar:false,patch:true});
  assert.equal(v6.contentDensity(full).sparse,false);
  assert.equal(v6.contentDensity(sparse).sparse,true);
});
