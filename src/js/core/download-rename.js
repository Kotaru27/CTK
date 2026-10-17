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
  function filenameParts(name) {
    const dot = name.lastIndexOf('.');
    if (dot <= 0) return null;
    const stem = name.slice(0,dot).replace(/ \(\d+\)$/,'');
    const extension = name.slice(dot).toLowerCase();
    return { stem, extension };
  }
  function comparableTokens(stem) {
    const normalized=stem.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/([a-z])([A-Z])/g,'$1 $2')
      .toLowerCase().replace(/[^a-z0-9]+/g,' ')
      .trim().split(/\s+/).filter(Boolean);
    return new Set(normalized.filter(t=>!/^ad\d+$/.test(t)));
  }
  function matchesOriginal(actual, original) {
    const a=filenameParts(actual), o=filenameParts(original);
    if (!a || !o || a.extension!==o.extension) return false;
    const originalStem=o.stem;
    if (a.stem.toLowerCase() === originalStem.toLowerCase()) return true;
    // SharePoint may normalize separators/case in the name it returns.
    // Require high overlap AND at least three matching distinct terms to avoid
    // renaming an unrelated new media file with the same extension.
    const aa=comparableTokens(a.stem), oo=comparableTokens(originalStem);
    if (aa.size<3 || oo.size<3) return false;
    let common=0;
    for (const token of aa) if (oo.has(token)) common++;
    return common>=3 && common/aa.size>=0.78 && common/oo.size>=0.78;
  }
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
    if (typeof directory.queryPermission === 'function' && await directory.queryPermission({mode:'readwrite'}) !== 'granted') {
      directory = null;
      throw Error('Read and write permission was not granted for the chosen folder.');
    }
    known = await currentNames();
    pending.clear();
    stopTimer();
    return directory.name;
  }
  function stopTimer() { if (ticker !== null) { clearInterval(ticker); ticker=null; } }
  function begin(entry) {
    if (!directory) return false;
    const original = sourceFilename(entry.url);
    if (!original || pending.has(entry) || pending.size) {
      if (pending.size && !pending.has(entry)) entry.renameStatus?.('Another file is still being tracked. Download one file at a time when Auto-name is enabled.',true);
      return false;
    }
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
      // Verify the entire fallback copy before deleting the original; the
      // previous first/last-64 KiB check could miss corruption in the middle.
      for (let start = 0; start < originalFile.size; start += 1024*1024) {
        const end = Math.min(originalFile.size,start+1024*1024);
        const a=new Uint8Array(await originalFile.slice(start,end).arrayBuffer());
        const b=new Uint8Array(await written.slice(start,end).arrayBuffer());
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
          entry.renameStatus?.('Automatic naming timed out: the file was not found in your selected folder. Save the SharePoint download into that same folder; your original file was untouched.',true);
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
