import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/css/experience/forge-logo-compact.css');
const js=read('src/js/presentation/forge-logo-compact.js');
const build=read('scripts/build.mjs');
const page=read('index.html');

test('approved Logo Resizer is scoped to its own route and preserves control identifiers',()=>{
  assert.match(css,/body\.tool-active:has\(#section-logo\.active\) > \.header/);
  assert.match(css,/#section-logo #logoControls>\.glass-panel:nth-child\(3\)/);
  assert.match(css,/#section-logo #logoControls>\.glass-panel:nth-child\(1\)/);
  assert.match(css,/#section-logo #logoControls>\.glass-panel:nth-child\(2\)/);
  assert.match(css,/#section-logo \.editor-layout:has\(#logoDetailOverlay\.active\)/);
  assert.match(css,/#section-logo \.editor-layout>#logoGrid>\.logo-card-item/);
  for(const id of ['logoInput','exportWidth','exportHeight','exportFormat','globalFontFamily',
    'fontSizeInput','fontColorPicker','boldToggle','syncFilenameToggle','globalPadding',
    'globalImgPos','logoGrid','logoDetailOverlay','exportAllBtn','clearLogoBtn']){
    assert.equal((page.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
      'Original control retained once: '+id);
  }
});

test('preview changes only CSS sizing, not original canvas export data',()=>{
  assert.match(js,/canvas\.width/);
  assert.match(js,/canvas\.height/);
  assert.match(js,/MutationObserver/);
  assert.match(js,/title\.before\(back\)/,'Breadcrumb must be a sibling of the heading');
  assert.doesNotMatch(js,/title\.prepend\(back\)/);
  assert.match(js,/attributeFilter:\['width','height'\]/);
  assert.match(js,/--lr-card-width/);
  assert.match(js,/--lr-canvas-height/);
  assert.doesNotMatch(js,/\.toBlob\(|\.toDataURL\(|\.getContext\(|\.drawImage\(|\.download\s*=/);
  assert.match(build,/const forgeLogoCompactCss=read/);
  assert.match(build,/const forgeLogoCompactJs=read/);
  assert.match(build,/save\('dist\/css\/forge-logo-compact\.css'/);
  assert.match(build,/save\('dist\/js\/forge-logo-compact\.js'/);
  assert.match(page,/forge-logo-compact\.css\?v=forge-logo-compact-20261104-v5/);
  assert.match(page,/forge-logo-compact\.js\?v=forge-logo-compact-20261104-v5/);
});
