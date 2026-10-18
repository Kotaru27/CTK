import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const text=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const previous=globalThis.document;
globalThis.document={getElementById:()=>null};
const [{default:{Story}}]=await Promise.all([import('../src/js/tools/storyboard.js')]);
globalThis.document=previous;

test('fresh boards default to three columns from third still, but not earlier',()=>{
  const columns={value:'0'};
  const documentBefore=globalThis.document;
  globalThis.document={getElementById:id=>id==='storyCols'?columns:null};
  try{
    const board=Object.assign(Object.create(Story),{projects:[],active:null});
    const first=board.makeProject('AD1');
    board.active=first;
    first.images.push({},{});
    assert.equal(board.applyDefaultColumns(first),false);
    assert.equal(first.settings.cols,0);
    first.images.push({});
    assert.equal(board.applyDefaultColumns(first),true);
    assert.equal(first.settings.cols,3);
    assert.equal(columns.value,'3');
    first.images.push({});
    assert.equal(board.applyDefaultColumns(first),false);
    assert.equal(first.settings.cols,3);
    const manual=board.makeProject('AD2');
    manual.images.push({},{},{});
    manual.settings.cols=2;
    assert.equal(board.applyDefaultColumns(manual),false);
    assert.equal(manual.settings.cols,2);
    const explicitAuto=board.makeProject('AD3');
    explicitAuto.defaultColumnsPending=false;
    explicitAuto.images.push({},{},{});
    assert.equal(board.applyDefaultColumns(explicitAuto),false);
    assert.equal(explicitAuto.settings.cols,0);
  }finally{globalThis.document=documentBefore;}
});

test('both folder import and bulk Stills transfer apply the default without changing exports',()=>{
  const story=text('../src/js/tools/storyboard.js');
  const stills=text('../src/js/tools/video-stills.js');
  assert.match(story,/this\.applyDefaultColumns\(project\)/);
  assert.match(stills,/story\.applyDefaultColumns\?\.\(target\)/);
  assert.match(story,/if \(id === "storyCols" && this\.active\) this\.active\.defaultColumnsPending = false/);
});

test('Stills card filename is full-width, wrapping, and accessible without a new layout',()=>{
  const stills=text('../src/js/tools/video-stills.js');
  const css=text('../src/css/experience/forge-workflow-interactions.css');
  assert.match(stills,/stack\.querySelector\("\.stack-title"\)\.title = name/);
  assert.match(css,/#stillsTabContentVideo #stillsStacksContainer \.pdf-stack-wrapper \.stack-title\{/);
  assert.match(css,/white-space:normal!important/);
  assert.match(css,/overflow-wrap:anywhere!important/);
  assert.match(css,/max-height:none!important/);
});

test('route motion keeps its outgoing frame opaque, and hover icons do not jump',()=>{
  const css=text('../src/css/experience/forge-video-route.css');
  const controls=text('../src/css/experience/forge-workflow-interactions.css');
  assert.match(css,/forge-enter-tool 450ms cubic-bezier\(\.18,\.78,\.22,1\)/);
  assert.match(css,/::view-transition-old\(forge-tool-surface\)\{\s*animation:none!important;opacity:1!important;/);
  assert.match(controls,/\.nav-sidebar\.visible \.nav-item:hover :is\(svg,\.material-symbols-rounded\)/);
  assert.match(controls,/translate:none!important/);
  assert.match(controls,/@media\(prefers-reduced-motion:reduce\)/);
});
