import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('src/js/tools/storyboard.js');
const app = read('dist/js/app.js');
const standalone = read('dist/creative-tools-standalone.html');
const css = read('src/css/experience/forge-unified-workspaces.css');

test('Storyboard directory picker and name logic are identical in source and both releases', () => {
  for (const fragment of ['folderInput.setAttribute("webkitdirectory", "")',
    'folderInput.addEventListener("change"', 'folderNameFromFiles(files) {',
    'const wasEmpty = project.images.length === 0;',
    'project.name === initialName',
    'this.els.name.value = candidate',
    'other.name.toLowerCase() === candidate.toLowerCase()']) {
    assert.ok(source.includes(fragment), 'missing Storyboard folder behavior: ' + fragment);
    assert.ok(app.includes(fragment), 'Pages release mismatch: ' + fragment);
    assert.ok(standalone.includes(fragment), 'standalone mismatch: ' + fragment);
  }
});

test('Actual Storyboard import names only previously empty boards with a shared folder', async () => {
  const previousDocument = globalThis.document;
  const previousCore = globalThis.Core;
  const previousUI = globalThis.UI;
  try {
    globalThis.document = {getElementById: () => null};
    globalThis.Core = {Utils:{sanitize: name => String(name).replace(/[^a-zA-Z0-9_]/g,"")};
    globalThis.UI = {showError: () => {}};
    const Story = (await import('../src/js/tools/storyboard.js')).default.Story;
    const file=(folder, filename='still.mp4')=>({
      name:filename,type:'video/mp4',size:300,
      ...(folder ? {webkitRelativePath:folder+'/'+filename} : {})
    });
    assert.equal(Story.folderNameFromFiles([file('ProjectGreen')]),'ProjectGreen');
    assert.equal(Story.folderNameFromFiles([file(null)]),'');
    assert.equal(Story.folderNameFromFiles([file('A'),file('B')]),'');

    const run=async (files,existing,otherNames=[])=>{
      const board={name:existing,images:[]};
      const ctx={
        active:board,projects:[board,...otherNames.map(name=>({name,images:[]}))],
        els:{name:{value:existing}},
        folderNameFromFiles:Story.folderNameFromFiles,
        validateImage:Story.validateImage,
        getVideoFrame:async()=>({naturalWidth:120,naturalHeight:60}),
        renderTabs(){this.rendered=(this.rendered||0)+1},
        saveSettings(){},updateList(){},draw(){}
      };
      await Story.handleFiles.call(ctx,files);
      return {name:board.name,visible:ctx.els.name.value,images:board.images.length,rendered:ctx.rendered||0};
    };
    assert.deepEqual(await run([file('Campaign_Stills')],'Board_1'),
      {name:'Campaign_Stills',visible:'Campaign_Stills',images:1,rendered:1});
    assert.equal((await run([file('Campaign_Stills')],'Board_1',['Campaign_Stills'])).name,'Campaign_Stills 2');
    assert.equal((await run([file(null)],'Board_1')).name,'Board_1');
    const board={name:'Custom',images:[{file:{name:'existing'}}]};
    const ctx={active:board,projects:[board],els:{name:{value:'Custom'}},
      folderNameFromFiles:Story.folderNameFromFiles,
      validateImage:Story.validateImage,
      getVideoFrame:async()=>({naturalWidth:120,naturalHeight:60}),
      renderTabs(){},saveSettings(){},updateList(){},draw(){}};
    await Story.handleFiles.call(ctx,[file('AnotherFolder')]);
    assert.equal(board.name,'Custom','existing named board must not be renamed');
  } finally {
    globalThis.document=previousDocument;
    globalThis.Core=previousCore;
    globalThis.UI=previousUI;
  }
});

test('download-table header and modern interactions preserve layout and accessibility',()=>{
  for(const token of [
    '#view-app #adlinksTabContentDownloader #adDlTableContainer thead{',
    'position:sticky!important;top:0!important;z-index:40!important;',
    'isolation:isolate!important;',
    '#view-app #adlinksTabContentDownloader #adDlTableContainer thead th{',
    '#view-app #stillsTabContentStory .story-folder-import:has(input:focus-visible)',
    '.nav-sidebar.visible .nav-item:hover:not(.active)',
    '#view-app #section-stills-boards #storySubModeToggle button.liquid-btn.active-mode',
    '#view-app .tool-section .liquid-btn::before',
    '#view-app .tool-section .liquid-btn.danger-btn:not(:disabled):hover'
  ]) assert.ok(css.includes(token),'missing visual repair: '+token);
  assert.equal(css,read('dist/css/forge-unified-workspaces.css'));
  assert.ok(standalone.includes('<style id="forge-unified-workspaces-styles">'+css+'</style>'));
});
