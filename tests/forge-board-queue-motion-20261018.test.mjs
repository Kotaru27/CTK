import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

globalThis.document={getElementById:()=>null};
globalThis.CTKSharePoint={isSharePoint:()=>false};
const [{default:{AdDownloader}}]=await Promise.all([
  import('../src/js/tools/ad-downloader.js')
]);

test('native SharePoint download request moves below pending without claiming verified',()=>{
  const requested=[],confirmed=[];
  const requestedBody={appendChild(node){requested.push(node)}};
  const completedBody={appendChild(node){confirmed.push(node)}};
  const requestHeading={style:{display:'none'}};
  const completedHeading={style:{display:'none'}};
  globalThis.document.getElementById=id=>({
    adDlRequestedBody:requestedBody,adDlRequestedHeaderRow:requestHeading,
    adDlDownloadedBody:completedBody,adDlDownloadedHeaderRow:completedHeading
  })[id]||null;
  const classes=new Set();
  const row={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},style:{removeProperty(){}},title:''};
  const entry={url:'https://example.test/file',row,selected:true,downloaded:false,
    downloadButton:{textContent:'Download',disabled:false}};
  const queue=Object.assign(Object.create(AdDownloader),{entries:[entry],updateBulkButton(){}});
  queue.markRequested(entry);
  assert.equal(entry.downloaded,false);
  assert.equal(entry.requested,true);
  assert.equal(entry.downloadButton.textContent,'Download again');
  assert.deepEqual(requested,[row]);
  assert.equal(requestHeading.style.display,'table-row');
  assert.equal(confirmed.length,0);
  queue.markDownloaded(entry,true);
  assert.equal(entry.downloaded,true);
  assert.equal(entry.requested,false);
  assert.equal(entry.downloadVerified,true);
  assert.deepEqual(confirmed,[row]);
});

test('bulk Storyboard board navigation preserves list and editable header filename',()=>{
  const story=readFileSync(new URL('../src/js/tools/storyboard.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/css/experience/forge-workflow-interactions.css',import.meta.url),'utf8');
  assert.match(story,/title\.insertAdjacentElement\("afterend",label\)/);
  assert.match(story,/this\.boardLayout="compact"/);
  assert.match(story,/\[\["compact","Compact"\],\["list","List"\]\]/);
  assert.match(css,/#storyHeaderName #storyNameInput/);
  assert.match(css,/#storyProjectTabs\.story-board-list-hidden/);
});

test('tool-to-tool route uses the same motion coordinator as home navigation',()=>{
  const engine=readFileSync(new URL('../src/js/core/prelude.js',import.meta.url),'utf8');
  assert.match(engine,/motion\.navigate\(\(\) => this\._openTool\(id, mode\), route\)/);
  const route=readFileSync(new URL('../src/js/presentation/forge-video-route.js',import.meta.url),'utf8');
  assert.match(route,/forgeRouteTravel/);
});
