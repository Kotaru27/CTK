import test from 'node:test';
import assert from 'node:assert/strict';

const priorDocument=globalThis.document;
globalThis.document={getElementById:()=>null};
const {default:{AdDownloader}}=await import('../src/js/tools/ad-downloader.js');
globalThis.document=priorDocument;

function setup(options={}) {
  const save={document:globalThis.document,window:globalThis.window,
    renamer:globalThis.CTKDownloadRenamer,FileReader:globalThis.FileReader};
  let hasFolder=false,granted=true,reads=0,focused=false;
  const elements={},headChildren=[];
  const classes=()=>({values:new Set(),toggle(k,on){if(on)this.values.add(k);else this.values.delete(k);}});
  const label={classList:classes(),attrs:{},setAttribute(k,v){this.attrs[k]=v;},title:'',
    listeners:{},addEventListener(n,fn){this.listeners[n]=fn;}};
  const input={disabled:false,value:'',files:[],listeners:{},addEventListener(n,fn){this.listeners[n]=fn;},
    closest(q){return q==='label'?label:null;}};
  const zone={classList:classes(),listeners:{},parentNode:null,
    addEventListener(n,fn){this.listeners[n]=fn;}};
  const bar={appendChild(el){elements[el.id]=el;}};
  const header={appendChild(el){headChildren.push(el);elements[el.id]=el;},
    insertBefore(el){headChildren.push(el);elements[el.id]=el;}};
  zone.parentNode=header;
  const display={innerText:'Upload Excel'};
  elements.adDlInput=input;elements.adDlDropZone=zone;
  elements.adlinksDlHeaderControls=header;elements.adDlSummaryBar=bar;
  elements.adDlFileNameDisplay=display;
  globalThis.document={
    getElementById:id=>elements[id]||null,
    createElement:tag=>({tagName:tag.toUpperCase(),style:{},
      setAttribute(k,v){this[k]=v;},focus(){focused=true;}})
  };
  globalThis.window={isSecureContext:true,showDirectoryPicker(){}};
  globalThis.CTKDownloadRenamer={
    active:()=>hasFolder,
    permissionGranted:async()=>granted,
    chooseFolder:async()=>{
      if(options.cancel)throw Object.assign(Error('Cancelled'),{name:'AbortError'});
      if(options.unsupported)throw Error('Automatic renaming requires Chromium.');
      hasFolder=true;return 'Downloads';
    }
  };
  globalThis.FileReader=class {readAsArrayBuffer(){reads++;}};
  const engine=Object.assign(Object.create(AdDownloader),{_renameFolderApproved:false});
  engine.init();
  return {engine,input,zone,label,elements,get reads(){return reads;},
    get focused(){return focused;},setPermission(v){granted=v;},
    restore(){globalThis.document=save.document;globalThis.window=save.window;
      globalThis.CTKDownloadRenamer=save.renamer;globalThis.FileReader=save.FileReader;}
  };
}
test('Excel picker and programmatic import are locked until a writable folder is chosen',async()=>{
  const h=setup();
  try{
    assert.equal(h.input.disabled,true);
    assert.equal(h.label.attrs['aria-disabled'],'true');
    assert.equal(h.elements.adDlRenameFolder.textContent,'Auto-name: Choose folder');
    let prevented=false;
    h.label.listeners.click({preventDefault(){prevented=true;}});
    assert.equal(prevented,true);
    assert.equal(h.focused,true);
    assert.match(h.elements.adDlStatus.textContent,/Choose an Auto-name folder/);
    await h.engine.loadExcel({name:'ads.xlsx'});
    assert.equal(h.reads,0);
    h.engine.workbookData={SheetNames:['ads']};
    h.engine.generateDashboard();
    assert.equal(h.reads,0);
    let preventedDrop=false;
    h.zone.listeners.drop({preventDefault(){preventedDrop=true;}});
    assert.equal(preventedDrop,true);
    assert.equal(h.input.disabled,true);
  }finally{h.restore();}
});
test('Approved writable folder unlocks Excel and revoked permission immediately locks it again',async()=>{
  const h=setup();
  try{
    await h.engine.chooseRenameFolder();
    assert.equal(h.input.disabled,false);
    assert.equal(h.label.attrs['aria-disabled'],'false');
    assert.match(h.elements.adDlRenameFolder.textContent,/Downloads/);
    await h.engine.loadExcel({name:'campaign.xlsx'});
    assert.equal(h.reads,1);
    await h.engine.loadExcel({name:'file.txt'});
    assert.equal(h.reads,1);
    h.setPermission(false);
    await h.engine.loadExcel({name:'campaign.xlsx'});
    assert.equal(h.reads,1);
    assert.equal(h.input.disabled,true);
    assert.match(h.elements.adDlStatus.textContent,/access is required/);
  }finally{h.restore();}
});
test('Cancelled or unsupported folder selection never enables the Excel upload',async()=>{
  for(const option of [{cancel:true},{unsupported:true}]) {
    const h=setup(option);
    try{
      await h.engine.chooseRenameFolder();
      assert.equal(h.input.disabled,true);
      assert.equal(h.engine.folderReady(),false);
      await h.engine.loadExcel({name:'ads.xls'});
      assert.equal(h.reads,0);
    }finally{h.restore();}
  }
});
