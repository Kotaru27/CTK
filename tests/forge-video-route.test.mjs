import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const js=read('../src/js/presentation/forge-video-route.js');
const css=read('../src/css/experience/forge-video-route.css');
const core=read('../src/js/core/prelude.js');
const standalone=read('../dist/creative-tools-standalone.html');
const index=read('../index.html');
const baseline=read('../source/baseline.html');

test('shared route motion is only wired for the Video Stills tool, preserving other route dispatches',()=>{
  assert.match(core,/id === "section-stills-boards" && mode === "video"/);
  assert.match(core,/videoSelected && window\.ForgeVideoRoute/);
  assert.match(core,/this\.switchViews\(core\)/);
  assert.match(core,/this\._openTool\(id, mode\)/);
  assert.match(core,/this\._showHome\(\)/);
  const original=[...baseline.matchAll(/<button class="home-card\b[\s\S]*?<\/button>/g)]
    .map(m=>m[0].replaceAll('Logo Workspace','Logo Resizer'));
  const latest=[...index.matchAll(/<button class="home-card\b[\s\S]*?<\/button>/g)]
    .map(m=>m[0]);
  assert.equal(original.length,8);
  assert.deepEqual(latest,original);
});

test('route animation is native, interruptible, and respects system motion',()=>{
  assert.match(js,/document\.startViewTransition/);
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(js,/visibilityState==='visible'/);
  assert.match(js,/active\.skipTransition\(\)/);
  assert.match(js,/if\(token===serial\)change\(\)/);
  assert.doesNotMatch(js,/setTimeout|requestAnimationFrame|addEventListener\('pointermove'/);
  assert.match(css,/view-transition-name: forge-stills-title/);
  assert.match(css,/view-transition-name: forge-stills-visual/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/infinite|backdrop-filter|blur\(/);
});

test('standalone and GitHub Pages receive identical scoped assets',()=>{
  assert.equal(read('../dist/css/forge-video-route.css'),css);
  assert.equal(read('../dist/js/forge-video-route.js'),js);
  assert.match(index,/\.\/dist\/css\/forge-video-route\.css/);
  assert.match(index,/\.\/dist\/js\/forge-video-route\.js/);
  assert.ok(standalone.includes('<style id="forge-video-route-styles">'+css+'</style>'));
  assert.ok(standalone.includes('<script id="forge-video-route-js">'+js+'</script>'));
  assert.doesNotMatch(css,/#section-stills-boards\s*\{|\.tool-stills\s*\{/);
});
