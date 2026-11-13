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

test('V6 keeps all captures and records smart-selection state independently',()=>{
  const frames=[makeFrame(.08,3,'edge'),makeFrame(.95,3),makeFrame(2.3,18,'scene'),makeFrame(3.4,45)];
  const report=v6.curate(frames);
  assert.equal(report.captured,4);
  assert.equal(frames.length,4);
  assert.equal(frames.filter(f=>f.selected).length,report.selected);
  assert.ok(frames.every(f=>typeof f.recommended==='boolean'&&typeof f.selected==='boolean'));
  assert.ok(report.decisions.every(x=>x.reason&&Number.isFinite(x.time)));
});

test('Reset to V6 smart picks affects only the open video collection',()=>{
  const make=(id)=>[{num:1,type:'still',blob:{id},checked:false,smartSelected:true},
    {num:2,type:'still',blob:{id},checked:true,smartSelected:false}];
  const a=make('one'),b=make('two'),originalB=b.map(x=>x.checked);
  const tool=Object.assign(Object.create(Stills),{
    currentId:'video-one',
    collection:{'video-one':{name:'one',frames:a},'video-two':{name:'two',frames:b}},
    openDetail(){},
    updateCollectionStatus(){},
    updateBulkBoardButton(){}
  });
  tool.resetSmartSelection();
  assert.deepEqual(a.map(f=>f.checked),[true,false]);
  assert.deepEqual(b.map(f=>f.checked),originalB);
  assert.deepEqual(tool.selectedGroups().map(x=>x.name),['one','two']);
});

test('CTK source preserves existing multi-board / selected ZIP workflows and final V6 port',()=>{
  const js=fs.readFileSync(new URL('../src/js/tools/video-stills.js',import.meta.url),'utf8');
  const build=fs.readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');
  assert.match(js,/sendAllSelectedToBoards\(/);
  assert.match(js,/const smartMode = false/);
  assert.match(js,/const report=CTKV6\.curate\(frames\)/);
  assert.match(js,/resetSmartSelection\(\)/);
  assert.match(js,/smartSelected:!!frame.selected/);
  assert.match(js,/downloadSelected\(\)/);
  assert.match(js,/downloadAll\(\)/);
  assert.match(build,/v6-stills-engine\.js/);
  assert.match(fs.readFileSync(new URL('../dist/js/app.js',import.meta.url),'utf8'),/CTKV6 = \(\(\)=>/);
});
