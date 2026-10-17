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
      files.delete(this.name);this.name=target;files.set(target,this);},
    async createWritable(){
      const handle=this, chunks=[];
      return new WritableStream({
        write(chunk){chunks.push(Buffer.from(chunk));},
        close(){handle.bytes=Buffer.concat(chunks);handle.mtime=10000;}
      });
    }
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


test('Recognizes SharePoint filename normalization but rejects unrelated MP4s',()=>{
  const h=harness();
  assert.equal(h.rename.matchesOriginal('ALDI-Frische_Social_LT3_OLV_Social_Pick_me_22s.mp4',original),true);
  assert.equal(h.rename.matchesOriginal('Unrelated Project Another Company Video.mp4',original),false);
  assert.equal(h.rename.matchesOriginal('ALDI Frische Social LT3 OLV Social Pick me 22s (2).mp4',original),true);
  assert.equal(h.rename.matchesOriginal('ALDI Frische Social LT3 OLV Social Pick me 22s.pdf',original),false);
});

test('Distinct source filenames may be tracked concurrently while identical source names are refused',async()=>{
  const h=harness();
  await h.rename.chooseFolder();
  assert.equal(h.rename.begin(h.entry),true);
  const different={...h.entry,url:'https://example.sharepoint.com/sites/DACH/Shared%20Documents/Other%20Campaign.mp4',displayName:'AD2_Other'};
  assert.equal(h.rename.begin(different),true);
  assert.equal(h.rename.stats().waiting,2);
  const duplicate={...h.entry,displayName:'AD99_duplicate'};
  assert.equal(h.rename.begin(duplicate),false);
  assert.match(h.statuses.at(-1).message,/same source filename/i);
  assert.equal(h.rename.stats().waiting,2);
  assert.notEqual(h.timer,null);
});

test('A newly created file in the wrong extension is not renamed',async()=>{
  const h=harness(); await h.rename.chooseFolder(); h.rename.begin(h.entry);
  h.files.set('ALDI Frische Social LT3 OLV Social Pick me 22s.htm',h.mkHandle('ALDI Frische Social LT3 OLV Social Pick me 22s.htm',Buffer.from('<html>Not media</html>')));
  h.advance(5000);for(let i=0;i<4;i++) await h.tick();
  assert.equal(h.files.has(fixed),false);
});

test('Explicit recovery renames already-existing (1).mp4 and removes that original instead of creating another copy',async()=>{
  const duplicate='ALDI Frische Social LT3 OLV Social Pick me 22s (1).mp4';
  const h=harness([{name:original,bytes:'older',modified:3000},{name:duplicate,bytes:'actual video bytes',modified:4000},{name:'unrelated.mp4',bytes:'unrelated',modified:4000}]);
  await h.rename.chooseFolder();
  const candidates=await h.rename.findExisting(h.entry);
  assert.equal(candidates[0].name,duplicate);
  assert.equal(candidates.length,2);
  const renamed=await h.rename.renameExisting(h.entry,duplicate);
  assert.equal(renamed,fixed);
  assert.equal(h.files.get(fixed).bytes.toString(),'actual video bytes');
  assert.equal(h.files.has(duplicate),false);
  assert.equal(h.files.get(original).bytes.toString(),'older');
  assert.equal(h.files.get('unrelated.mp4').bytes.toString(),'unrelated');
});

test('Explicit recovery refuses wrong file, existing destination, and incomplete download',async()=>{
  const duplicate='ALDI Frische Social LT3 OLV Social Pick me 22s (1).mp4';
  const h=harness([{name:duplicate,bytes:'video',modified:3000},{name:fixed,bytes:'existing',modified:3000}]);
  await h.rename.chooseFolder();
  await assert.rejects(h.rename.renameExisting(h.entry,'unrelated.mp4'),/does not match/);
  await assert.rejects(h.rename.renameExisting(h.entry,duplicate),/already exists/);
  assert.equal(h.files.get(duplicate).bytes.toString(),'video');
  assert.equal(h.files.get(fixed).bytes.toString(),'existing');
  h.files.set(duplicate+'.crdownload',h.mkHandle(duplicate+'.crdownload',Buffer.from('partial'),3000));
  await assert.rejects(h.rename.renameExisting(h.entry,duplicate),/not finished/);
  assert.equal(h.files.has(duplicate),true);
});

test('Recovery does not touch unmatched files or folder entries',async()=>{
  const h=harness([{name:'unrelated.mp4',bytes:'other',modified:3000}]);
  await h.rename.chooseFolder();
  assert.equal((await h.rename.findExisting(h.entry)).length,0);
  await assert.rejects(h.rename.renameExisting(h.entry,'unrelated.mp4'),/does not match/);
  assert.equal(h.files.get('unrelated.mp4').bytes.toString(),'other');
});

test('When Chrome cannot move local files, the fallback copies and verifies the exact bytes before deleting (1).mp4',async()=>{
  const duplicate='ALDI Frische Social LT3 OLV Social Pick me 22s (1).mp4';
  const bytes=Buffer.alloc(170000);
  for(let i=0;i<bytes.length;i++)bytes[i]=i%251;
  const h=harness([{name:duplicate,bytes,modified:3000}]);
  h.files.get(duplicate).move=async()=>{const e=new Error('native move unavailable');e.name='NotSupportedError';throw e;};
  await h.rename.chooseFolder();
  const actual=await h.rename.renameExisting(h.entry,duplicate);
  assert.equal(actual,fixed);
  assert.equal(h.files.has(duplicate),false);
  assert.deepEqual(h.files.get(fixed).bytes,bytes);
});

test('Twelve simultaneous downloads map to twelve distinct spreadsheet names even when completion order is shuffled',async()=>{
  const h=harness();
  await h.rename.chooseFolder();
  const entries=Array.from({length:12},(_,i)=>({
    url:'https://example.sharepoint.com/sites/DACH/_layouts/15/stream.aspx?id='+
       encodeURIComponent('/sites/DACH/Shared Documents/ALDI Campaign '+(i+1)+' Media.mp4'),
    displayName:'AD'+(i+1)+'_ALDI_Campaign_'+(i+1)+'_Media',
    renameStatus:(message,error)=>h.statuses.push({message,error})
  }));
  entries.forEach(e=>assert.equal(h.rename.begin(e),true));
  assert.equal(h.rename.stats().waiting,12);
  for (const i of [7,0,11,4,2,9,1,10,5,8,3,6]) {
    h.files.set('ALDI Campaign '+(i+1)+' Media (1).mp4',
      h.mkHandle('ALDI Campaign '+(i+1)+' Media (1).mp4',Buffer.from('payload-'+(i+1)),10500));
  }
  h.files.set('Unrelated Company Another Video.mp4',h.mkHandle('Unrelated Company Another Video.mp4',Buffer.from('untouched')));
  h.advance(5000);
  await h.tick();await h.tick();assert.equal(h.rename.stats().renamed,0);
  await h.tick();
  for (let i=0;i<12;i++) {
    const name='AD'+(i+1)+'_ALDI_Campaign_'+(i+1)+'_Media.mp4';
    assert.equal(h.files.get(name)?.bytes.toString(),'payload-'+(i+1),name);
    assert.equal(h.files.has('ALDI Campaign '+(i+1)+' Media (1).mp4'),false);
  }
  assert.equal(h.files.has('Unrelated Company Another Video.mp4'),true);
  assert.equal(h.rename.stats().renamed,12);
  assert.equal(h.rename.stats().waiting,0);
  assert.equal(h.rename.stats().failed,0);
  assert.equal(h.timer,null);
});

test('Ambiguous near-identical campaign names must not be guessed or renamed',async()=>{
  const h=harness();
  await h.rename.chooseFolder();
  const first={
    url:'https://example.sharepoint.com/sites/DACH/Shared%20Documents/ALDI%20Autumn%20Social%20Video%20Pick%2022s.mp4',
    displayName:'AD1_Autumn_22s',renameStatus:()=>{}
  };
  const second={
    url:'https://example.sharepoint.com/sites/DACH/Shared%20Documents/ALDI%20Autumn%20Social%20Video%20Pick%2030s.mp4',
    displayName:'AD2_Autumn_30s',renameStatus:()=>{}
  };
  assert.equal(h.rename.begin(first),true);
  assert.equal(h.rename.begin(second),true);
  const ambiguous='ALDI Autumn Social Video Pick.mp4';
  h.files.set(ambiguous,h.mkHandle(ambiguous,Buffer.from('ambiguous file')));
  h.advance(5000);
  for(let i=0;i<4;i++)await h.tick();
  assert.equal(h.files.has(ambiguous),true);
  assert.equal(h.rename.stats().renamed,0);
  const exact='ALDI Autumn Social Video Pick 22s.mp4';
  h.files.set(exact,h.mkHandle(exact,Buffer.from('correctly linked'),10500));
  for(let i=0;i<3;i++)await h.tick();
  assert.equal(h.files.get('AD1_Autumn_22s.mp4')?.bytes.toString(),'correctly linked');
  assert.equal(h.files.has(ambiguous),true);
  assert.equal(h.rename.stats().waiting,1);
});

test('The selected download folder cannot change while multiple downloads are being tracked',async()=>{
  const h=harness();
  await h.rename.chooseFolder();
  h.rename.begin(h.entry);
  await assert.rejects(h.rename.chooseFolder(),/active renames/i);
  assert.equal(h.rename.stats().waiting,1);
});
