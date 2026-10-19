import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/js/presentation/forge-brand.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/css/experience/forge-brand.css',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');

function setup({font='loaded',reduced=false,active=false,hidden=false,suppress=false,kinetic=false}={}){
 let now=0,seq=0;
 const timers=new Map(),events=new Map(),notices=[],kineticFlights=[];
 const classes=(initial=[])=>{
  const values=new Set(initial);
  return {contains:x=>values.has(x),add:(...items)=>items.forEach(x=>values.add(x)),
   remove:(...items)=>items.forEach(x=>values.delete(x))};
 };
 const skipHandlers=[];
 const parts=['Import','|','Recreate','|','Export'].map(text=>({textContent:text,classList:classes()}));
 const intro={hidden:true,removed:false,classList:classes(),
  querySelectorAll:selector=>selector==='.forge-intro-step-part'?parts:[],
  remove(){this.removed=true}};
 const typed={textContent:'',getBoundingClientRect:()=>({width:typed.textContent.length*15})};
 const mark={dataset:{fullName:'The Forge'},
  querySelector:q=>q==='.forge-intro-typed'?typed:null,
  appendChild(glyph){return glyph}};
 const createElement=()=>({
  className:'',style:{},textContent:'',removed:false,
  setAttribute(){},remove(){this.removed=true},
  getBoundingClientRect:()=>({width:14}),
  animate(frames,options){
   kineticFlights.push({frames,options});
   return {finished:Promise.resolve()};
  }
 });
 const skip={addEventListener(_type,fn){skipHandlers.push(fn)},
  click(){for(const fn of skipHandlers)fn()}};
 const home={classList:classes()},app={classList:classes(active?['active']:[])};
 const body={classList:classes()};
 const document={body,visibilityState:hidden?'hidden':'visible',
  ...(kinetic?{createElement}:{}),
  documentElement:{dataset:{},classList:classes()},
  fonts:{load:spec=>font==='hang'?new Promise(()=>{}):
   font==='failed'?Promise.reject(new Error('offline')):
   font==='secondary-hang'&&!spec.includes('Kola')?new Promise(()=>{}):
   Promise.resolve([{status:'loaded'}])},
  getElementById:id=>({
   forgeIntro:intro,forgeIntroWordmark:mark,forgeIntroSkip:skip,
   'view-home':home,'view-app':app
  })[id]||null,
  addEventListener:(event,fn)=>events.set(event,fn),
  removeEventListener:(event,fn)=>{
   if(events.get(event)===fn)events.delete(event);
  },
  dispatchEvent:event=>{notices.push(event.type);}
 };
 const schedule=(fn,delay)=>{
  const id=++seq;timers.set(id,{due:now+delay,fn});return id;
 };
 const clear=id=>timers.delete(id);
 const context={document,window:{matchMedia:()=>({matches:reduced})},
  sessionStorage:{getItem:()=>suppress?'1':null},
  Event:class{constructor(type){this.type=type}},
  setTimeout:schedule,clearTimeout:clear,
  requestAnimationFrame:fn=>fn(),MutationObserver:undefined,Promise,Math,Array};
 vm.runInNewContext(source,context,{filename:'forge-brand.js'});
 function advance(amount){
  const goal=now+amount;
  while(true){
   let next=null,id=null;
   for(const [key,t] of timers){
    if(t.due<=goal&&(!next||t.due<next.due)){next=t;id=key;}
   }
   if(!next)break;
   now=next.due;timers.delete(id);next.fn();
  }
  now=goal;
 }
 return {advance,typed,intro,parts,skip,document,body,notices,timers,kineticFlights,get time(){return now}};
}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};

test('real character-by-character typing, steady rhythm and composed exit',async()=>{
 const h=setup();
 await settle();
 assert.equal(h.typed.textContent,'T');
 h.advance(112);
 assert.equal(h.typed.textContent,'Th');
 h.advance(116);
 assert.equal(h.typed.textContent,'The');
 assert.equal(h.intro.removed,false);
 h.advance(1100);
 assert.equal(h.typed.textContent,'The Forge');
 assert.equal(h.intro.classList.contains('forge-intro-finishing'),false);
 h.advance(1500);
 assert.equal(h.parts.map(p=>p.classList.contains('is-visible')).every(Boolean),true);
 assert.equal(h.intro.classList.contains('forge-intro-finishing'),true);
 assert.equal(h.intro.removed,false,'Intro must not be removed before its exit fade');
 h.advance(170);
 assert.equal(h.intro.removed,true);
 assert.equal(h.document.documentElement.dataset.forgeIntroFinished,'1');
 assert.equal(h.body.classList.contains('forge-opening'),false);
 assert.deepEqual(h.notices,['forge:intro-complete']);
 assert.ok(h.time<3500,'Caption and handoff took unexpectedly long');
});

test('slow and failed font loads still finish typing and unlock homepage',async()=>{
 for(const font of ['hang','failed','secondary-hang']){
  const h=setup({font});
  if(font!=='failed')h.advance(1350);
  await settle();
  assert.equal(h.typed.textContent,'T');
  h.advance(3200);
  assert.equal(h.intro.removed,true);
  assert.equal(h.typed.textContent,'The Forge');
  assert.equal(h.notices.length,1);
  if(font==='secondary-hang')
   assert.equal(h.document.documentElement.classList.contains('forge-launch-fallback-kola'),false);
 }
});

test('Skip immediately cancels typing and never signals twice',async()=>{
 const h=setup();await settle();
 h.advance(112);
 h.skip.click();
 assert.equal(h.intro.removed,true);
 assert.equal(h.notices.length,1);
 h.advance(10000);
 assert.equal(h.typed.textContent,'Th');
 assert.equal(h.notices.length,1);
});

test('restored workspace, reduced motion and hidden document skip safely',()=>{
 for(const opts of [{active:true},{reduced:true},{hidden:true},{suppress:true}]){
  const h=setup(opts);
  assert.equal(h.intro.removed,true);
  assert.deepEqual(h.notices,['forge:intro-complete']);
 }
});

test('typing markup reserves full word width and does not mask Kola descender',()=>{
 assert.match(build,/data-full-name="The Forge"/);
 assert.match(build,/class="forge-intro-typed"/);
 assert.match(css,/TYPOGRAPHIC GEOMETRY/);
 assert.match(css,/content:attr\(data-full-name\)/);
 assert.match(css,/clip-path:none!important/);
 assert.match(css,/line-height:1\.26!important/);
 assert.ok(!source.includes('function handoff()'));
 assert.ok(!source.includes('mark.animate('));
});

test('kinetic character echo is deterministic, subtle, and never disturbs native Kola text',async()=>{
 const h=setup({kinetic:true});
 await settle();
 assert.equal(h.typed.textContent,'T');
 assert.equal(h.kineticFlights.length,1);
 const arrival=h.kineticFlights[0];
 assert.equal(arrival.options.duration,245);
 assert.equal(arrival.frames[0].opacity,.30);
 assert.match(arrival.frames[0].transform,/translate3d\(-8px,12px,-15px\)/);
 assert.equal(arrival.frames.at(-1).opacity,0);
 h.advance(112);
 assert.equal(h.typed.textContent,'Th');
 assert.equal(h.kineticFlights.length,2);
 h.advance(3500);
 assert.equal(h.typed.textContent,'The Forge');
 assert.equal(h.intro.removed,true);
 assert.equal(h.notices.length,1);
});
test('What’s new never acquires a global orange-red focus outline',()=>{
 assert.match(css,/#view-home #forgeWhatsNewTrigger:focus-visible\{/);
 assert.match(css,/outline:none!important/);
 assert.match(css,/text-decoration-color:#245b41!important/);
 assert.match(css,/MICRO-KINETIC TYPE V7/);
});
