import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('src/css/experience/forge-workflow-interactions.css');
test('Forge keeps a wide viewport-filling responsive launcher',()=>{
  assert.match(source,/NOV 2026 VISUAL COMPOSITION REPAIR/);
  assert.match(source,/max-width:none!important/);
  assert.match(source,/min-height:calc\(100dvh - 66px\)!important/);
  assert.match(source,/grid-template-rows:repeat\(4,minmax\(0,1fr\)\)!important/);
  assert.match(source,/@media\(max-width:580px\)/);
});
test('Header uses legible text and sidebar collapse has explicit high contrast',()=>{
  assert.match(source,/\.header #brandText\{[\s\S]*?font-family:"Plus Jakarta Sans","Segoe UI",Arial,sans-serif!important/);
  assert.match(source,/#mainSidebar\.nav-sidebar\.visible \.nav-toggle\{[\s\S]*?background:#eff5ed!important/);
  assert.match(source,/#mainSidebar\.nav-sidebar\.visible \.nav-toggle \.nav-item-text,[\s\S]*?color:#1d4630!important/);
});
test('Intro stays centered with steps and copy while retaining skip',()=>{
  assert.match(source,/\.forge-intro\.forge-intro-ready #forgeIntroWordmark/);
  assert.match(source,/\.forge-intro\.forge-intro-ready \.forge-intro-steps\{[\s\S]*?left:50%!important/);
  assert.match(source,/\.forge-intro\.forge-intro-ready \.forge-intro-summary\{[\s\S]*?text-align:center!important/);
  assert.match(source,/\.forge-intro\.forge-intro-ready \.forge-intro-skip\{[\s\S]*?color:#f1f7ed!important/);
  assert.match(source,/@media\(prefers-reduced-motion:reduce\)/);
});
test('Built CSS and standalone release exactly contain the same visual rules',()=>{
  assert.equal(read('dist/css/forge-workflow-interactions.css'),source);
  assert.ok(read('dist/creative-tools-standalone.html').includes(
    '<style id="forge-workflow-interactions-styles">'+source+'</style>'));
});
