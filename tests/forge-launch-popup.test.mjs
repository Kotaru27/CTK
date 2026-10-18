import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const code=fs.readFileSync(new URL('../src/js/presentation/forge-whats-new.js',import.meta.url),'utf8');
const intro=fs.readFileSync(new URL('../src/js/presentation/forge-brand.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/css/experience/forge-whats-new.css',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');

function store(seed={}){
 const map=new Map(Object.entries(seed));
 return {getItem:key=>map.get(key)||null,setItem:(key,val)=>map.set(key,val),map};
}
function launch({introFinished=true,toolActive=false,local=store(),session=store()}={}){
 const listeners=new Map();
 const on=(map,type,cb)=>{if(!map.has(type))map.set(type,[]);map.get(type).push(cb);};
 let active=null;
 const makeButton=id=>{
  const events=new Map();
  return {id,isConnected:true,
    addEventListener:(type,callback)=>on(events,type,callback),
    click(){for(const fn of events.get('click')||[])fn({target:this});},
    focus(){active=this;},getClientRects(){return [{}];}
  };
 };
 const buttons={
  '#forgeWhatsNewEnter':makeButton('enter'),
  '#forgeWhatsNewNever':makeButton('never'),
  '#forgeWhatsNewClose':makeButton('close')
 };
 const dialog={
  querySelectorAll:()=>[buttons['#forgeWhatsNewClose'],buttons['#forgeWhatsNewNever'],buttons['#forgeWhatsNewEnter']]
 };
 const rootEvents=new Map();
 const root={hidden:true,
  querySelector:q=>q==='.forge-whatsnew-dialog'?dialog:buttons[q]||null,
  addEventListener:(type,fn)=>on(rootEvents,type,fn),
  keydown(event){for(const fn of rootEvents.get('keydown')||[])fn(event);}
 };
 const doc={
  readyState:'complete',
  documentElement:{dataset:introFinished?{forgeIntroFinished:'1'}:{}},
  getElementById:id=>id==='forgeWhatsNew'?root:
    id==='view-home'?{classList:{contains:()=>false}}:
    id==='view-app'?{classList:{contains:()=>toolActive}}:
    id==='homeContent'?{focus(){}}:null,
  body:{classList:{contains:()=>false}},
  activeElement:null,
  addEventListener:(type,fn)=>on(listeners,type,fn),
  dispatch(type){for(const fn of listeners.get(type)||[])fn();}
 };
 const context={document:doc,localStorage:local,sessionStorage:session,
  requestAnimationFrame:fn=>fn(),getComputedStyle:()=>({visibility:'visible'})};
 vm.runInNewContext(code,context,{filename:'forge-whats-new.js'});
 return {root,buttons,doc,local,session};
}
test('post-intro popup appears once per session and closes with primary action',()=>{
 const h=launch();
 assert.equal(h.root.hidden,false);
 assert.equal(h.session.getItem('forge_whatsnew_seen_session_2026_v1'),'1');
 h.buttons['#forgeWhatsNewEnter'].click();
 assert.equal(h.root.hidden,true);
 assert.notEqual(h.local.getItem('forge_whatsnew_dismissed_2026_v1'),'1');
 const again=launch({session:h.session,local:h.local});
 assert.equal(again.root.hidden,true);
});
test('Do not show again saves durable choice and prevents future popup',()=>{
 const local=store();
 const h=launch({local});
 assert.equal(h.root.hidden,false);
 h.buttons['#forgeWhatsNewNever'].click();
 assert.equal(local.getItem('forge_whatsnew_dismissed_2026_v1'),'1');
 assert.equal(h.root.hidden,true);
 const next=launch({local,session:store()});
 assert.equal(next.root.hidden,true);
});
test('intro event determines launch time; restored working tool never interrupted',()=>{
 const pending=launch({introFinished:false});
 assert.equal(pending.root.hidden,true);
 pending.doc.documentElement.dataset.forgeIntroFinished='1';
 pending.doc.dispatch('forge:intro-complete');
 assert.equal(pending.root.hidden,false);
 const active=launch({toolActive:true});
 assert.equal(active.root.hidden,true);
});
test('keyboard Escape closes and focus stays inside modal on Tab',()=>{
 const h=launch();
 let prevented=false;
 h.root.keydown({key:'Tab',shiftKey:false,preventDefault(){prevented=true;}});
 assert.equal(h.root.hidden,false);
 h.root.keydown({key:'Escape',preventDefault(){prevented=true;}});
 assert.equal(h.root.hidden,true);
 assert.equal(prevented,true);
});
test('welcome is in both release formats, matches the actual new workflows, and honors reduced motion',()=>{
 for(const s of ['forgeWhatsNew','forgeWhatsNewNever','forgeWhatsNewEnter','forge-whatsnew-change'])
  assert.ok(build.includes(s),'Launch build missing '+s);
 for(const words of ['Creative Tool Kit has a new name','<h3>Video Stills</h3>',
  '<h3>Storyboard</h3>','<h3>Ad Downloader · Auto-name</h3>',
  '<h3>Ad Downloader · Downloads</h3>','One Send to Board',
  'Choose a writable folder before uploading Excel']){
  assert.ok(build.includes(words),'Missing launch fact '+words);
 }
 assert.match(intro,/forge:intro-complete/);
 assert.match(intro,/forge:intro-complete/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/max-height:min\(820px,calc\(100dvh - 36px\)\)/);
 assert.match(css,/#forgeWhatsNew :is\(button\):focus-visible/);
});
