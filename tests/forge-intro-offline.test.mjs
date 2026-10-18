import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const js=fs.readFileSync(new URL('../src/js/presentation/forge-brand.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/css/experience/forge-brand.css',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');
function fixture({font='missing',reduced=false,active=false}={}){
 const timers=[],animations=[],listeners=new Map();
 const classes=(initial=[])=>{
  const values=new Set(initial);
  return {contains:x=>values.has(x),add:(...xs)=>xs.forEach(x=>values.add(x)),
   remove:(...xs)=>xs.forEach(x=>values.delete(x))};
 };
 const animation=(kind,frames,options)=>{
  const flight={kind,frames,options,cancelled:false,
   cancel(){this.cancelled=true;},finished:Promise.resolve()};
  animations.push(flight);return flight;
 };
 const word=(kind)=>({style:{},animate:(frames,options)=>animation(kind,frames,options)});
 const words=[word('The'),word('Forge')];
 const intro={hidden:true,removed:false,classList:classes(),remove(){this.removed=true}};
 const skip={handlers:[],addEventListener(_event,fn){this.handlers.push(fn);},
  click(){for(const fn of this.handlers)fn();}};
 const mark={style:{},querySelectorAll:()=>words,
  getBoundingClientRect:()=>({left:410,top:350,width:550,height:155}),
  animate:(frames,options)=>animation('handoff',frames,options)};
 const heading={getBoundingClientRect:()=>({left:215,top:245,width:450,height:145})};
 const home={classList:classes()},app={classList:classes(active?['active']:[])};
 const body={classList:classes()};
 const doc={body,visibilityState:'visible',documentElement:{dataset:{},classList:classes()},
  getElementById:id=>({
   forgeIntro:intro,forgeIntroWordmark:mark,forgeHeroName:heading,
   forgeIntroSkip:skip,'view-home':home,'view-app':app
  })[id]||null,addEventListener(){},removeEventListener(){},dispatchEvent(){}};
 if(font==='loaded')doc.fonts={load:()=>Promise.resolve([{status:'loaded'}])};
 if(font==='hang')doc.fonts={load:()=>new Promise(()=>{})};
 if(font==='reject')doc.fonts={load:()=>Promise.reject(new Error('offline'))};
 if(font==='secondary-hang')doc.fonts={load:s=>s.includes('Kola')?
  Promise.resolve([{status:'loaded'}]):new Promise(()=>{})};
 const context={document:doc,window:{matchMedia:()=>({matches:reduced})},
  sessionStorage:{getItem:()=>null},Event:class{constructor(type){this.type=type}},
  setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},
  requestAnimationFrame:fn=>fn(),MutationObserver:undefined,Promise,Math};
 vm.runInNewContext(js,context,{filename:'forge-brand.js'});
 return {timers,animations,intro,skip,doc,body,words};
}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
test('The and Forge appear separately without cutting any glyph',async()=>{
 const h=fixture();await flush();
 assert.deepEqual(h.animations.map(a=>a.kind),['The','Forge']);
 assert.equal(h.animations[0].options.delay,0);
 assert.equal(h.animations[1].options.delay,260);
 for(const a of h.animations){
  assert.equal(a.frames.every(f=>!('clipPath' in f)),true);
  assert.equal(a.frames.every(f=>typeof f.opacity==='number'),true);
 }
 h.timers.at(-1)();await flush();
 assert.equal(h.animations.at(-1).kind,'handoff');
 assert.equal(h.doc.documentElement.dataset.forgeIntroFinished,'1');
});
test('slow, rejected and partially loaded fonts do not strand the entrance',async()=>{
 for(const font of ['hang','reject','secondary-hang']){
  const h=fixture({font});
  if(font!=='reject'){assert.equal(h.animations.length,0);h.timers[1]();}
  await flush();
  assert.equal(h.animations.length,2);
  if(font==='secondary-hang')
   assert.equal(h.doc.documentElement.classList.contains('forge-launch-fallback-kola'),false);
  h.skip.click();
  assert.equal(h.intro.removed,true);
 }
});
test('restored workspace and reduced motion bypass safely',()=>{
 for(const opts of [{active:true},{reduced:true}]){
  const h=fixture(opts);
  assert.equal(h.intro.removed,true);
  assert.equal(h.animations.length,0);
 }
});
test('Kola descender is never hidden behind a mask or tight line box',()=>{
 assert.match(css,/INTACT WORD ENTRANCE/);
 assert.match(css,/clip-path:none!important/);
 assert.match(css,/line-height:1\.26!important/);
 assert.match(css,/overflow:visible!important/);
 assert.match(build,/forge-intro-word-first/);
 assert.match(build,/forge-intro-word-second/);
 assert.match(build,/The Forge introduction" hidden/);
});
