import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index=read('index.html'),dist=read('dist/index.html');
const standalone=read('dist/creative-tools-standalone.html');
const css=read('src/css/experience/forge-workbench-v2.css');
const js=read('src/js/presentation/forge-workbench-v2.js');
const build=read('scripts/build.mjs');

test('Forge V2 ships identical CSS and JS across main, dist and standalone',()=>{
  assert.equal(read('dist/css/forge-workbench-v2.css'),css);
  assert.equal(read('dist/js/forge-workbench-v2.js'),js);
  assert.ok(standalone.includes('<style id="forge-workbench-v2-styles">'+css+'</style>'));
  assert.ok(standalone.includes('<script id="forge-workbench-v2-js">'+js+'</script>'));
  assert.equal(dist,index.replaceAll('./dist/css/','./css/').replaceAll('./dist/js/','./js/'));
  assert.match(index,/forge-workbench-v2\.css\?v=forge-original-workbench-v2-20261103/);
  assert.match(index,/forge-workbench-v2\.js\?v=forge-original-workbench-v2-20261103/);
  assert.match(build,/forgeWorkbenchCss=read\('src\/css\/experience\/forge-workbench-v2\.css'\)/);
  assert.match(build,/forgeWorkbenchJs=read\('src\/js\/presentation\/forge-workbench-v2\.js'\)/);
});

test('Searchable original catalog keeps eight names and click routes untouched',()=>{
  for(const html of [index,standalone]){
    const cards=[...html.matchAll(/<button class="home-card home-item ([^"]+)" onclick="([^"]+)"[^>]*>/g)];
    assert.deepEqual(cards.map(m=>m[1]),[
      'tool-logo','tool-pdf','tool-split','tool-stills','tool-story','tool-links','tool-ads','tool-video'
    ]);
    assert.deepEqual(cards.map(m=>m[2]),[
      "UI.openTool('section-logo')","UI.openTool('section-pdf','convert')",
      "UI.openTool('section-pdf','split')","UI.openTool('section-stills-boards','video')",
      "UI.openTool('section-stills-boards','story')","UI.openTool('section-adlinks','gen')",
      "UI.openTool('section-adlinks','downloader')","UI.openTool('section-yt-helper')"
    ]);
    assert.match(html,/id="forgeHeroName">The Forge<\/h1>/);
    assert.match(html,/id="forgeToolSearch" type="search"/);
    assert.match(html,/id="forgeSearchCount" aria-live="polite"/);
    assert.match(html,/id="forgeFeaturedLabel">Select a workspace/);
  }
  assert.match(js,/event\.key === 'Escape'/);
  assert.match(js,/event\.key === 'Enter'/);
  assert.match(js,/event\.key!=='\/'/);
  assert.match(js,/first\.click\(\)/);
  assert.match(js,/forge-filtered-out/);
  assert.doesNotMatch(js,/innerHTML\s*=/);
});

test('Creative workbench design distinguishes feature and compact tiles',()=>{
  assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
  assert.match(css,/\.home-card:nth-child\(-n\+2\)/);
  assert.match(css,/\.home-card:nth-child\(n\+3\)/);
  assert.match(css,/\.home-card\.forge-filtered-out/);
  assert.match(css,/\.forge-search:focus-within/);
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('Five original workspace section routes retain a unified visible editor shell',()=>{
  for(const section of ['section-logo','section-pdf','section-stills-boards','section-adlinks','section-yt-helper']){
    assert.ok(css.includes('#'+section),'missing workspace styling '+section);
  }
  assert.match(css,/#view-app \.tool-section \.tool-header/);
  assert.match(css,/#mainSidebar\.nav-sidebar\.visible/);
  assert.match(css,/#stillsTabContentStory/);
  assert.match(css,/#adlinksTabContentDownloader/);
  assert.match(css,/\.forge-compressor-frame/);
});
