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

const routes=[
 ['logo','tool-logo','section-logo'],
 ['pdf','tool-pdf','section-pdf'],
 ['split','tool-split','section-pdf'],
 ['stills','tool-stills','section-stills-boards'],
 ['story','tool-story','section-stills-boards'],
 ['links','tool-links','section-adlinks'],
 ['ads','tool-ads','section-adlinks'],
 ['video','tool-video','section-yt-helper']
];
test('all eight card routes keep their existing HTML and click handlers',()=>{
 const original=[...baseline.matchAll(/<button class="home-card\b[\s\S]*?<\/button>/g)]
   .map(m=>m[0].replaceAll('Logo Workspace','Logo Resizer'));
 const latest=[...index.matchAll(/<button class="home-card\b[\s\S]*?<\/button>/g)]
   .map(m=>m[0]);
 assert.equal(original.length,8);
 assert.deepEqual(latest,original);
});
test('eight workspace title pairs are strictly scoped to their own cards',()=>{
 for(const [key,card,section] of routes){
   assert.ok(css.includes('data-forge-route="'+key+'"'));
   assert.ok(css.includes('.home-card.'+card+' .home-card-title'));
   assert.ok(css.includes('#'+section+'.active .tool-header h2'));
 }
 assert.match(css,/view-transition-name: forge-workspace-title/);
 assert.match(css,/view-transition-name: forge-workspace-art/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/infinite|backdrop-filter|blur\(/);
});
test('all home-to-workspace flows use original openTool/showHome mutations',()=>{
 assert.match(core,/motion\.fromOpen\(id, mode\)/);
 assert.match(core,/motion\.selected\(\)/);
 assert.match(core,/motion\.navigate\(core, route\)/);
 assert.match(core,/motion\.navigate\(core, selectedRoute\)/);
 assert.match(core,/this\._openTool\(id, mode\)/);
 assert.match(core,/this\._showHome\(\)/);
 assert.match(core,/this\.switchViews\(core\)/);
 assert.match(core,/motion\.cancel\(\)/);
});
test('native motion supports last-click-wins and accessibility',()=>{
 assert.match(js,/document\.startViewTransition/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/visibilityState==='visible'/);
 assert.match(js,/active\.skipTransition\(\)/);
 assert.match(js,/if\(token===serial\)change\(\)/);
 assert.match(js,/window\.ForgeWorkspaceRoute=api/);
 assert.match(js,/window\.ForgeVideoRoute=api/);
 assert.doesNotMatch(js,/setTimeout|requestAnimationFrame|pointermove/);
 for(const route of ['pdf','split','stills','story','links','ads','logo','video'])
   assert.match(js,new RegExp("'"+route+"'"));
});
test('modular and standalone shared-route assets stay identical',()=>{
 assert.equal(read('../dist/css/forge-video-route.css'),css);
 assert.equal(read('../dist/js/forge-video-route.js'),js);
 assert.match(index,/\.\/dist\/css\/forge-video-route\.css/);
 assert.match(index,/\.\/dist\/js\/forge-video-route\.js/);
 assert.ok(standalone.includes('<style id="forge-video-route-styles">'+css+'</style>'));
 assert.ok(standalone.includes('<script id="forge-video-route-js">'+js+'</script>'));
});
