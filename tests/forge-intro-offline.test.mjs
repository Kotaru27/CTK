import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const code=fs.readFileSync(new URL('../src/js/presentation/forge-brand.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/css/experience/forge-brand.css',import.meta.url),'utf8');

function fixture({font='missing',reduced=false,restored=false}={}){
  const timers=[],flights=[];
  const names=new Set();
  const makeClasses=(initial=[])=>{
    const set=new Set(initial);
    return {contains:name=>set.has(name),add:(...values)=>values.forEach(v=>set.add(v)),
      remove:(...values)=>values.forEach(v=>set.delete(v))};
  };
  const intro={removed:false,remove(){this.removed=true;}};
  const skip={click(){for(const fn of this.callbacks)fn();},callbacks:[],
    addEventListener(_event,fn){this.callbacks.push(fn);}};
  const heading={animate(frames,options){
    const flight={frames,options,cancelled:false,cancel(){this.cancelled=true;},
      finished:new Promise(()=>{})};
    flights.push(flight);
    return flight;
  }};
  const home={classList:makeClasses()};
  const app={classList:makeClasses(restored?['active']:[])};
  const body={classList:{contains:name=>names.has(name),
    add:(...values)=>values.forEach(v=>names.add(v)),
    remove:(...values)=>values.forEach(v=>names.delete(v))}};
  const doc={
    body,visibilityState:'visible',documentElement:{dataset:{}},
    getElementById(id){
      return {'forgeIntro':intro,'forgeHeroName':heading,
        'forgeIntroSkip':skip,'view-home':home,'view-app':app}[id]||null;
    },
    addEventListener(){},removeEventListener(){},dispatchEvent(){}
  };
  if(font==='hang')doc.fonts={load:()=>new Promise(()=>{})};
  if(font==='reject')doc.fonts={load:()=>Promise.reject(new Error('offline'))};
  const context={
    document:doc,window:{matchMedia:()=>({matches:reduced})},
    Event:class {constructor(type){this.type=type;}},
    setTimeout:fn=>{timers.push(fn);return timers.length;},
    clearTimeout(){},requestAnimationFrame:fn=>fn(),
    Promise,Math,MutationObserver:undefined
  };
  vm.runInNewContext(code,context,{filename:'forge-brand.js'});
  return {timers,flights,intro,skip,doc,names};
}
async function settle(){
  for(let i=0;i<8;i++)await Promise.resolve();
}
test('missing remote font still animates real hero heading',async()=>{
  const f=fixture();
  await settle();
  assert.equal(f.flights.length,1);
  const flight=f.flights[0];
  assert.equal(flight.options.duration,2250);
  assert.match(flight.frames[0].clipPath,/100/);
  assert.match(flight.frames.at(-1).clipPath,/0\.000/);
  assert.equal(f.names.has('forge-opening'),true);
  f.skip.click();
  assert.equal(f.names.has('forge-opening'),false);
  assert.equal(f.doc.documentElement.dataset.forgeIntroFinished,'1');
});
test('hung font request times out into an animated entrance',async()=>{
  const f=fixture({font:'hang'});
  assert.equal(f.flights.length,0);
  assert.equal(f.timers.length,2);
  f.timers[1]();
  await settle();
  assert.equal(f.flights.length,1);
  f.skip.click();
});
test('rejected font request still animates; reduced motion does not',async()=>{
  const rejected=fixture({font:'reject'});
  await settle();
  assert.equal(rejected.flights.length,1);
  rejected.skip.click();
  const reduced=fixture({reduced:true});
  await settle();
  assert.equal(reduced.flights.length,0);
  assert.equal(reduced.intro.removed,true);
  assert.equal(reduced.doc.documentElement.dataset.forgeIntroFinished,'1');
});
test('restored active tool bypasses splash, without changing tool state',async()=>{
  const f=fixture({restored:true});
  await settle();
  assert.equal(f.flights.length,0);
  assert.equal(f.intro.removed,true);
  assert.equal(f.doc.documentElement.dataset.forgeIntroFinished,'1');
});
test('intro has no opaque stage and respects reduced motion',()=>{
  assert.match(css,/body\.forge-opening #forgeHeroName \{/);
  assert.match(css,/clip-path:inset\(0 100% 0 0\)/);
  assert.match(css,/clip-path:none!important/);
  assert.match(css,/\.forge-intro::before,\.forge-intro::after/);
});
