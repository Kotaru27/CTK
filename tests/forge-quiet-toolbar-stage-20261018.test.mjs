import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('Ad Downloader replaces redundant hero with accessible action-first toolbar',()=>{
  const css=read('../src/css/experience/forge-workflow-interactions.css');
  assert.match(css,/#adlinksTabContentDownloader \.ad-download-heading\{display:none!important;/);
  assert.match(css,/#adlinksTabContentDownloader \.ad-download-top\{/);
  assert.match(css,/#adlinksDlHeaderControls\{/);
  const index=read('../index.html');
  assert.match(index,/id="adlinksDlHeaderControls"/);
  assert.match(index,/id="adDlInput"/);
  assert.match(index,/id="adDlSummaryBar"/);
});

test('native SharePoint downloads update their queue without verbose persistent status',()=>{
  const js=read('../src/js/tools/ad-downloader.js');
  const requestBlock=js.slice(js.indexOf('          downloadSharePoint(entry) {'),js.indexOf('          async fixSharePointName(entry) {'));
  assert.match(requestBlock,/this\.markRequested\(entry\)/);
  assert.match(requestBlock,/this\.status\(tracking \? .* : ""\)/);
  assert.doesNotMatch(requestBlock,/CTK stays open|Download completion cannot be confirmed here/);
});

test('cross-tool transitions keep the shell stable while new workspace covers the old',()=>{
  const css=read('../src/css/experience/forge-video-route.css');
  const coordinator=read('../src/js/presentation/forge-video-route.js');
  assert.match(coordinator,/root\.dataset\.forgeRouteTravel/);
  assert.match(coordinator,/delete root\.dataset\.forgeRouteTravel/);
  assert.match(css,/view-transition-name:forge-workspace-stage/);
  assert.match(css,/::view-transition-old\(forge-workspace-stage\)\{/);
  assert.match(css,/opacity:1!important/);
  assert.match(css,/::view-transition-new\(forge-workspace-stage\)\{/);
  assert.match(css,/@keyframes forge-stage-arrive\{/);
  assert.match(css,/::view-transition-old\(root\),/);
  assert.doesNotMatch(css,/backdrop-filter|filter:blur|animation-iteration-count:infinite/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
