import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/css/experience/forge-unified-workspaces.css');

test('unified workspace CSS is identical in modular Pages and standalone releases',()=>{
 assert.equal(read('dist/css/forge-unified-workspaces.css'),css);
 assert.ok(read('index.html').includes('href="./dist/css/forge-unified-workspaces.css"'));
 assert.ok(read('dist/index.html').includes('href="./css/forge-unified-workspaces.css"'));
 assert.ok(read('dist/creative-tools-standalone.html').includes('<style id="forge-unified-workspaces-styles">'+css+'</style>'));
 assert.ok(read('scripts/build.mjs').includes("save('dist/css/forge-unified-workspaces.css',forgeUnifiedCss)"));
});

test('unified design targets all eight working tool modes and supporting dialogs',()=>{
 for(const sel of ['#section-logo','#section-pdf','#stillsTabContentVideo','#stillsTabContentStory',
   '#section-stills-boards','#section-adlinks','#adlinksTabContentGen','#adlinksTabContentDownloader',
   '#section-yt-helper','.confirm-dialog','.presets-dialog','.undo-toast']){
  assert.ok(css.includes(sel),'missing '+sel);
 }
 for(const state of [':focus-visible',':hover',':disabled',':active','prefers-reduced-motion:reduce']){
  assert.ok(css.includes(state),'missing '+state);
 }
});

test('polish touches only presentation, never process or export code',()=>{
 // The compact Storyboard list is allowed to use a two-column *row*,
 // cover-cropped 36px thumbnails and 28px button hit areas. Tool workspaces,
 // previews, canvases and other interfaces remain excluded from changes.
 const allowedSmallComponents=[
  /#view-app :is\(#stillsTabContentStory,#stillsTabContentFilmstrip\) :is\(#storyFileList,#filmstripFileList\) > \.story-asset-row\{[^}]+\}/g,
  /#view-app :is\(#stillsTabContentStory,#stillsTabContentFilmstrip\) \.story-asset-thumb\{[^}]+\}/g,
  /#view-app #stillsTabContentStory #storyProjectTabs \.story-project-delete\{[^}]+\}/g,
  /#view-app :is\(#stillsTabContentStory,#stillsTabContentFilmstrip\) \.story-asset-action\.liquid-btn\{[^}]+\}/g
 ];
 const layoutSafeCss=allowedSmallComponents.reduce((s,re)=>s.replace(re,''),css);
 assert.match(css, /\.story-asset-row\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
 for(const banned of ['#pdfStacksContainer {','grid-template-columns:','grid-template-rows:',
   'object-fit:','canvas {','position:fixed','position:absolute','min-height:',
   'max-height:','width:420px','display:none!important','@keyframes',
   'pointer-events:none!important','transform:scale','filter:blur']){
  assert.ok(!layoutSafeCss.includes(banned),'layout/processing override: '+banned);
 }
 const cards=s=>[...s.matchAll(/<button class="home-card\b[\s\S]*?<\/button>/g)].map(v=>v[0]);
 const normalize=s=>s.replaceAll('aria-label="Open Logo Resizer"','aria-label="Open Logo Workspace"')
  .replaceAll('<h2 class="home-card-title">Logo Resizer</h2>','<h2 class="home-card-title">Logo Workspace</h2>');
 assert.deepEqual(cards(read('index.html')).map(normalize),cards(read('source/baseline.html')));
});

test('visible primary states remain distinct; generated media does not receive blur animations',()=>{
 assert.match(css,/\.liquid-btn:not\(\.active-mode\):not\(\.danger-btn\)/);
 assert.match(css,/\.copy-cmd-btn:hover/);
 assert.match(css,/input\[type="number"\]/);
 assert.match(css,/#logoDetailOverlay/);
 assert.doesNotMatch(css,/backdrop-filter:|blur\(/);
});
test('Storyboard, Filmstrip and Fit distinguish import from export once content exists',()=>{
 for(const s of ['#storyFileList > div','#filmstripFileList > div',
   '#fitExportPngBtn:not(:disabled)','#storyDropZone label.liquid-btn.active-mode',
   '#filmstripDropZone label.liquid-btn.active-mode']){
  assert.ok(css.includes(s),'missing contextual priority '+s);
 }
});
