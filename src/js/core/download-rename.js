/*
 * Optional, user-authorized renaming of native SharePoint downloads.
 * Does not intercept SharePoint requests, collect credentials, or bypass CORS.
 * A single explicitly chosen directory is inspected; unrelated files are not modified.
 */
const CTKDownloadRenamer = (() => {
  let directory = null;
  let known = new Set();
  const pending = new Map();
  let ticker = null;
  let scanning = false;
  const startedLimitMs = 10 * 60 * 1000;

  function sourceFilename(url) {
    const direct = CTKSharePoint.directUrl(url);
    if (!direct) return null;
    const path = new URL(direct).searchParams.get('SourceUrl');
    const name = path?.split('/').pop();
    if (!name || !/\.(?:mp4|mov|m4v|avi|mkv|webm|mp3|m4a|wav|ogg|flac|jpg|jpeg|png|gif|webp|bmp|svg|pdf|zip)$/i.test(name)) return null;
    return name;
  }
  function matchesOriginal(actual, original) {
    const dot = original.lastIndexOf('.');
    if (dot < 1) return false;
    const stem = original.slice(0,dot), ext = original.slice(dot);
    // Windows and Chrome append (1), (2), ... for colliding native downloads.
    return actual.toLowerCase() === original.toLowerCase() ||
      (actual.toLowerCase().startsWith(stem.toLowerCase()+' (') &&
        new RegExp('^'+escapeRegex(stem)+' \\(\\d+\\)'+escapeRegex(ext)+'$','i').test(actual));
  }
  function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function targetFilename(entry, original) {
    const extension = original.slice(original.lastIndexOf('.')).toLowerCase();
    const stem = String(entry.displayName || 'AD').replace(/[^a-zA-Z0-9_\-]/g,'_').slice(0,160);
    return stem + extension;
  }
  async function currentNames() {
    const out = new Set();
    for await(const [name,handle] of directory.entries()) if(handle.kind === 'file')out.add(name);
    return out;
  }
  async function chooseFolder() {
    if (typeof window.showDirectoryPicker !== 'function' || !window.isSecureContext) {
      throw Error('Automatic naming requires a Chromium browser on HTTPS (GitHub Pages).');
    }
    const selected = await window.showDirectoryPicker({id:'ctk-download-rename',mode:'readwrite',startIn:'downloads'});
    // The picker can return a handle with permission that later expires; avoid destructive writes until checked.
    if (!selected || selected.kind !== 'directory') throw Error('No folder selected.');
    directory = selected;
    known = await currentNames();
    pending.clear();
    stopTimer();
    return directory.name;
  }
  function stopTimer() { if (ticker !== null) { clearInterval(ticker); ticker=null; } }
  function begin(entry) {
    if (!directory) return false;
    const original = sourceFilename(entry.url);
    if (!original || pending.has(entry)) return false;
    const candidate = {original,entry,started:Date.now(),readings:new Map()};
    pending.set(entry,candidate);
    if (!ticker) ticker = setInterval(() => { scanOnce().catch(err => {
      entry.renameStatus?.('Automatic rename paused: '+err.message,true);
      pending.delete(entry);
      if (!pending.size) stopTimer();
    }); }, 1250);
    entry.renameStatus?.('Downloading. Waiting for the finished file in '+directory.name+'…');
    return true;
  }
  function cancel(entry) {
    pending.delete(entry);
    if (!pending.size) stopTimer();
  }
  async function exists(name) {
    try { await directory.getFileHandle(name); return true; }
    catch(e) { if(e.name === 'NotFoundError') return false; throw e; }
  }
  async function renameConfirmed(handle, original, target) {
    if (await exists(target)) throw Error('Destination '+target+' already exists. Kept original unchanged.');
    // Do not open/truncate an existing target; copy is a fallback only for browsers without move().
    if (typeof handle.move === 'function') {
      try { await handle.move(target); return 'renamed'; }
      catch(e) {
        if (!['NotSupportedError','InvalidStateError','SecurityError','NotAllowedError','TypeError'].includes(e.name)) throw e;
      }
    }
    const originalFile = await handle.getFile();
    const destination = await directory.getFileHandle(target,{create:true});
    let writer;
    try {
      writer = await destination.createWritable();
      await originalFile.stream().pipeTo(writer);
      writer=null;
      const written = await destination.getFile();
      if (written.size !== originalFile.size) throw Error('Incomplete file copy. Original was preserved.');
      // Size alone is insufficient to prove full file integrity; verify first and last 64 KB as well.
      for (const start of [0, Math.max(0, originalFile.size-65536)]) {
        const count=Math.min(65536,originalFile.size-start);
        const a=new Uint8Array(await originalFile.slice(start,start+count).arrayBuffer());
        const b=new Uint8Array(await written.slice(start,start+count).arrayBuffer());
        if (a.length !== b.length || a.some((byte,index)=>byte!==b[index])) throw Error('File copy verification failed. Original was preserved.');
      }
      await directory.removeEntry(original);
      return 'copied and original removed';
    } catch (e) {
      try { await writer?.abort(); } catch{}
      try { await directory.removeEntry(target); } catch{}
      throw e;
    }
  }
  async function scanOnce() {
    if (!directory || scanning || !pending.size) return;
    scanning=true;
    try {
      const names=await currentNames();
      for (const [entry,job] of [...pending]) {
        if (Date.now()-job.started > startedLimitMs) {
          cancel(entry);
          entry.renameStatus?.('Timed out waiting for a finished file. Your original download is untouched.',true);
          continue;
        }
        // Only newly created files matching the expected original media basename qualify.
        const candidates=[...names].filter(n=>!known.has(n) && matchesOriginal(n,job.original));
        if (candidates.length !== 1) continue; // never guess between multiple files
        const actual=candidates[0], handle=await directory.getFileHandle(actual);
        const file=await handle.getFile();
        if (!file.size || file.lastModified < job.started-3000) continue;
        const previous=job.readings.get(actual);
        job.readings.set(actual,{size:file.size,modified:file.lastModified,seen: previous?.size === file.size && previous.modified === file.lastModified ? previous.seen+1 : 1});
        const state=job.readings.get(actual);
        // Require file to have stopped changing; rename only after native download has finished.
        if (state.seen<3 || Date.now()-file.lastModified<2500) continue;
        if([...names].some(n=>n.toLowerCase() === (actual+'.crdownload').toLowerCase()))continue;
        const target=targetFilename(entry,job.original);
        if(target.toLowerCase()===actual.toLowerCase()) {
          entry.renameStatus?.('Downloaded with the requested filename: '+target);
          cancel(entry);
          known.add(actual);
          continue;
        }
        try {
          await renameConfirmed(handle,actual,target);
          known.add(target);known.add(actual);
          entry.renameStatus?.('Saved as '+target);
          entry.renamedFilename=target;
          cancel(entry);
        } catch(error) {
          entry.renameStatus?.('Downloaded, but automatic renaming failed: '+error.message,true);
          cancel(entry);
          known.add(actual);
        }
      }
    } finally {scanning=false;}
  }
  function active() {return !!directory;}
  function folderName() {return directory?.name || '';}
  // scanOnce is exposed for deterministic regression tests; ordinary callers use begin().
  return {chooseFolder,begin,cancel,active,folderName,sourceFilename,targetFilename,matchesOriginal,scanOnce};
})();
