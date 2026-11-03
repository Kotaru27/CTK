import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const js=fs.readFileSync(new URL('../src/js/presentation/forge-brand.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/css/experience/forge-brand.css',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');
function fixture({font='loaded',reduced=false,active=false,suppress=false,hidden=false}={}){
 let now=0,serial=0;const timers=new Map(),listeners=new Map(),events=[];
 const cls=(seed=[])=>{const v=new Set(seed);return {
   add:(...a)=>a.forEach(x=>v.add(x)),remove:(...a)=>a.forEach(x=>v.delete(x)),
   contains:x=>v.has(x)}};
 const skipHandlers=[],tickClass=Array.from({length:8},()=>cls());
 const intro={hidden:true,removed:false,classList:cls(),
   querySelectorAll:s=>s==='.forge-cine-ticks i'?tickClass.map(x=>({classList:x})):[],
   remove(){this.removed=true}};
 const counter={textContent:'00'};
 const home={classList:cls()},app={classList:cls(active?['active']:[])};
 const body={classList:cls()};
 const gate={released:0,ended:0,release(){this.released++},endWelcome(){this.ended++}};
 const skip={addEventListener:(_,fn)=>skipHandlers.push(fn),
   click(){skipHandlers.forEach(fn=>fn())}};
 const document={body,visibilityState:hidden?'hidden':'visible',
   documentElement:{dataset:{},classList:cls()},
   fonts:{load:()=>font==='hang'?new Promise(()=>{}):font==='failed'?Promise.reject(Error('offline')):Promise.resolve([{}])},
   getElementById:id=>({'forgeIntro':intro,'forgeIntroSkip':skip,'forgeCineCounter':counter,
     'view-home':home,'view-app':app})[id]||null,
   addEventListener:(name,fn)=>listeners.set(name,fn),
   removeEventListener:name=>listeners.delete(name),
   dispatchEvent:e=>events.push(e.type)};
 const schedule=(fn,ms)=>{const id=++serial;timers.set(id,{fn,due:now+ms});return id};
 vm.runInNewContext(js,{document,window:{__forgePaintGate:gate,matchMedia:()=>({matches:reduced})},
   sessionStorage:{getItem:()=>suppress?'1':null},MutationObserver:undefined,
   setTimeout:schedule,clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>fn(),
   Event:class{constructor(type){this.type=type}},Promise,Array,Math});
 function advance(ms){const goal=now+ms;while(true){let min=Infinity,key=null;
   for(const [id,t] of timers)if(t.due<=goal&&t.due<min){min=t.due;key=id}
   if(key===null)break;now=min;const t=timers.get(key);timers.delete(key);t.fn();
  }now=goal;}
 return {intro,body,counter,ticks:tickClass,skip,document,events,gate,advance};
}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
test('intro assembles eight named icons, then synchronizes reveal and completion',async()=>{
 const h=fixture();await settle();
 assert.equal(h.intro.hidden,false);
 assert.equal(h.intro.classList.contains('forge-cine-playing'),true);
 assert.equal(h.body.classList.contains('forge-opening'),true);
 h.advance(1650);
 assert.equal(h.counter.textContent,'08');
 assert.equal(h.ticks.every(t=>t.contains('is-lit')),true);
 assert.equal(h.body.classList.contains('forge-home-arriving'),false);
 h.advance(1500);
 assert.equal(h.intro.classList.contains('forge-cine-leaving'),true);
 assert.equal(h.body.classList.contains('forge-home-arriving'),true);
 assert.equal(h.body.classList.contains('forge-handoff'),true);
 assert.equal(h.body.classList.contains('forge-cine-home-reveal'),true);
 assert.equal(h.intro.removed,false);
 h.advance(1160);
 assert.equal(h.intro.removed,true);
 assert.equal(h.body.classList.contains('forge-opening'),false);
 assert.deepEqual(h.events,['forge:intro-complete']);
});
test('offline font still starts the assembly and releases the app',async()=>{
 for(const font of ['hang','failed']){
  const h=fixture({font});
  if(font==='hang')h.advance(900);
  await settle();
  assert.equal(h.intro.hidden,false);
  h.advance(4500);
  assert.equal(h.intro.removed,true);
  assert.deepEqual(h.events,['forge:intro-complete']);
 }
});
test('skip cancels all timers, does not leave the homepage covered',async()=>{
 const h=fixture();await settle();h.advance(750);h.skip.click();
 assert.equal(h.intro.removed,true);
 assert.equal(h.body.classList.contains('forge-opening'),false);
 h.advance(10000);
 assert.deepEqual(h.events,['forge:intro-complete']);
});
test('reduced motion, hidden tab, suppressed intro or restored tool bypass opening',()=>{
 for(const opts of [{reduced:true},{hidden:true},{suppress:true},{active:true}]){
  const h=fixture(opts);
  assert.equal(h.intro.removed,true);
  assert.deepEqual(h.events,['forge:intro-complete']);
 }
});
test('source has eight locally rendered pictograms, a bounded handoff and mobile motion safety',()=>{
 assert.match(build,/forge-cine-piece/);
 assert.match(build,/forge-cine-shutter/);
 assert.match(build,/forgeCineCounter/);
 assert.match(css,/forge-cine-piece-in/);
 assert.match(css,/forge-cine-curtain/);
 assert.match(css,/\.forge-cine-piece svg\{/);
 assert.match(css,/max-width:720px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(js,/schedule\(finish,6200\)/);
 assert.doesNotMatch(js,/fetch\(|openTool|home-card/);
});
