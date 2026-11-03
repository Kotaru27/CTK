import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/css/experience/forge-workbench-v2.css');
const release=read('dist/creative-tools-standalone.html');
test('Featured Logo Resizer retains dark readable foreground on hover and focus',()=>{
  assert.match(css,/INTERACTION QUALITY PASS/);
  assert.match(css,/\.home-card:nth-child\(1\):is\(:hover,:focus-visible\)\{[\s\S]*?background:#153d2b!important/);
  assert.match(css,/\.home-card:nth-child\(1\):is\(:hover,:focus-visible\) :is\(\.home-card-title,\.home-card-go\)\{[\s\S]*?color:#f8fcf5!important/);
  assert.match(css,/\.home-card:nth-child\(1\):is\(:hover,:focus-visible\) \.home-card-desc\{[\s\S]*?color:#d4ebd8!important/);
  assert.match(css,/\.home-card:nth-child\(1\):focus-visible\{[\s\S]*?outline-color:#adddb8!important/);
});
test('Eight cards provide deliberate semantic hover backgrounds and ink',()=>{
  assert.match(css,/\.home-card:nth-child\(2\):is\(:hover,:focus-visible\)\{[\s\S]*?background:#cce2d2!important/);
  assert.match(css,/\.home-card:nth-child\(n\+3\):is\(:hover,:focus-visible\)\{[\s\S]*?background:#e9f3e9!important/);
  assert.match(css,/\.home-card:nth-child\(n\):is\(:hover,:focus-visible\)\{[\s\S]*?transform:none!important/);
  assert.match(css,/\.home-card:nth-child\(n\):focus-visible\{[\s\S]*?outline:3px solid/);
});
test('Workspace controls, tabs, danger actions and navigation retain appropriate meaning',()=>{
  assert.match(css,/\.liquid-btn\.danger-btn:not\(:disabled\):is\(:hover,:focus-visible\)\{[\s\S]*?color:#8c332c!important/);
  assert.match(css,/\.liquid-btn\.active-mode:not\(\.danger-btn\)/);
  assert.match(css,/button\[role="tab"\]\.active-mode:is\(:hover,:focus-visible\)/);
  assert.match(css,/#mainSidebar\.nav-sidebar\.visible \.nav-item\.active/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('Release stylesheet and standalone CSS are synchronized',()=>{
  assert.equal(read('dist/css/forge-workbench-v2.css'),css);
  assert.ok(release.includes('<style id="forge-workbench-v2-styles">'+css+'</style>'));
});
