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
    globalThis.Core = {Utils:{sanitize: name => String(name).replace(/[^a-zA-Z0-9_]/g,"")}};
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


test('one Add Assets menu replaces standalone folder buttons and supports nested ad folders',async()=>{
 const prevCore=globalThis.Core,prevDocument=globalThis.document;
 try {
  globalThis.Core={Utils:{sanitize: value=>String(value).replace(/[^a-zA-Z0-9_-]/g,'_')}};
  globalThis.document={getElementById:()=>null};
  const Story=(await import('../src/js/tools/storyboard.js')).default.Story;
  const sample=(dir,name)=>({name,type:'image/png',webkitRelativePath:dir+'/'+name,size:24});
  const one=Story.folderGroups([sample('Campaign_Stills','still_1.png'),sample('Campaign_Stills','still_2.png')]);
  assert.deepEqual(one.map(item=>item.name),['Campaign_Stills']);
  const groups=Story.folderGroups([
    sample('Campaign/AD10','still_10.png'),sample('Campaign/AD2','still_10.png'),
    sample('Campaign/AD2','still_2.png'),sample('Campaign/AD10','still_2.png'),
    sample('Campaign/AD2/stills','still_1.png')
  ]);
  assert.deepEqual(groups.map(item=>item.name),['AD2','AD10']);
  assert.deepEqual(groups[0].items.map(item=>item.name),['still_1.png','still_2.png','still_10.png']);
  assert.ok(source.includes('this.importFolder(files)'));
  assert.ok(source.includes('storyImportMenu'));
  assert.ok(source.includes('menu.setAttribute("role", "menu")'));
  assert.ok(!source.includes('className = "liquid-btn story-folder-import"'));
  for(const token of ['storyImportMenu','folderGroups(files)','async importFolder(files)']) {
    assert.ok(app.includes(token));assert.ok(standalone.includes(token));
  }
 } finally {globalThis.Core=prevCore;globalThis.document=prevDocument;}
});

test('Downloader scrolls as one workspace and preserves requested/completed states',()=>{
 for(const selector of [
   '#view-app #adlinksTabContentDownloader .ad-download-inner{',
   '#view-app #adlinksTabContentDownloader #adDlTableContainer{',
   'position:static!important;top:auto!important;z-index:auto!important;',
   '#view-app #adlinksTabContentDownloader #adDlStatus{',
   '#view-app #adlinksTabContentDownloader #adDlRequestedHeaderRow',
   '#view-app #section-stills-boards .story-import-menu[hidden]',
   '.nav-sidebar.visible>.forge-nav-indicator',
   '#view-app .tool-section .forge-switch-indicator',
   '@media(prefers-reduced-motion:reduce)'
 ])assert.ok(css.includes(selector),'missing scroll/motion change '+selector);
 const ad=read('src/js/tools/ad-downloader.js');
 for(const token of ['ensureQueue()','markRequested(entry)','markDownloaded(entry)',
   'this.markRequested(entry);','this.markDownloaded(entry);',
   'this.confirmDownloaded(entry)','entry.renamedFilename && !isError']){
    assert.ok(ad.includes(token),'missing queue state '+token);
    assert.ok(app.includes(token));assert.ok(standalone.includes(token));
 }
 assert.equal(css,read('dist/css/forge-unified-workspaces.css'));
 assert.ok(standalone.includes('<style id="forge-unified-workspaces-styles">'+css+'</style>'));
});
