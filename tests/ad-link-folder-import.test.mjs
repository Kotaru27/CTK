import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {default as module} from '../src/js/tools/link-gen.js';

const AD = module.AdLinkGen;

test('Ad Link Gen sorts ad names by natural ascending number', () => {
  const original = ['Ad_11.mp4','Ad_3.mp4','Ad_10.jpg','Ad_2.jpg','Ad_1.jpg'];
  assert.deepEqual(AD.sortNamesAscending(original), ['Ad_1.jpg','Ad_2.jpg','Ad_3.mp4','Ad_10.jpg','Ad_11.mp4']);
  assert.equal(original[0], 'Ad_11.mp4', 'input array must not mutate');
});

test('folder import only accepts supported files from chosen top-level directory', () => {
  assert.deepEqual(AD.collectFolderNames([
    {name:'Ad_10.PNG',webkitRelativePath:'Ads/Ad_10.PNG'},
    {name:'Ad_2.jpg',webkitRelativePath:'Ads/Ad_2.jpg'},
    {name:'Ad_1.mp4',webkitRelativePath:'Ads/Ad_1.mp4'},
    {name:'voice.mp3',webkitRelativePath:'Ads/voice.mp3'},
    {name:'Ad_11.jpeg',webkitRelativePath:'Ads/Ad_11.jpeg'},
    {name:'notes.docx',webkitRelativePath:'Ads/notes.docx'},
    {name:'nested.jpg',webkitRelativePath:'Ads/sub/nested.jpg'},
    {name:'bad/name.png',webkitRelativePath:'Ads/bad/name.png'}
  ]), {
    names:['Ad_1.mp4','Ad_2.jpg','Ad_10.PNG','Ad_11.jpeg','voice.mp3'],
    folderName:'Ads',unsupported:0,nested:3
  });
  assert.deepEqual(AD.collectFolderNames([]),{names:[],folderName:'Selected folder',unsupported:0,nested:0});
});

test('cancel retains existing filenames; import populates editable textarea and status', () => {
  const nodes={
    'alg-input':{value:'manual.jpg'},
    'alg-folder-name':{textContent:''},
    'alg-folder-count':{textContent:''},
    'alg-folder-status':{textContent:''},
    'alg-folder-preview':{
      entries:[],
      replaceChildren(){this.entries=[];},
      append(element){this.entries.push(element);}
    }
  };
  const before=globalThis.document;
  globalThis.document={
    getElementById:id=>nodes[id]||null,
    createElement:tag=>({tagName:tag,className:'',textContent:'',children:[],append(...children){this.children.push(...children)}})
  };
  try {
    AD.importFolder({target:{files:[],value:'ignored'}});
    assert.equal(nodes['alg-input'].value,'manual.jpg');
    const target={files:[
      {name:'Ad_10.jpg',webkitRelativePath:'Campaign/Ad_10.jpg'},
      {name:'Ad_2.mp4',webkitRelativePath:'Campaign/Ad_2.mp4'},
      {name:'ignore.txt',webkitRelativePath:'Campaign/ignore.txt'}
    ],value:'folder'};
    AD.importFolder({target});
    assert.equal(target.value,'', 'picker reset enables re-importing the same directory');
    assert.equal(nodes['alg-input'].value,'Ad_2.mp4\nAd_10.jpg');
    assert.equal(nodes['alg-folder-name'].textContent,'Campaign');
    assert.match(nodes['alg-folder-status'].textContent,/1 unsupported skipped/);
    assert.equal(nodes['alg-folder-preview'].entries.length,2);
    assert.equal(nodes['alg-folder-preview'].entries[0].children[1].textContent,'Ad_2.mp4');
    nodes['alg-input'].value='Manual_9.jpg';
    AD.updateFolderPreview();
    assert.match(nodes['alg-folder-count'].textContent,/1 filename/);
    assert.match(nodes['alg-folder-status'].textContent,/Manual entry/);
  } finally {
    globalThis.document=before;
  }
});

test('folder-generated filenames preserve existing Ad Exposure and Storyboard outputs',()=>{
  const input=AD.collectFolderNames([
    {name:'Ad_10.mp4',webkitRelativePath:'Ads/Ad_10.mp4'},
    {name:'Ad_2.jpg',webkitRelativePath:'Ads/Ad_2.jpg'}
  ]).names;
  const nodes={
    'alg-server':{value:'s3'},'alg-folder':{value:'Campaign/Ads'},
    'alg-mode-toggle':{checked:true},'alg-input':{value:input.join('\n')},
    'alg-out-ads':{value:''},'alg-out-story':{value:''}
  };
  const before=globalThis.document, previousUi=globalThis.UI;
  globalThis.document={getElementById:id=>nodes[id]};
  globalThis.UI={showError(){throw Error('Unexpected skipped filename');}};
  try{
    AD.generate();
    assert.ok(nodes['alg-out-ads'].value.indexOf('Ad_2.jpg')<nodes['alg-out-ads'].value.indexOf('Ad_10'));
    assert.match(nodes['alg-out-ads'].value,/\/\/s3media-ml-eu\.surveycenter\.com\/Campaign\/Ads\/Ad_10/);
    assert.match(nodes['alg-out-story'].value,/Ad_10\.jpg/);
  }finally{
    globalThis.document=before;globalThis.UI=previousUi;
  }
});

test('CTK build keeps Link Gen folder import in hosted and standalone releases',()=>{
  const hosted=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const standalone=fs.readFileSync(new URL('../dist/creative-tools-standalone.html',import.meta.url),'utf8');
  for(const html of [hosted,standalone]){
    assert.match(html,/id="alg-folder-picker"/);
    assert.match(html,/webkitdirectory/);
    assert.match(html,/AdLinkGen\.importFolder\(event\)/);
    assert.match(html,/AdLinkGen\.updateFolderPreview\(\)/);
    assert.match(html,/id="alg-input"/);
    assert.match(html,/id="alg-out-ads"/);
  }
  assert.match(hosted,/dist\/css\/ad-link-folder-import\.css/);
  assert.match(standalone,/id="ctk-alg-folder-style"/);
});
