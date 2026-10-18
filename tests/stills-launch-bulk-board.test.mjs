import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

globalThis.document={getElementById:()=>null};
globalThis.Core={Utils:{sanitize:value=>String(value).replace(/[<>:"|?*]/g,'')},BlobRegistry:{create:()=> 'blob:fake',release(){}}};
const [{default:{Stills}},{default:{Story}}]=await Promise.all([
  import('../src/js/tools/video-stills.js'),
  import('../src/js/tools/storyboard.js')
]);

test('Stills has one header bulk transfer and no Smart Frame Selection injection',()=>{
  const js=readFileSync(new URL('../src/js/tools/video-stills.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/css/experience/forge-workflow-interactions.css',import.meta.url),'utf8');
  assert.match(js,/sendAllSelectedToBoards\(/);
  assert.match(js,/const smartMode = false/);
  assert.doesNotMatch(js,/label\.append\(toggle,document\.createTextNode\("Smart frame selection"\)\)/);
  assert.match(css,/\.vs-stage-intro\{\s*display:none!important/);
  assert.match(css,/#stillsTabContentVideo \.vs-empty-cta/);
  assert.match(css,/#section-logo \.logo-empty-upload/);
  assert.match(css,/#section-pdf \.pdf-empty-cta/);
});

test('Selected frames from multiple videos create independent boards, exclude unchecked stills and avoid duplicates',async()=>{
  const button={disabled:true,textContent:''};
  const originalImage=globalThis.Image,originalTools=globalThis.Tools,originalUI=globalThis.UI;
  const originalDoc=globalThis.document;
  globalThis.Image=class{
    naturalWidth=100;naturalHeight=100;
    set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}
    get src(){return this._src;}
  };
  globalThis.document={getElementById:id=>id==='stillsSendAllBoardsBtn'?button:null};
  const initial={id:1,name:'Board_1',images:[],settings:{}};
  const story=Object.assign(Object.create(Story),{
    projects:[initial],active:initial,els:{name:{value:'Board_1'}},
    saveSettings(){},switchProject(id){this.active=this.projects.find(p=>p.id===id);},
    validateImage:()=>true
  });
  const groups={
    'video-1':{name:'AD1',frames:[
      {num:1,type:'still',blob:{name:'a'},checked:true},
      {num:2,type:'still',blob:{name:'b'},checked:false}
    ]},
    'video-2':{name:'AD2',frames:[
      {num:1,type:'still',blob:{name:'c'},checked:true},
      {num:'storyboard',type:'storyboard',blob:{},checked:true}
    ]}
  };
  const opened=[],messages=[];
  globalThis.UI={switchStillsTab:mode=>opened.push(mode),toast:message=>messages.push(message),showError:message=>{throw Error(message)}};
  globalThis.Tools={Story:story};
  const stills=Object.assign(Object.create(Stills),{
    collection:groups,els:{overlay:{classList:{remove(){}}}},
    updateBulkBoardButton:Stills.updateBulkBoardButton
  });
  try{
    await stills.sendAllSelectedToBoards();
    assert.deepEqual(story.projects.map(x=>x.name),['AD1','AD2']);
    assert.deepEqual(story.projects.map(x=>x.images.length),[1,1]);
    assert.deepEqual(opened,['story']);
    assert.equal(story.projects[0].images[0].label,'AD1 #1');
    await stills.sendAllSelectedToBoards();
    assert.deepEqual(story.projects.map(x=>x.images.length),[1,1],'repeating transfer must not duplicate');
    groups['video-1'].frames[1].checked=true;
    await stills.sendAllSelectedToBoards();
    assert.deepEqual(story.projects.map(x=>x.images.length),[2,1],'newly checked frame adds only once');
    assert.equal(story.projects.length,2);
  }finally{
    globalThis.Image=originalImage;globalThis.Tools=originalTools;
    globalThis.UI=originalUI;globalThis.document=originalDoc;
  }
});
