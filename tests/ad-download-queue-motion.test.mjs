import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const src=read('src/js/tools/ad-downloader.js');
const bundle=read('dist/js/app.js');
const standalone=read('dist/creative-tools-standalone.html');
const css=read('src/css/experience/forge-unified-workspaces.css');

test('Ad Downloader separates native requests from confirmed fetched sources',()=>{
 const tokens=[
  'markRequested(entry) {',
  'entry.requested = true;',
  'this.moveToDownloads(entry, false);',
  'markDownloaded(entry) {',
  'this.moveToDownloads(entry, true);',
  'entry.row.classList.toggle("download-requested", !verifiedSource)',
  'document.getElementById("adDlDownloadedBody").appendChild(entry.row)',
  'entry.downloadButton.textContent = "Download again"',
  '!entry.downloaded && !entry.requested',
  'if (entry.inProgress) return;'
 ];
 for(const token of tokens){
  assert.ok(src.includes(token),'source missing '+token);
  assert.ok(bundle.includes(token),'Pages missing '+token);
  assert.ok(standalone.includes(token),'standalone missing '+token);
 }
 assert.match(src,/Download requested · verify in browser Downloads/);
 assert.match(src,/entry.downloaded = true;[\s\S]*?entry.requested = false/);
});
test('Ad Downloader summary is compact and heading scrolls with the rows',()=>{
 for(const token of [
  '#adDlSummaryBar[style*="display: block"]',
  'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
  'position:static!important;top:auto!important;z-index:auto!important;',
  '#adDlDownloadedHeaderRow td{',
  'tbody tr.download-requested td{',
  '.ad-dl-state{'
 ])assert.ok(css.includes(token),'missing display behavior '+token);
 assert.ok(!css.includes('position:sticky!important;top:0!important;z-index:40!important;'));
 assert.equal(css,read('dist/css/forge-unified-workspaces.css'));
 assert.ok(standalone.includes('<style id="forge-unified-workspaces-styles">'+css+'</style>'));
});
test('Animation uses animated indicator states, preserved layout and reduced-motion',()=>{
 for(const token of [
  'cubic-bezier(.20,.78,.20,1)',
  'button[role="tab"]::after',
  'button.liquid-btn.active-mode::after',
  'transform:scaleX(1)',
  'transition:transform 310ms',
  '@media(prefers-reduced-motion:reduce)'
 ])assert.ok(css.includes(token), 'missing transition design '+token);
 for(const disallowed of ['@keyframes forge-nav-hover', 'transform:translateY(-1px)!important']){
  assert.ok(!css.includes(disallowed),'disallowed motion '+disallowed);
 }
});
