import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const js=fs.readFileSync(new URL('../src/js/presentation/forge-whats-new.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/css/experience/forge-whats-new.css',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');
function storage(seed={}){
 const map=new Map(Object.entries(seed));
 return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
}
function fixture({local=storage(),opening=false,active=false,font='loaded',introFinished=true}={}){
 const timers=[],listeners=new Map(),rootListeners=new Map();
 const listen=(bucket,type,fn)=>{
  if(!bucket.has(type))bucket.set(type,[]);
  bucket.get(type).push(fn);
 };
 const classes=()=>{const values=new Set();return {
  add:v=>values.add(v),contains:v=>values.has(v)}};
 const button=(name)=>{
  const events=new Map();return {name,isConnected:true,hidden:false,
   focus(){doc.activeElement=this;},setAttribute(){},getClientRects:()=>[{}],
   addEventListener:(t,f)=>listen(events,t,f),
   click(){for(const fn of events.get('click')||[])fn({target:this});}};
 };
 const trigger=button('trigger'),never=button('never');
 let skips=0;
 const root={hidden:true,classList:classes(),
  addEventListener:(t,f)=>listen(rootListeners,t,f),
  querySelector:q=>q==='.forge-whatsnew-dialog'?dialog:
   q==='#forgeWhatsNewNever'?never:null,
  fire(type,event){for(const fn of rootListeners.get(type)||[])fn(event);}};
 const dialog={querySelectorAll:()=>[never]};
 const home={classList:{contains:()=>false}},
  app={classList:{contains:k=>k==='active'&&active}};
 const doc={visibilityState:'visible',activeElement:null,
  body:{classList:{contains:k=>k==='forge-opening'&&opening}},
  documentElement:{dataset:introFinished?{forgeIntroFinished:'1'}:{},classList:{contains:()=>false}},
  fonts:{load:()=>font==='hang'?new Promise(()=>{}):Promise.resolve([{status:'loaded'}])},
  getElementById:id=>({
   forgeWhatsNew:root,forgeWhatsNewTrigger:trigger,'view-home':home,
   'view-app':app,forgeIntro:{hidden:true},
   forgeIntroSkip:{click(){opening=false;skips++;}}
  })[id]||null,
  addEventListener:(t,f)=>listen(listeners,t,f),
  dispatch(t){for(const fn of listeners.get(t)||[])fn();}};
 const schedule=(fn,ms)=>{const t={fn,ms,cleared:false};timers.push(t);return t};
 const context={document:doc,localStorage:local,sessionStorage:storage(),
  Promise,setTimeout:schedule,clearTimeout:t=>{if(t)t.cleared=true},
  getComputedStyle:()=>({visibility:'visible'})};
 vm.runInNewContext(js,context,{filename:'forge-whats-new.js'});
 const fire=ms=>{for(const t of timers.filter(t=>t.ms===ms&&!t.cleared)){t.cleared=true;t.fn()}};
 return {doc,root,trigger,never,local,timers,fire,get skips(){return skips}};
}
const flush=async()=>{for(let i=0;i<14;i++)await Promise.resolve()};
test('welcome remains visible through Escape and outside click',async()=>{
 const h=fixture();
 await flush();
 assert.equal(h.root.hidden,false);
 let prevented=false;
 h.root.fire('keydown',{key:'Escape',preventDefault(){prevented=true}});
 assert.equal(prevented,true);
 assert.equal(h.root.hidden,false);
 h.root.fire('pointerdown',{target:h.root});
 assert.equal(h.root.hidden,false);
 h.never.click();
 assert.equal(h.root.hidden,true);
 assert.equal(h.local.getItem('forge_whatsnew_dismissed_2026_v3'),'1');
});
test('only Dont show again suppresses next launch, manual replay remains',async()=>{
 const local=storage({'forge_whatsnew_dismissed_2026_v1':'1'});
 const first=fixture({local});await flush();
 assert.equal(first.root.hidden,false,'Old dismissal must not hide new announcement');
 first.never.click();
 const again=fixture({local});
 await flush();
 assert.equal(again.root.hidden,true,'New opt-out prevents future automatic popup');
 again.trigger.click();await flush();
 assert.equal(again.root.hidden,false,'Manual What’s New always works');
});
test('popup waits for end of intro and never interrupts restored tool',async()=>{
 const pending=fixture({opening:true,introFinished:false});
 await flush();
 assert.equal(pending.root.hidden,true);
 pending.doc.dispatch('forge:intro-complete');
 await flush();
 assert.equal(pending.root.hidden,true);
 const active=fixture({active:true});await flush();
 assert.equal(active.root.hidden,true);
});
test('manual popup may skip the intro without closing itself',async()=>{
 const h=fixture({opening:true,introFinished:false});
 h.trigger.click();await flush();
 assert.equal(h.skips,1);
 assert.equal(h.root.hidden,false);
});
test('font stalls preserve hidden dialog until fallback is stable',async()=>{
 const h=fixture({font:'hang'});
 await flush();
 assert.equal(h.root.hidden,true);
 h.fire(1850);await flush();
 assert.equal(h.root.hidden,false);
 for(const cls of ['forge-fallback-kola','forge-fallback-ui',
  'forge-fallback-serif','forge-fallback-mono'])
   assert.equal(h.root.classList.contains(cls),true);
});
test('build contains exactly one welcome dismissal action and real backdrop',()=>{
 assert.match(build,/forgeWhatsNewNever/);
 assert.equal(build.includes('forgeWhatsNewEnter'),false);
 assert.equal(build.includes('forgeWhatsNewClose'),false);
 assert.match(css,/PERSISTENT WELCOME/);
 assert.match(css,/backdrop-filter:blur\(24px\)/);
 assert.match(css,/place-items:center!important/);
});
