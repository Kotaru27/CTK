import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/css/experience/forge-tool-specimens.css');
const tools=['logo','pdf','split','stills','story','links','ads','video'];

test('all eight existing creative tools receive real task-specific specimen treatments',()=>{
 for(const name of tools){
  assert.ok(css.includes('.tool-'+name+' '),'missing '+name+' visual');
 }
 for(const marker of ['.mark-front','.pdf-export','.split-picture','.stills-reel',
  '.story-sheet','.link-string','.ad-sheet','.video-command']){
  assert.ok(css.includes(marker),'missing output representation '+marker);
 }
});

test('specimens do not alter application workflows or navigation markup',()=>{
 for(const banned of ['#view-app','.tool-section','.editor-layout','.sidebar-panel',
   'pointer-events:auto','@keyframes','display:none!important','grid-template-columns']){
  assert.ok(!css.includes(banned),'unwanted behavior/layout selector '+banned);
 }
 const cards=s=>[...s.matchAll(/<button class="home-card\b[\s\S]*?<\/button>/g)].map(m=>m[0]);
 const normalize=s=>s.replaceAll('aria-label="Open Logo Resizer"','aria-label="Open Logo Workspace"')
   .replaceAll('<h2 class="home-card-title">Logo Resizer</h2>','<h2 class="home-card-title">Logo Workspace</h2>')
   .replaceAll('aria-label="Open Video Compressor"','aria-label="Open Video Downloads"')
   .replaceAll('<h2 class="home-card-title">Video Compressor</h2>','<h2 class="home-card-title">Video Downloads</h2>')
   .replaceAll('<p class="home-card-desc">Compress videos to a chosen size.</p>','<p class="home-card-desc">Create video download commands.</p>')
   .replaceAll('<div class="video-command"><span>›</span><b>compress</b>','<div class="video-command"><span>›</span><b>download</b>');
 assert.deepEqual(cards(read('index.html')).map(normalize),cards(read('source/baseline.html')));
});

test('specimen artwork stylesheet is byte-identical across all three releases',()=>{
 assert.equal(read('dist/css/forge-tool-specimens.css'),css);
 assert.match(read('index.html'),/href="\.\/dist\/css\/forge-tool-specimens\.css"/);
 assert.match(read('dist/index.html'),/href="\.\/css\/forge-tool-specimens\.css"/);
 assert.ok(read('dist/creative-tools-standalone.html').includes('<style id="forge-tool-specimens-styles">'+css+'</style>'));
 assert.ok(read('scripts/build.mjs').includes("save('dist/css/forge-tool-specimens.css',forgeSpecimensCss)"));
});

test('art direction retains accessible keyboard feedback and reduced motion',()=>{
 assert.match(css,/\.home-card:focus-visible/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(min-width:1181px\)/);
 assert.match(css,/\.tool-stills \.stills-reel/);
 assert.match(css,/\.tool-ads \.ad-sheet/);
 assert.match(css,/\.tool-video \.video-command/);
});
