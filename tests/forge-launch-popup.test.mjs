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
function launch({introFinished=true,toolActive=false,opening=false,local=store(),session=store()}={}){
 let introOpening=opening, skipped=0;
 const listeners=new Map();
 const on=(map,type,cb)=>{if(!map.has(type))map.set(type,[]);map.get(type).push(cb);};
 let active=null;
 const makeButton=id=>{
  const events=new Map();
  return {id,isConnected:true,
    addEventListener:(type,callback)=>on(events,type,callback),
    click(){for(const fn of events.get('click')||[])fn({target:this});},
    focus(){active=this;},setAttribute(){},getClientRects(){return [{}];}
  };
 };
 const buttons={
  '#forgeWhatsNewTrigger':makeButton('trigger'),
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
    id==='forgeWhatsNewTrigger'?buttons['#forgeWhatsNewTrigger']:
    id==='forgeIntroSkip'?{click(){skipped++;introOpening=false;}}:
    id==='view-home'?{classList:{contains:()=>false}}:
    id==='view-app'?{classList:{contains:()=>toolActive}}:
    id==='homeContent'?{focus(){}}:null,
  body:{classList:{contains:name=>name==='forge-opening'&&introOpening}},
  activeElement:null,
  addEventListener:(type,fn)=>on(listeners,type,fn),
  dispatch(type){for(const fn of listeners.get(type)||[])fn();}
 };
 const context={document:doc,localStorage:local,sessionStorage:session,
  requestAnimationFrame:fn=>fn(),getComputedStyle:()=>({visibility:'visible'})};
 vm.runInNewContext(code,context,{filename:'forge-whats-new.js'});
 return {root,buttons,doc,local,session,get skipped(){return skipped;}};
}
test('release notes stay closed until clicked and may be reopened',()=>{
 const h=launch();
 assert.equal(h.root.hidden,true);
 h.buttons['#forgeWhatsNewTrigger'].click();
 assert.equal(h.root.hidden,false);
 h.buttons['#forgeWhatsNewEnter'].click();
 assert.equal(h.root.hidden,true);
 h.buttons['#forgeWhatsNewTrigger'].click();
 assert.equal(h.root.hidden,false);
});
test('saved automatic opt-out never hides manually invoked updates',()=>{
 const local=store();
 const h=launch({local});
 assert.equal(h.root.hidden,true);
 h.buttons['#forgeWhatsNewTrigger'].click();
 assert.equal(h.root.hidden,false);
 h.buttons['#forgeWhatsNewNever'].click();
 assert.equal(local.getItem('forge_whatsnew_dismissed_2026_v1'),'1');
 assert.equal(h.root.hidden,true);
 assert.equal(h.buttons['#forgeWhatsNewTrigger'].hidden,false);
 h.buttons['#forgeWhatsNewTrigger'].click();
 assert.equal(h.root.hidden,false);
 h.buttons['#forgeWhatsNewClose'].click();
 const next=launch({local,session:store()});
 assert.equal(next.root.hidden,true);
 assert.equal(next.buttons['#forgeWhatsNewTrigger'].hidden,false);
 next.buttons['#forgeWhatsNewTrigger'].click();
 assert.equal(next.root.hidden,false);
});
test('intro completion never opens notes and restored workspace stays uninterrupted',()=>{
 const pending=launch({introFinished:false});
 assert.equal(pending.root.hidden,true);
 pending.doc.documentElement.dataset.forgeIntroFinished='1';
 pending.doc.dispatch('forge:intro-complete');
 assert.equal(pending.root.hidden,true);
 const active=launch({toolActive:true});
 active.buttons['#forgeWhatsNewTrigger'].click();
 assert.equal(active.root.hidden,true);
});
test('keyboard Escape closes user-opened notes',()=>{
 const h=launch();
 h.buttons['#forgeWhatsNewTrigger'].click();
 assert.equal(h.root.hidden,false);
 let prevented=false;
 h.root.keydown({key:'Tab',shiftKey:false,preventDefault(){prevented=true;}});
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

test('clicking What’s new during the intro finishes intro and opens popup',()=>{
 const h=launch({opening:true});
 h.buttons['#forgeWhatsNewTrigger'].click();
 assert.equal(h.skipped,1);
 assert.equal(h.root.hidden,false);
});
