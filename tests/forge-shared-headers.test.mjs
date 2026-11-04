import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('src/css/experience/forge-shared-headers.css');
const js=read('src/js/presentation/forge-shared-headers.js');
const build=read('scripts/build.mjs');
const html=read('index.html');

test('all five original sections share a header without replacing headings or action nodes',()=>{
  assert.match(js,/querySelectorAll\('#view-app > \.tool-section'\)/);
  assert.match(js,/section\.id === 'section-yt-helper'/);
  assert.match(js,/header\.classList\.add\('forge-unified-tool-header'\)/);
  assert.match(js,/title\.before\(home\)/);
  assert.match(js,/homeAction\.click\(\)/);
  assert.match(js,/storyNameInput/);
  assert.match(js,/observer\.observe\(nameLabel/);
  assert.doesNotMatch(css,/data:image\/png;base64,/);
  assert.match(js,/\.home-card\.tool-story \.forge-home-icon svg/);
  assert.match(js,/\(homepageStoryboardSvg \|\| createStoryboardSourceSvg\(\)\)\.cloneNode\(true\)/,
    'Storyboard header must clone the homepage source or its identical fallback');
  assert.match(js,/\.forge-cine-piece\[title="Storyboard"\] svg/,
    'Header must use the same source SVG as the homepage when the intro is present');
  assert.match(js,/createStoryboardSourceSvg/);
  assert.match(js,/iconObserver\.observe\(storyHeaderIcon,\{childList:true\}\)/);
  assert.match(css,/svg:not\(\.forge-storyboard-header-svg\)/);
  assert.match(js,/M3 9h18M10 9v11M3 15h7M10 15h11/,
    'Fallback must match the homepage vector path exactly');
  assert.match(css,/forge-storyboard-header-svg/);
  assert.match(css,/#storyHeaderName:not\(\[hidden\]\)/);
  assert.match(js,/home\.classList\.add\('forge-tool-home'\)/);
  assert.doesNotMatch(js,/replaceChildren|innerHTML\s*=|UI\.openTool/);
  assert.match(css,/body\.tool-active > \.header\{display:none!important\}/);
  assert.match(css,/font:400 24px\/1\.15 "Kola"/);
  assert.match(css,/Storyboard\/Filmstrip\/Fit contain a project-name field/,'Complex Storyboard actions need their own row');
  assert.match(css,/font:750 clamp\(20px,1\.72vw,27px\)\/1\.05 "Plus Jakarta Sans"/);
  assert.equal((html.match(/id="stillsToolTitle"/g)||[]).length,1);
  for(const control of ['logoInput','exportAllBtn','pdfTabConvert','pdfTabSplit','stillsInput',
    'storySubModeToggle','stillsTabStory','adlinksTabGen','adlinksTabDownloader']){
    assert.equal((html.match(new RegExp('id="'+control+'"','g'))||[]).length,1,
      'Original toolbar control preserved once: '+control);
  }
});
test('shared header is present in modular and standalone builds',()=>{
  assert.match(build,/const forgeSharedHeaderCss=read/);
  assert.match(build,/const forgeSharedHeaderJs=read/);
  assert.match(build,/save\('dist\/css\/forge-shared-headers\.css'/);
  assert.match(build,/save\('dist\/js\/forge-shared-headers\.js'/);
  assert.match(html,/forge-shared-headers\.css\?v=forge-eight-header-20261104-v9/);
  assert.match(html,/forge-shared-headers\.js\?v=forge-eight-header-20261104-v9/);
});
