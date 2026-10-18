import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const js=fs.readFileSync(new URL('../src/js/presentation/forge-whats-new.js',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/css/experience/forge-whats-new.css',import.meta.url),'utf8');
const store=(values={})=>{
 const map=new Map(Object.entries(values));
 return {getItem:key=>map.get(key)||null,setItem:(k,v)=>map.set(k,v),map};
};
function launch({introFinished=false,opening=false,active=false,local=store(),session=store()}={}){
 const timers=[],listeners=new Map();
 const on=(events,type,fn)=>{if(!events.has(type))events.set(type,[]);events.get(type).push(fn);};
 const buttons={};
 let focus=null,skipped=0;
 for(const name of ['forgeWhatsNewTrigger','forgeWhatsNewEnter','forgeWhatsNewNever','forgeWhatsNewClose']){
  const ev=new Map();
  buttons[name]={hidden:false,isConnected:true,addEventListener:(type,fn)=>on(ev,type,fn),
   setAttribute(){},focus(){focus=this;},getClientRects:()=>[{}],
   click(){for(const fn of ev.get('click')||[])fn({target:this});}};
 }
 const dialog={querySelectorAll:()=>Object.values(buttons)};
 const events=new Map();
 const root={hidden:true,querySelector:q=>q==='.forge-whatsnew-dialog'?dialog:buttons[q.slice(1)]||null,
  addEventListener:(type,fn)=>on(events,type,fn),
  keydown(e){for(const fn of events.get('keydown')||[])fn(e);}};
 const home={classList:{contains:()=>false}};
 const app={classList:{contains:x=>x==='active'&&active}};
 const body={classList:{contains:x=>x==='forge-opening'&&opening}};
 const doc={body,visibilityState:'visible',activeElement:null,
  documentElement:{dataset:introFinished?{forgeIntroFinished:'1'}:{}},
  getElementById:id=>id==='forgeWhatsNew'?root:
   id==='view-home'?home:id==='view-app'?app:
   id==='forgeIntroSkip'?{click(){opening=false;skipped++;}}:
   id==='homeContent'?{focus(){}}:buttons[id]||null,
  addEventListener:(type,fn)=>on(listeners,type,fn),
  dispatch(type){for(const fn of listeners.get(type)||[])fn();}};
 const context={document:doc,localStorage:local,sessionStorage:session,
  setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},
  getComputedStyle:()=>({visibility:'visible'})};
 vm.runInNewContext(js,context,{filename:'forge-whats-new.js'});
 return {doc,root,buttons,timers,local,session,get skipped(){return skipped;}};
}
test('welcome opens automatically after completed intro, never before',()=>{
 const h=launch();
 assert.equal(h.root.hidden,true);
 assert.equal(h.timers.length,0);
 h.doc.documentElement.dataset.forgeIntroFinished='1';
 h.doc.dispatch('forge:intro-complete');
 assert.equal(h.timers.length,1);
 assert.equal(h.root.hidden,true);
 h.timers[0]();
 assert.equal(h.root.hidden,false);
 h.buttons.forgeWhatsNewEnter.click();
 assert.equal(h.root.hidden,true);
 assert.equal(h.local.getItem('forge_whatsnew_seen_launch_2026_v2'),'1');
});
test('seen welcome does not automatically reopen on reload, but manual link works',()=>{
 const local=store({'forge_whatsnew_seen_launch_2026_v2':'1'});
 const h=launch({introFinished:true,local});
 assert.equal(h.timers.length,0);
 h.buttons.forgeWhatsNewTrigger.click();
 assert.equal(h.root.hidden,false);
 h.buttons.forgeWhatsNewClose.click();
 assert.equal(h.root.hidden,true);
});
test('saved do not show again never hides manual What’s New trigger',()=>{
 const local=store();
 const h=launch({introFinished:true,local});
 h.timers[0]();
 h.buttons.forgeWhatsNewNever.click();
 assert.equal(local.getItem('forge_whatsnew_dismissed_2026_v1'),'1');
 assert.equal(h.buttons.forgeWhatsNewTrigger.hidden,false);
 const next=launch({introFinished:true,local});
 assert.equal(next.timers.length,0);
 next.buttons.forgeWhatsNewTrigger.click();
 assert.equal(next.root.hidden,false);
});
test('restored workspace cannot be covered by a first-launch popup',()=>{
 const h=launch({introFinished:true,active:true});
 h.timers[0]();
 assert.equal(h.root.hidden,true);
});
test('an intentional click during intro cancels it and opens the popup',()=>{
 const h=launch({opening:true});
 h.buttons.forgeWhatsNewTrigger.click();
 assert.equal(h.skipped,1);
 assert.equal(h.root.hidden,false);
});
test('Escape closes the announcement and the content is in both releases',()=>{
 const h=launch({introFinished:true});
 h.timers[0]();
 let prevented=false;
 h.root.keydown({key:'Escape',preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
 assert.equal(h.root.hidden,true);
 for(const word of ['forgeWhatsNew','forgeWhatsNewEnter',
  'Creative Tool Kit has a new name','<h3>Video Stills</h3>',
  '<h3>Storyboard</h3>','<h3>Ad Downloader · Downloads</h3>'])
  assert.ok(build.includes(word),'Welcome build missing '+word);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
