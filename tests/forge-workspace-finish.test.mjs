import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('workspace finishing CSS is identical in all release formats',()=>{
 const css=read('src/css/experience/forge-workspace-finish.css');
 assert.equal(read('dist/css/forge-workspace-finish.css'),css);
 assert.match(read('index.html'),/dist\/css\/forge-workspace-finish\.css/);
 assert.match(read('dist/index.html'),/\.\/css\/forge-workspace-finish\.css/);
 assert.ok(read('dist/creative-tools-standalone.html').includes('<style id="forge-workspace-finish-styles">'+css+'</style>'));
 assert.match(read('scripts/build.mjs'),/save\('dist\/css\/forge-workspace-finish\.css',forgeWorkspaceFinishCss\)/);
});
test('finish layer is CSS-only and limits changes to specific workspaces',()=>{
 const css=read('src/css/experience/forge-workspace-finish.css');
 for(const s of ['#storyPreview:has(canvas)','.adgen-output-card textarea','#ytMetadataContent','.logo-card-item','#pdfStacksContainer'])assert.ok(css.includes(s),s);
 assert.match(css,/#section-logo #logoGrid > \.logo-card-item/);
 assert.match(css,/animation:none!important/);
 for(const s of ['@keyframes','backdrop-filter:','filter:blur','transform:scale','object-fit:','image-rendering:','display:none!important'])assert.ok(!css.includes(s),'undesired heavy media/motion override '+s);
});
test('precision-polish is focus-visible and compact without layout overrides',()=>{
 const css=read('src/css/experience/forge-workspace-finish.css');
 const polish=css.split('/* 06 / Precision pass')[1];
 assert.ok(polish,'precision section missing');
 for(const s of ['.nav-sidebar .nav-item:focus-visible','#storyFileList > div:focus-within',
  '#storyProjectTabs > div:focus-within','#adDlTableContainer th',
  'input[type="checkbox"]:checked',':focus-visible','prefers-reduced-motion:reduce']){
  assert.ok(polish.includes(s),'missing '+s);
 }
 for(const s of ['grid-template-columns:','grid-template-rows:','position:fixed',
   'min-height:','max-height:','object-fit:','transform:','display:none','padding-inline:']){
  assert.ok(!polish.includes(s),'workspace-changing rule in precision layer: '+s);
 }
});
