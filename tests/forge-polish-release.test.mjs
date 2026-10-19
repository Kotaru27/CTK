import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const intro=read('src/js/presentation/forge-brand.js');
const brand=read('src/css/experience/forge-brand.css');
const welcome=read('src/css/experience/forge-whats-new.css');
const feedback=read('src/css/experience/forge-workflow-interactions.css');
const welcomeJS=read('src/js/presentation/forge-whats-new.js');
const index=read('index.html');
const distIndex=read('dist/index.html');
const standalone=read('dist/creative-tools-standalone.html');

const inline=(type,id)=>{
  const start='<'+type+' id="'+id+'">';
  const end='</'+type+'>';
  const i=standalone.indexOf(start);
  assert.notEqual(i,-1,'Missing standalone asset: '+id);
  const j=standalone.indexOf(end,i+start.length);
  assert.ok(j>i,'Malformed standalone asset: '+id);
  return standalone.slice(i+start.length,j);
};

test('Forge source, modular outputs and standalone release stay aligned',()=>{
  for(const [path,styleId] of [
    ['forge-brand.css','forge-brand-styles'],
    ['forge-whats-new.css','forge-whats-new-styles'],
    ['forge-workflow-interactions.css','forge-workflow-interactions-styles'],
  ]){
    const original=read('src/css/experience/'+path);
    assert.equal(read('dist/css/'+path),original);
    assert.equal(inline('style',styleId),original);
  }
  assert.equal(read('dist/js/forge-brand.js'),intro);
  assert.equal(inline('script','forge-brand-intro-js'),intro);
  assert.equal(distIndex,index.replaceAll('./dist/css/','./css/').replaceAll('./dist/js/','./js/'));
});

test('Intro handoff has one calibrated, stable exit with a protected welcome backdrop',()=>{
  assert.match(intro,/schedule\(finish,380\)/);
  assert.match(brand,/transition:opacity 380ms cubic-bezier\(/);
  assert.match(intro,/body\.classList\.add\('forge-home-arriving','forge-handoff'\)/);
  assert.match(brand,/html\.forge-welcome-pending body\.forge-opening::after/);
  assert.doesNotMatch(brand,/FORGE \/ TYPEWRITER V5|FORGE \/ INTACT WORD ENTRANCE/);
  assert.equal((brand.match(/@keyframes forge-typing-caret/g)||[]).length,1);
  assert.match(brand,/prefers-reduced-motion:reduce/);
});

test('Welcome stays intentional and fits in a compact, scrollable panel',()=>{
  assert.match(welcome,/width:min\(920px,100%\)/);
  assert.match(welcome,/min-height:0;/);
  assert.match(welcome,/\.forge-whatsnew-changes\{[\s\S]*?overflow-y:auto;/);
  assert.match(welcomeJS,/never\.addEventListener\('click',\(\)=>dismiss\(true\)\)/);
  assert.match(welcomeJS,/continueBtn\.addEventListener\('click',\(\)=>dismiss\(false\)\)/);
  assert.match(welcomeJS,/safeSet\(permanentKey\)/);
});

test('Tool navigation, focus and generated launch links remain intact',()=>{
  assert.equal((index.match(/<button class="home-card /g)||[]).length,8);
  assert.match(feedback,/@media\(hover:hover\) and \(pointer:fine\)/);
  assert.match(feedback,/:focus-visible/);
  assert.match(feedback,/prefers-reduced-motion:reduce/);
  assert.ok(index.includes('forge-launch-20261019-usability-v9'));
  assert.ok(!index.includes('forge-launch-20261018-kinetic-v8'));
});

test('Operational typography and navigation are readable without layout changes',()=>{
  const ui=read('src/css/experience/forge-unified-workspaces.css');
  const workflow=read('src/css/experience/forge-workflow-interactions.css');
  assert.match(ui,/font-size:14px!important/);
  assert.match(ui,/#alg-out-ads/);
  assert.match(workflow,/#mainSidebar\.nav-sidebar\.visible\.collapsed/);
  assert.match(workflow,/content:attr\(title\)/);
  assert.match(workflow,/prefers-reduced-motion:reduce/);
  assert.match(index,/01 \/ DESTINATION/);
  assert.match(index,/02 \/ INPUT/);
  assert.match(standalone,/01 \/ DESTINATION/);
  assert.match(standalone,/02 \/ INPUT/);
});

test('sidebar uses immediate geometry, short feedback and no expensive blur',()=>{
  assert.match(feedback,/#mainSidebar\.nav-sidebar\.visible\s*\{[^}]*transition:none!important;/);
  assert.match(feedback,/#mainSidebar\.nav-sidebar\.visible\s*\{[^}]*animation:none!important;/);
  assert.match(feedback,/#mainSidebar\.nav-sidebar\.visible\s*\{[^}]*backdrop-filter:none!important;/);
  assert.match(feedback,/#mainSidebar\.nav-sidebar\.visible \.nav-item-text\s*\{[^}]*transition-property:opacity!important;/);
  assert.match(feedback,/#mainSidebar\.nav-sidebar\.visible \.nav-item:not\(\.nav-toggle\)\s*\{[^}]*transition-duration:105ms!important;/);
  assert.match(feedback,/content:attr\(title\)/);
  assert.match(feedback,/prefers-reduced-motion:reduce/);
  assert.match(read('scripts/forge-browser-qa.mjs'),/Sidebar latency guard/);
  assert.equal((index.match(/<button class="home-card /g)||[]).length,8);
  assert.ok(index.includes('forge-workflow-interactions.css?v=forge-sidebar-20261019-v10'));
  assert.equal(distIndex,index.replaceAll('./dist/css/','./css/').replaceAll('./dist/js/','./js/'));
});

test('V11 cross-tool navigation shows the new workspace immediately without changing shell or home motion',()=>{
 const route=read('src/css/experience/forge-video-route.css');
 assert.match(route,/animation:forge-enter-tool 330ms/);
 assert.ok(route.includes('0%{opacity:.62;transform:translate3d(0,6px,0)}'));
 assert.match(route,/animation:forge-open-workspace 520ms/);
 assert.match(route,/prefers-reduced-motion:reduce/);
 assert.equal(read('dist/css/forge-video-route.css'),route);
 assert.ok(index.includes('forge-video-route.css?v=forge-tool-nav-20261019-v11'));
 assert.ok(standalone.includes('<style id="forge-video-route-styles">'+route+'</style>'));
});
