import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('src/js/tools/storyboard.js');
const app = read('dist/js/app.js');
const standalone = read('dist/creative-tools-standalone.html');
const css = read('src/css/experience/forge-unified-workspaces.css');

test('Existing Add Assets handles directory selection and bulk board creation in both releases',()=>{
 for(const token of ['this.els.input.setAttribute("webkitdirectory", "")',
  'this.els.input.setAttribute("directory", "")','this.importDirectory(files)',
  'async importDirectory(files) {','childFolders.size < 2',
  'await this.handleFiles(media, target, folderName)',
  'while (this.projects.some(board => board.id === id)) id++']) {
  assert.ok(source.includes(token),'source missing '+token);
  assert.ok(app.includes(token),'Pages missing '+token);
  assert.ok(standalone.includes(token),'standalone missing '+token);
 }
 assert.ok(!source.includes('storyFolderInput'),'no extra folder picker should be created');
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

test('Non-sticky asset table and smooth tool indicators preserve releases',()=>{
 for(const token of [
  '#view-app #section-adlinks #adlinksTabContentDownloader #adDlTableContainer thead{',
  'position:static!important;top:auto!important;z-index:auto!important;',
  '#view-app #section-adlinks #adlinksTabContentDownloader #adDlStatus{',
  '#view-app #section-adlinks #adlinksTabContentDownloader .ad-dl-state{',
  '--forge-control-ease:cubic-bezier(.20,.78,.20,1)',
  '.nav-sidebar.visible .nav-item:not(.active):hover',
  '#view-app .tool-section :is(#tabRowPdf,#tabRowStills,#tabRowAdlinks) button[role="tab"]::after',
  '#view-app #section-stills-boards #storySubModeToggle button.liquid-btn.active-mode::after',
  'prefers-reduced-motion:reduce'
 ]) assert.ok(css.includes(token),'missing workflow/interaction fix '+token);
 assert.equal(css,read('dist/css/forge-unified-workspaces.css'));
 assert.ok(standalone.includes('<style id="forge-unified-workspaces-styles">'+css+'</style>'));
});

// Group by the immediate ad directory under one selected parent folder;
// protect the user's existing populated board and duplicate names.
test('Bulk parent-folder import produces separate boards with correct stills',async()=>{
 const previous={document:globalThis.document,Core:globalThis.Core,UI:globalThis.UI};
 try{
  globalThis.document={getElementById:()=>null};
  globalThis.Core={Utils:{sanitize:s=>String(s).replace(/[^a-zA-Z0-9_]/g,"")}};
  globalThis.UI={showError:()=>{}};
  const Story=(await import('../src/js/tools/storyboard.js')).default.Story;
  const file=(relative)=>({name:relative.split('/').pop(),type:'video/mp4',size:200,
    webkitRelativePath:relative});
  const existing={id:10,name:'Custom Client',images:[{file:{name:'old.mp4'}}]};
  const ctx={
   active:existing,projects:[existing],els:{name:{value:'Custom Client'}},
   folderNameFromFiles:Story.folderNameFromFiles,
   validateImage:Story.validateImage,
   getVideoFrame:async()=>({naturalWidth:96,naturalHeight:54}),
   handleFiles:null,importDirectory:null,renderTabs(){},saveSettings(){},updateList(){},draw(){},
   addNewProject(){
    const id=11+this.projects.length;
    const board={id,name:'Board_'+(this.projects.length+1),images:[]};
    this.projects.push(board);this.active=board;this.els.name.value=board.name;
   },
   switchProject(id){this.active=this.projects.find(p=>p.id===id);
    this.els.name.value=this.active.name;}
  };
  ctx.handleFiles=(files,target,name)=>Story.handleFiles.call(ctx,files,target,name);
  const input=[file('Campaign/Ad_1/01.mp4'),file('Campaign/Ad_2/01.mp4'),
    file('Campaign/Ad_1/02.mp4'),file('Campaign/Ad_2/02.mp4')];
  await Story.importDirectory.call(ctx,input);
  assert.equal(ctx.projects.length,3);
  assert.equal(ctx.projects[0],existing,'existing populated board was overwritten');
  assert.deepEqual(ctx.projects.slice(1).map(p=>p.name),['Ad_1','Ad_2']);
  assert.deepEqual(ctx.projects.slice(1).map(p=>p.images.map(i=>i.file.name)),
    [['01.mp4','02.mp4'],['01.mp4','02.mp4']]);
  assert.equal(ctx.active.name,'Ad_1','first imported board should be focused');
  ctx.addNewProject();
  await Story.importDirectory.call(ctx,[file('One/Still_A.mp4')]);
  assert.equal(ctx.active.name,'One');
 }finally{globalThis.document=previous.document;
  globalThis.Core=previous.Core;globalThis.UI=previous.UI;}
});
