import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const js=fs.readFileSync(new URL('../src/js/presentation/forge-whats-new.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/css/experience/forge-whats-new.css',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');
const store=()=>{
 const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
};
const classes=()=>{const s=new Set();return {add:x=>s.add(x),contains:x=>s.has(x)}};
function setup({local=store(),introFinished=true,opening=false,active=false,font='loaded'}={}){
 const timers=[],listeners=new Map(),buttons={};
 const listen=(bucket,event,fn)=>{if(!bucket.has(event))bucket.set(event,[]);bucket.get(event).push(fn)};
 for(const id of ['forgeWhatsNewTrigger','forgeWhatsNewEnter','forgeWhatsNewNever','forgeWhatsNewClose']){
  const events=new Map();
  buttons[id]={hidden:false,isConnected:true,addEventListener:(type,fn)=>listen(events,type,fn),
   click(){for(const fn of events.get('click')||[])fn({target:this})},
   focus(){doc.activeElement=this},setAttribute(){},getClientRects:()=>[{}]};
 }
 const modalEvents=new Map(),intro={hidden:true};
 const root={hidden:true,classList:classes(),addEventListener:(type,fn)=>listen(modalEvents,type,fn),
  querySelector:q=>q==='.forge-whatsnew-dialog'?{querySelectorAll:()=>Object.values(buttons)}:buttons[q.slice(1)],
  keydown(e){for(const fn of modalEvents.get('keydown')||[])fn(e)}};
 const host={classList:{contains:()=>false}};
 const workspace={classList:{contains:k=>k==='active'&&active}};
 let skips=0;
 const doc={visibilityState:'visible',activeElement:null,
  body:{classList:{contains:k=>k==='forge-opening'&&opening}},
  documentElement:{dataset:introFinished?{forgeIntroFinished:'1'}:{},classList:{contains:()=>false}},
  fonts:{load(spec){return font==='hang'?new Promise(()=>{}):
    font==='partial'&&!spec.includes('Kola')?new Promise(()=>{}):
    font==='fail'?Promise.reject(Error('Offline')):Promise.resolve([{status:'loaded'}])}},
  getElementById:id=>id==='forgeWhatsNew'?root:id==='view-home'?host:
    id==='view-app'?workspace:id==='forgeIntro'?intro:id==='forgeIntroSkip'?{
     click(){opening=false;skips++;}}:buttons[id]||null,
  addEventListener:(type,fn)=>listen(listeners,type,fn),
  dispatch(type){for(const fn of listeners.get(type)||[])fn()}};
 const schedule=(fn,ms)=>{const t={fn,ms,cancelled:false};timers.push(t);return t};
 const context={document:doc,localStorage:local,sessionStorage:store(),Promise,
  setTimeout:schedule,clearTimeout:t=>{if(t)t.cancelled=true},
  getComputedStyle:()=>({visibility:'visible'})};
 vm.runInNewContext(js,context,{filename:'forge-whats-new.js'});
 function fire(ms){for(const t of timers.filter(x=>x.ms===ms&&!x.cancelled)){t.cancelled=true;t.fn()}}
 return {root,doc,buttons,timers,local,fire,get skips(){return skips}};
}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
test('auto show after intro and return on next visit unless permanently dismissed',async()=>{
 const local=store();
 const waiting=setup({local,introFinished:false,opening:true});
 assert.equal(waiting.timers.length,0,'No popup before intro is complete');
 const one=setup({local});
 one.fire(420);await flush();
 assert.equal(one.root.hidden,false);
 one.buttons.forgeWhatsNewEnter.click();
 assert.equal(local.getItem('forge_whatsnew_dismissed_2026_v1'),null);
 const two=setup({local});two.fire(420);await flush();
 assert.equal(two.root.hidden,false);
 two.buttons.forgeWhatsNewClose.click();
 const three=setup({local});three.fire(420);await flush();
 assert.equal(three.root.hidden,false);
 three.buttons.forgeWhatsNewNever.click();
 assert.equal(local.getItem('forge_whatsnew_dismissed_2026_v1'),'1');
 const four=setup({local});
 assert.equal(four.timers.length,0);
 four.buttons.forgeWhatsNewTrigger.click();await flush();
 assert.equal(four.root.hidden,false);
});
test('modal never shows in fallback font before readiness',async()=>{
 const h=setup({font:'hang'});h.fire(420);await flush();
 assert.equal(h.root.hidden,true);
 h.fire(1850);await flush();
 assert.equal(h.root.hidden,false);
 for(const name of ['forge-fallback-kola','forge-fallback-ui','forge-fallback-serif','forge-fallback-mono'])
  assert.equal(h.root.classList.contains(name),true);
 const loaded=setup();loaded.fire(420);await flush();
 assert.equal(loaded.root.hidden,false);
 assert.equal(loaded.root.classList.contains('forge-fallback-kola'),false);
});
test('restored tool is unobstructed; manual click during intro still works',async()=>{
 const busy=setup({active:true});busy.fire(420);await flush();
 assert.equal(busy.root.hidden,true);
 const manual=setup({introFinished:false,opening:true});
 manual.buttons.forgeWhatsNewTrigger.click();await flush();
 assert.equal(manual.skips,1);
 assert.equal(manual.root.hidden,false);
});
test('Escape closes only this visit and backdrop blurs home',async()=>{
 const h=setup();h.fire(420);await flush();
 let prevented=false;
 h.root.keydown({key:'Escape',preventDefault(){prevented=true}});
 assert.equal(prevented,true);
 assert.equal(h.root.hidden,true);
 assert.equal(h.local.getItem('forge_whatsnew_dismissed_2026_v1'),null);
 assert.match(css,/backdrop-filter:blur\(18px\)/);
 assert.match(build,/forgeWhatsNewEnter/);
});

test('loaded popup wordmark keeps Kola when other remote fonts time out',async()=>{
 const h=setup({font:'partial'});
 h.fire(420);await flush();
 assert.equal(h.root.hidden,true);
 h.fire(1850);await flush();
 assert.equal(h.root.hidden,false);
 assert.equal(h.root.classList.contains('forge-fallback-kola'),false);
 assert.equal(h.root.classList.contains('forge-fallback-ui'),true);
});
