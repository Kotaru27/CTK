import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const js=fs.readFileSync(new URL('../src/js/presentation/forge-brand.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/css/experience/forge-brand.css',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');

function setup({font='missing',reduced=false,activeTool=false,suppress=false}={}){
 const timers=[],animations=[];
 const classes=(initial=[])=>{
  const s=new Set(initial);
  return {contains:x=>s.has(x),add:(...x)=>x.forEach(v=>s.add(v)),
   remove:(...x)=>x.forEach(v=>s.delete(v))};
 };
 const intro={hidden:true,removed:false,classList:classes(),remove(){this.removed=true;}};
 const skip={handlers:[],addEventListener(_type,fn){this.handlers.push(fn);},
  click(){for(const fn of this.handlers)fn();}};
 const mark={style:{},getBoundingClientRect:()=>({left:410,top:350,width:550,height:140}),
  animate(frames,options){
   const a={frames,options,cancelled:false,cancel(){this.cancelled=true;},
     finished:Promise.resolve()};
   animations.push(a);return a;
  }};
 const title={getBoundingClientRect:()=>({left:215,top:245,width:450,height:115})};
 const home={classList:classes()};
 const app={classList:classes(activeTool?['active']:[])};
 const body={classList:classes()};
 const document={body,visibilityState:'visible',documentElement:{dataset:{},classList:classes()},
  getElementById:id=>({forgeIntro:intro,forgeIntroWordmark:mark,forgeHeroName:title,
    forgeIntroSkip:skip,'view-home':home,'view-app':app})[id]||null,
  addEventListener(){},removeEventListener(){},dispatchEvent(){}};
 if(font==='loaded')document.fonts={load:()=>Promise.resolve([{status:'loaded'}])};
 if(font==='hang')document.fonts={load:()=>new Promise(()=>{})};
 if(font==='reject')document.fonts={load:()=>Promise.reject(Error('offline'))};
 const context={document,window:{matchMedia:()=>({matches:reduced})},
  sessionStorage:{getItem:()=>suppress?'1':null},
  Event:class{constructor(type){this.type=type;}},
  setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},
  requestAnimationFrame:fn=>fn(),MutationObserver:undefined,Promise,Math};
 vm.runInNewContext(js,context,{filename:'forge-brand.js'});
 return {document,intro,skip,timers,animations,body};
}
const microtasks=async()=>{for(let i=0;i<9;i++)await Promise.resolve();};
test('missing remote Kola retains the full wordmark animation and handoff',async()=>{
 const h=setup();
 await microtasks();
 assert.equal(h.intro.hidden,false);
 assert.equal(h.animations.length,1);
 assert.equal(h.animations[0].options.duration,1590);
 assert.equal(h.document.documentElement.classList.contains('forge-launch-fallback-kola'),true);
 assert.equal(h.intro.classList.contains('forge-intro-fallback-ui'),true);
 assert.match(h.animations[0].frames[0].clipPath,/100/);
 h.timers.at(-1)();await microtasks();
 assert.equal(h.animations.length,2);
 assert.equal(h.animations[1].options.duration,1080);
 assert.equal(h.intro.removed,true);
 assert.equal(h.document.documentElement.dataset.forgeIntroFinished,'1');
});
test('hung font request cannot cancel opening',async()=>{
 const h=setup({font:'hang'});
 assert.equal(h.animations.length,0);
 assert.equal(h.timers.length,2);
 h.timers[1]();await microtasks();
 assert.equal(h.animations.length,1);
 h.skip.click();
 assert.equal(h.intro.removed,true);
 assert.equal(h.body.classList.contains('forge-opening'),false);
});
test('rejected font draws fallback and reduced motion bypasses',async()=>{
 const h=setup({font:'reject'});await microtasks();
 assert.equal(h.animations.length,1);
 const reduced=setup({reduced:true});
 assert.equal(reduced.intro.hidden,true);
 assert.equal(reduced.intro.removed,true);
 assert.equal(reduced.animations.length,0);
});
test('restored tool and explicit test suppression never block workspaces',()=>{
 for(const opts of [{activeTool:true},{suppress:true}]){
  const h=setup(opts);
  assert.equal(h.intro.removed,true);
  assert.equal(h.animations.length,0);
 }
});
test('markup stays hidden if intro JS cannot load, with no opaque box',()=>{
 assert.match(build,/The Forge introduction" hidden/);
 assert.match(css,/\.forge-intro\[hidden\]/);
 assert.match(css,/\.forge-intro-wordmark\{/);
 assert.match(css,/forge-intro-leaving::before/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('successful Kola and interface font loads never force fallback',async()=>{
 const h=setup({font:'loaded'});
 await microtasks();
 assert.equal(h.animations.length,1);
 assert.equal(h.document.documentElement.classList.contains('forge-launch-fallback-kola'),false);
 assert.equal(h.intro.classList.contains('forge-intro-fallback-ui'),false);
});
