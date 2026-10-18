import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const script=read('src/js/presentation/forge-first-paint.js');
const styles=read('src/css/experience/forge-first-paint.css');
const build=read('scripts/build.mjs');

function boot({permanent=false,suppress=false,blockedStorage=false}={}){
 const values=new Set(),timers=[];
 const classList={
  add:x=>values.add(x),remove:(...xs)=>xs.forEach(x=>values.delete(x)),
  contains:x=>values.has(x),toggle(x,on){if(on)values.add(x);else values.delete(x)}
 };
 const root={classList},win={},document={documentElement:root};
 const store={
  getItem(k){if(blockedStorage)throw Error('Storage blocked');
   return k==='forge_whatsnew_dismissed_2026_v3'&&permanent?'1':
    k==='forge_whatsnew_suppress'&&suppress?'1':null;}
 };
 const setTimeout=(fn,ms)=>{const handle={fn,ms,cleared:false};timers.push(handle);return handle};
 const clearTimeout=handle=>{if(handle)handle.cleared=true;};
 vm.runInNewContext(script,{document,window:win,localStorage:store,
  sessionStorage:store,setTimeout,clearTimeout});
 const fire=ms=>{for(const handle of timers.filter(t=>t.ms===ms&&!t.cleared)){
  handle.cleared=true;handle.fn();
 }};
 return {root,gate:win.__forgePaintGate,timers,fire};
}
test('early shield prevents home paint, then releases exactly at ready intro',()=>{
 const b=boot();
 assert.equal(b.root.classList.contains('forge-preflight'),true);
 assert.equal(b.root.classList.contains('forge-welcome-expected'),true);
 b.gate.release();
 assert.equal(b.root.classList.contains('forge-preflight'),false);
 b.gate.beginWelcome();
 assert.equal(b.root.classList.contains('forge-welcome-pending'),true);
 b.gate.endWelcome();
 assert.equal(b.root.classList.contains('forge-welcome-pending'),false);
});
test('confirmed opt-out never shows popup transition overlay',()=>{
 const b=boot({permanent:true});
 assert.equal(b.root.classList.contains('forge-welcome-expected'),false);
 b.gate.beginWelcome();
 assert.equal(b.root.classList.contains('forge-welcome-pending'),false);
});
test('slow network fails open before creating a late intro',()=>{
 const b=boot();
 b.fire(6500);
 assert.equal(b.gate.expired,true);
 assert.equal(b.root.classList.contains('forge-preflight'),false);
 b.gate.beginWelcome();
 assert.equal(b.root.classList.contains('forge-welcome-pending'),false);
});
test('if welcome bundle fails the scrim automatically releases',()=>{
 const b=boot();
 b.gate.release();
 b.gate.beginWelcome();
 assert.equal(b.root.classList.contains('forge-welcome-pending'),true);
 b.fire(2800);
 assert.equal(b.root.classList.contains('forge-welcome-pending'),false);
});
test('restricted storage cannot strand the homepage',()=>{
 const b=boot({blockedStorage:true});
 assert.equal(b.root.classList.contains('forge-preflight'),true);
 b.fire(6500);
 assert.equal(b.root.classList.contains('forge-preflight'),false);
});
test('guard is injected at top of head before all external scripts in both releases',()=>{
 const marker='<style id="forge-first-paint-css">';
 const run='<script id="forge-first-paint-js">';
 for(const page of ['index.html','dist/index.html','dist/creative-tools-standalone.html']){
  const html=read(page);
  const styleAt=html.indexOf(marker),scriptAt=html.indexOf(run);
  const blockingAt=html.indexOf('<script crossorigin=');
  assert.ok(styleAt>=0&&scriptAt>styleAt&&scriptAt<blockingAt,
   page+' first-paint JS is not before the blocking third-party scripts');
  assert.ok(html.includes(script));
  assert.ok(html.includes(styles));
 }
 assert.ok(build.includes('forge-first-paint-css'));
 assert.ok(build.includes('forge-first-paint-js'));
 assert.match(styles,/forge-preflight body/);
 assert.match(styles,/forge-welcome-pending body::after/);
});
