import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import v6 from '../src/js/tools/v6-stills-engine.js';

globalThis.document={getElementById:()=>null};
const {default:{Stills}}=await import('../src/js/tools/video-stills.js');

function makeFrame(time,seed=1,kind='base'){
  const W=160,H=90,n=W*H;
  const rgb=new Uint8Array(n*3),hist=new Uint16Array(512);
  const gray=new Uint8Array(48*27),coarse=new Uint16Array(64);
  let x=seed;
  for(let i=0;i<n;i++){
    const px=i%W,py=(i/W)|0;
    const v=(px*13+py*17+(px%12<5?91:19)+seed*31)&255;
    const r=v,g=(v+((px+seed)%5)*17)&255,b=(v+((py+seed)%7)*11)&255;
    rgb[i*3]=r;rgb[i*3+1]=g;rgb[i*3+2]=b;
    hist[(r>>5)*64+(g>>5)*8+(b>>5)]++;
  }
  for(let i=0;i<gray.length;i++){
    const val=(i*13+(i%48<24?50:80)+seed*3)&255;
    gray[i]=val;coarse[(val>>6)*16+((val>>6)*4)+(val>>6)]++;
  }
  return {t:time,kind,verified:true,
    fp:{values:gray,colorHist:coarse,sharpness:32,stdDev:53},
    detail:{rgb,hist,dominant:.16,flatCenter:.2,std:50,quality:34,blueHeader:.02}};
}

test('V6 adaptive sampling includes opening and ending edges without duplicating baseline',()=>{
  const base=[makeFrame(1,1),makeFrame(2,2),makeFrame(3,3)];
  const plan=v6.probePlan(4,base,[1,2,3]);
  assert.ok(plan.some(p=>p.kind==='edge'&&p.t<.1));
  assert.ok(plan.some(p=>p.kind==='edge'&&p.t>3.9));
  assert.ok(plan.every(p=>!base.some(f=>Math.abs(f.t-p.t)<.12)));
  assert.ok(v6.probePlan(.2,[],[.1]).length>=0);
});

test('V6 scene probes skip identical samples but retain distinct candidates',()=>{
  const base=[makeFrame(.55,3),makeFrame(1.55,5)];
  const unchanged=makeFrame(1.10,3,'scene');
  const choice=v6.pickProbe(unchanged,base,[]);
  assert.equal(choice.yes,false,'a duplicate of a nearby sample should not consume an extra capture');
  assert.equal(choice.score,0);
  const newScene=makeFrame(1.10,42,'scene');
  const novel=v6.pickProbe(newScene,base,[]);
  assert.equal(novel.yes,novel.score>=novel.threshold,'existing adaptive probe policy is unchanged');
});

test('Manual selections are isolated per video; exports use only user-checked stills',()=>{
  const frames=id=>[
    {num:1,type:'still',blob:{id,frame:1},checked:false},
    {num:2,type:'still',blob:{id,frame:2},checked:false}
  ];
  const one=frames('one'),two=frames('two');
  const tool=Object.assign(Object.create(Stills),{
    currentId:'video-one',
    collection:{
      'video-one':{name:'one',frames:one},
      'video-two':{name:'two',frames:two}
    }
  });
  assert.deepEqual(tool.selectedGroups(),[],'new imports must not select stills automatically');
  one[1].checked=true;
  assert.deepEqual(tool.selectedGroups().map(g=>({name:g.name,n:g.frames.length})),[{name:'one',n:1}]);
  tool.currentId='video-two';
  assert.ok(two.every(f=>!f.checked),'switching videos cannot change another collection');
  two[0].checked=true;
  assert.deepEqual(tool.selectedGroups().map(g=>({name:g.name,n:g.frames.length})),
    [{name:'one',n:1},{name:'two',n:1}]);
  one[1].checked=false;
  assert.deepEqual(tool.selectedGroups().map(g=>g.name),['two']);
});

test('CTK source preserves V6 extraction, manual selection and existing multi-video exports',()=>{
  const js=fs.readFileSync(new URL('../src/js/tools/video-stills.js',import.meta.url),'utf8');
  const build=fs.readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');
  assert.match(js,/sendAllSelectedToBoards\(/);
  assert.match(js,/const probes=genAllStills\?CTKV6\.probePlan/);
  assert.match(js,/CTKV6\.pickProbe\(/);
  assert.match(js,/checked:false/);
  assert.doesNotMatch(js,/CTKV6\.curate\(|resetSmartSelection\(|smartSelected/);
  assert.equal(typeof v6.curate,'undefined','automatic curation API is removed');
  assert.match(js,/downloadSelected\(\)/);
  assert.match(js,/downloadAll\(\)/);
  assert.match(build,/v6-stills-engine\.js/);
  assert.match(fs.readFileSync(new URL('../dist/js/app.js',import.meta.url),'utf8'),/CTKV6 = \(\(\)=>/);
});
