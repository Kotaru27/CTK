import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const spCode = fs.readFileSync(new URL('../src/js/core/sharepoint-graph.js',import.meta.url),'utf8');
const renamerCode = fs.readFileSync(new URL('../src/js/core/download-rename.js',import.meta.url),'utf8');
const rawMedia = 'https://example.sharepoint.com/sites/DACH/_layouts/15/stream.aspx?id='+encodeURIComponent('/sites/DACH/Shared Documents/ALDI Frische Social LT3 OLV Social Pick me 22s.mp4');
const original = 'ALDI Frische Social LT3 OLV Social Pick me 22s.mp4';
const fixed = 'AD1_ALDI_Frische_Social_LT3_OLV_SOCIAL1_Pick_me_22s.mp4';
const className = 'AD1_ALDI_Frische_Social_LT3_OLV_SOCIAL1_Pick_me_22s';

function harness(initial=[]) {
  const files = new Map();
  let now=10000;
  const realDate=Date;
  class FakeDate extends realDate { static now(){return now;} }
  const mkHandle=(name, bytes, lastModified=10500)=>({
    kind:'file',name, bytes:Buffer.from(bytes), mtime:lastModified,
    async getFile(){const blob=new Blob([this.bytes]);return Object.assign(blob,{lastModified:this.mtime});},
    async move(target){if(files.has(target)){const e=new Error('file exists');e.name='InvalidModificationError';throw e;}
      files.delete(this.name);this.name=target;files.set(target,this);}
  });
  for(const f of initial) files.set(f.name,mkHandle(f.name,f.bytes??Buffer.from('old'),f.modified??3000));
  const dir={kind:'directory',name:'CTK test downloads',
    async *entries(){for(const item of files)yield[item[0],item[1]];},
    async getFileHandle(name,opt={}){
      if(files.has(name))return files.get(name);
      if(!opt.create){const err=new Error('not found');err.name='NotFoundError';throw err;}
      const f=mkHandle(name,Buffer.from(''));files.set(name,f);return f;
    },
    async removeEntry(name){files.delete(name);},
  };
  let timer=null;
  const ctx={URL, Blob, Date:FakeDate, setInterval(fn){timer=fn;return 1;},clearInterval(){timer=null;},
    window:{isSecureContext:true,showDirectoryPicker:()=>Promise.resolve(dir)}};
  vm.createContext(ctx);
  vm.runInContext(spCode+'\n'+renamerCode+'\nglobalThis.sp=CTKSharePoint;globalThis.rename=CTKDownloadRenamer;',ctx);
  const rename=ctx.rename;
  const statuses=[];
  const entry={url:rawMedia,displayName:className,renameStatus:(message,err)=>statuses.push({message,err})};
  return {files,rename,entry,statuses,dir,mkHandle,advance(ms){now+=ms},async tick(){await rename.scanOnce();},get timer(){return timer}};
}

test('Derives the real original SharePoint basename and formatted target, including collision suffix rules',()=>{
  const h=harness();
  assert.equal(h.rename.sourceFilename(rawMedia),original);
  assert.equal(h.rename.targetFilename(h.entry,original),fixed);
  assert.equal(h.rename.matchesOriginal('ALDI Frische Social LT3 OLV Social Pick me 22s (1).mp4',original),true);
  assert.equal(h.rename.matchesOriginal('unrelated.mp4',original),false);
});

test('Renames only a newly appearing exact media basename, after it has stopped changing',async()=>{
  const h=harness([{name:'unrelated.mp4'},{name:original,bytes:'previous file'}]);
  await h.rename.chooseFolder();
  assert.equal(h.rename.active(),true);
  assert.equal(h.rename.begin(h.entry),true);
  const duplicate='ALDI Frische Social LT3 OLV Social Pick me 22s (1).mp4';
  h.files.set(duplicate,h.mkHandle(duplicate,Buffer.from('video-media-data')));
  h.files.set('random new file.mp4',h.mkHandle('random new file.mp4',Buffer.from('other')));
  h.advance(4000);
  await h.tick();await h.tick();assert.equal(h.files.has(fixed),false);
  await h.tick();
  assert.equal(h.files.get(fixed)?.bytes.toString(),'video-media-data');
  assert.equal(h.files.has(duplicate),false);
  assert.equal(h.files.has(original),true);
  assert.equal(h.files.has('random new file.mp4'),true);
  assert.match(h.statuses.at(-1).message,/Saved as AD1_/);
  assert.equal(h.timer,null);
});

test('Never touches a pre-existing matching file or an existing destination',async()=>{
  const h=harness([{name:original,bytes:'old original'},{name:fixed,bytes:'old target'}]);
  await h.rename.chooseFolder();
  h.rename.begin(h.entry);
  h.advance(4500); for(let i=0;i<4;i++)await h.tick();
  assert.equal(h.files.get(original).bytes.toString(),'old original');
  assert.equal(h.files.get(fixed).bytes.toString(),'old target');
  const duplicate='ALDI Frische Social LT3 OLV Social Pick me 22s (1).mp4';
  h.files.set(duplicate,h.mkHandle(duplicate,Buffer.from('new video')));
  for(let i=0;i<3;i++)await h.tick();
  assert.equal(h.files.get(duplicate).bytes.toString(),'new video');
  assert.equal(h.files.get(fixed).bytes.toString(),'old target');
  assert.match(h.statuses.at(-1).message,/already exists/);
});

test('Does not claim a completed rename while a candidate is still being written',async()=>{
  const h=harness(); await h.rename.chooseFolder();h.rename.begin(h.entry);
  const candidate=h.mkHandle(original,Buffer.from('a'),10500);
  h.files.set(original,candidate);
  h.advance(4500);await h.tick();candidate.bytes=Buffer.from('longer file');candidate.mtime=Date.now();
  await h.tick();await h.tick();
  assert.equal(h.files.has(fixed),false);
});

test('Declined folder choice does not affect default native SharePoint download',async()=>{
  const h=harness();
  assert.equal(h.rename.active(),false);
  assert.equal(h.rename.begin(h.entry),false);
  assert.equal(h.timer,null);
});
