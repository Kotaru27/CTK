import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const get=p=>fs.readFileSync(p,'utf8');
test('one adaptive desktop sheet ships in source, Pages and standalone',()=>{
 const source=get('src/css/experience/forge-adaptive-desktop.css');
 assert.equal(get('dist/css/forge-adaptive-desktop.css'),source);
 assert.match(get('index.html'),/dist\/css\/forge-adaptive-desktop\.css/);
 assert.match(get('dist/index.html'),/\.\/css\/forge-adaptive-desktop\.css/);
 assert.ok(get('dist/creative-tools-standalone.html').includes('<style id="forge-adaptive-styles">'+source+'</style>'));
 assert.match(get('scripts/build.mjs'),/save\('dist\/css\/forge-adaptive-desktop\.css',forgeAdaptiveCss\)/);
});
test('responsive overrides preserve focus mode and processed media',()=>{
 const css=get('src/css/experience/forge-adaptive-desktop.css');
 assert.match(css,/min-width:1021px/);
 assert.match(css,/max-height:820px/);
 assert.match(css,/min-height:960px/);
 assert.match(css,/\.editor-layout:not\(:has\(#logoDetailOverlay\.active\)\)/);
 for(const property of ['zoom:','scale:','image-rendering:','object-fit:','transform:','animation:','transition:']){
   assert.ok(!css.includes(property),'Layout layer must not override media or motion: '+property);
 }
 assert.ok(!/display:\s*none/.test(css),'Do not hide any tool controls');
});
