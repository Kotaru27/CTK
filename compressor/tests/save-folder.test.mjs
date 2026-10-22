import test from 'node:test';
import assert from 'node:assert/strict';
import {folderSaveSupported,saveOutputToFolder} from '../save-folder.mjs';

test('optional folder export never overwrites originals and remembers chosen directory',async()=>{
  const previous=globalThis.window;
  const files=new Map([['Campaign.mp4',new Blob(['ORIGINAL'])]]);
  let pickerCount=0;
  const folder={
    kind:'directory',name:'My Videos',
    queryPermission:async()=> 'granted',
    getFileHandle:async(name,options={})=>{
      if(!files.has(name)){
        if(!options.create)throw Object.assign(new Error('Missing'),{name:'NotFoundError'});
        files.set(name,new Blob([]));
      }
      return {
        getFile:async()=>files.get(name),
        createWritable:async()=>{
          const parts=[];
          return new WritableStream({
            write:chunk=>{parts.push(chunk);},
            close:()=>{files.set(name,new Blob(parts));}
          });
        }
      };
    },
    removeEntry:async name=>{files.delete(name);}
  };
  globalThis.window={isSecureContext:true,showDirectoryPicker:async(options)=>{
    pickerCount++; assert.equal(options.mode,'readwrite'); return folder;
  }};
  try{
    assert.equal(folderSaveSupported(),true);
    const blob=new Blob(['ENCODED']);
    const first=await saveOutputToFolder(blob,'Campaign.mp4');
    assert.equal(first.name,'Campaign (compressed).mp4');
    assert.equal(first.folder,'My Videos');
    assert.equal(await files.get('Campaign.mp4').text(),'ORIGINAL');
    assert.equal(await files.get(first.name).text(),'ENCODED');
    const again=await saveOutputToFolder(new Blob(['V2']),'Campaign.mp4');
    assert.equal(again.name,'Campaign (compressed 2).mp4');
    assert.equal(await files.get(again.name).text(),'V2');
    assert.equal(pickerCount,1,'chosen folder remains in memory only for this page');
    assert.equal(await files.get('Campaign.mp4').text(),'ORIGINAL');
    folder.queryPermission=async()=> 'denied';
    await assert.rejects(()=>saveOutputToFolder(blob,'Campaign.mp4'),/write access/);
  }finally{
    if(previous===undefined)delete globalThis.window;
    else globalThis.window=previous;
  }
});

test('folder export is optional and hidden when browser does not support it',()=>{
  const prior=globalThis.window;
  globalThis.window={isSecureContext:false,showDirectoryPicker:()=>{}};
  try{assert.equal(folderSaveSupported(),false);}
  finally{if(prior===undefined)delete globalThis.window;else globalThis.window=prior;}
});
