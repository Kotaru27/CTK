/*
 * Optional, user-authorized renaming of native SharePoint downloads.
 * Does not intercept SharePoint requests, collect credentials, or bypass CORS.
 * Only an explicitly chosen directory is inspected; unrelated files are not modified.
 * Multiple DISTINCT source names can be tracked at once, but ambiguous matches are never renamed automatically.
 */
const CTKDownloadRenamer = (() => {
  let directory = null;
  let known = new Set();
  const pending = new Map();
  let ticker = null;
  let scanning = false;
  let renamedCount = 0, failedCount = 0;
  const maxPending = 60;
  const startedLimitMs = 10 * 60 * 1000;
  function stats() {return {waiting:pending.size,renamed:renamedCount,failed:failedCount};}
  function originalKey(name) {
    const parts=filenameParts(name);
    return parts ? parts.extension+'|'+parts.stem.normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'') : '';
  }
  function matchStrength(actual,original) {
    if (!matchesOriginal(actual,original)) return 0;
    const a=filenameParts(actual),o=filenameParts(original);
    if (a.stem.toLowerCase()===o.stem.toLowerCase()) return 3;
    if (originalKey(actual)===originalKey(original)) return 2;
    return 1;
  }

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
    if (pending.size) throw Error('Wait for active renames to finish before changing the tracked folder.');
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
    renamedCount=0; failedCount=0;
    stopTimer();
    return directory.name;
  }
  function stopTimer() { if (ticker !== null) { clearInterval(ticker); ticker=null; } }
  function begin(entry) {
    if (!directory) return false;
    const original = sourceFilename(entry.url);
    if (!original) {
      entry.renameStatus?.('Unable to identify the original SharePoint media filename for automatic renaming.',true);
      return false;
    }
    if (pending.has(entry)) {
      entry.renameStatus?.('This ad is already being tracked. Wait until its download is renamed before downloading it again.',true);
      return false;
    }
    if (pending.size>=maxPending) {
      entry.renameStatus?.('Auto-name is tracking '+maxPending+' downloads already. Wait for a few to finish.',true);
      return false;
    }
    // Filesystem filenames do not prove SharePoint source URLs. Two links whose
    // downloaded basenames are indistinguishable cannot safely be tracked together.
    if ([...pending.values()].some(job=>originalKey(job.original)===originalKey(original))) {
      entry.renameStatus?.('Another pending ad has the same source filename. Download these sequentially to avoid naming the wrong file.',true);
      return false;
    }
    pending.set(entry,{original,entry,started:Date.now(),readings:new Map()});
    if (!ticker) ticker = setInterval(() => { scanOnce().catch(err => {
      for (const [item] of [...pending]) {
        cancel(item);
        failedCount++;
        item.renameStatus?.('Auto-name cannot read the selected folder: '+err.message,true);
      }
    }); }, 1250);
    entry.renameStatus?.('Tracking '+entry.displayName+' in '+directory.name+'…');
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
      const names=await currentNames(), jobs=[...pending];
      for (const [entry,job] of jobs) {
        if (Date.now()-job.started > startedLimitMs) {
          cancel(entry);
          failedCount++;
          entry.renameStatus?.('Auto-name timed out for '+entry.displayName+'. Check that Chrome downloaded into '+directory.name+'. The original file was untouched.',true);
        }
      }
      if (!pending.size) return;

      // Assign a file only when one job uniquely matches it AND that job has
      // exactly one matching candidate. Resolve exact basename matches ahead
      // of separator-normalized or fuzzy matches. Never use click order to guess.
      const claims=new Map();
      for (const actual of names) {
        if (known.has(actual) || /\.crdownload$/i.test(actual)) continue;
        let best=0, winners=[];
        for (const [entry,job] of pending) {
          const strength=matchStrength(actual,job.original);
          if (strength>best) {best=strength;winners=[entry];}
          else if (strength && strength===best) winners.push(entry);
        }
        if (winners.length!==1) continue; // zero matches or ambiguity
        const winner=winners[0];
        if (!claims.has(winner)) claims.set(winner,[]);
        claims.get(winner).push(actual);
      }
      for (const [entry,job] of [...pending]) {
        const candidates=claims.get(entry)||[];
        if (candidates.length!==1) continue; // refuse multiple possible files for one ad
        const actual=candidates[0], handle=await directory.getFileHandle(actual);
        const file=await handle.getFile();
        if (!file.size || file.lastModified < job.started-3000) continue;
        const previous=job.readings.get(actual);
        job.readings.set(actual,{size:file.size,modified:file.lastModified,
          seen:previous?.size===file.size && previous.modified===file.lastModified ? previous.seen+1 : 1});
        const state=job.readings.get(actual);
        if (state.seen<3 || Date.now()-file.lastModified<2500) continue;
        if (names.has(actual+'.crdownload')) continue;
        const target=targetFilename(entry,job.original);
        if (target.toLowerCase()===actual.toLowerCase()) {
          cancel(entry);
          known.add(actual);
          renamedCount++;
          entry.renamedFilename=target;
          entry.renameStatus?.('Downloaded with the correct filename: '+target);
          continue;
        }
        try {
          await renameConfirmed(handle,actual,target);
          known.add(target);known.add(actual);
          entry.renamedFilename=target;
          cancel(entry);
          renamedCount++;
          entry.renameStatus?.('Saved as '+target);
        } catch(error) {
          cancel(entry);
          failedCount++;
          known.add(actual);
          entry.renameStatus?.('Auto-name failed for '+entry.displayName+': '+error.message,true);
        }
      }
    } finally {scanning=false;}
  }
  // Existing files were already present when the folder was selected, so the
  // background 'new file only' watcher will never process them. Make this an
  // explicit user-driven recovery operation instead.
  async function findExisting(entry) {
    if (!directory) throw Error('Choose the folder containing the downloaded file first.');
    const original=sourceFilename(entry.url);
    if (!original) throw Error('SharePoint URL does not identify a supported media filename.');
    const names=await currentNames();
    const candidates=[];
    for (const name of names) {
      if (!matchesOriginal(name,original) || names.has(name+'.crdownload')) continue;
      const handle=await directory.getFileHandle(name);
      const file=await handle.getFile();
      if (!file.size) continue;
      candidates.push({name,size:file.size,lastModified:file.lastModified});
    }
    candidates.sort((a,b)=>b.lastModified-a.lastModified || a.name.localeCompare(b.name));
    return candidates;
  }
  async function renameExisting(entry,actual) {
    if (!directory) throw Error('No folder selected.');
    if (scanning) throw Error('Automatic rename is in progress. Try again once it finishes.');
    const original=sourceFilename(entry.url);
    if (!original || !matchesOriginal(actual,original)) throw Error('Selected name does not match this SharePoint media file.');
    // Protect files still being written and any Chrome partial download.
    const names=await currentNames();
    if (!names.has(actual)) throw Error('Selected download was not found in this folder.');
    if (names.has(actual+'.crdownload')) throw Error('The browser has not finished downloading this file.');
    const handle=await directory.getFileHandle(actual);
    const file=await handle.getFile();
    if (!file.size || Date.now()-file.lastModified < 2500) throw Error('Download is still recent or incomplete. Wait for Chrome to finish and try again.');
    const target=targetFilename(entry,original);
    if (target.toLowerCase()===actual.toLowerCase()) {
      cancel(entry);
      return target;
    }
    await renameConfirmed(handle,actual,target);
    cancel(entry);
    known.add(actual);
    known.add(target);
    entry.renamedFilename=target;
    return target;
  }
  function active() {return !!directory;}
  function folderName() {return directory?.name || '';}
  // scanOnce is exposed for deterministic regression tests; ordinary callers use begin().
  return {chooseFolder,begin,cancel,active,folderName,sourceFilename,targetFilename,matchesOriginal,scanOnce,findExisting,renameExisting,stats};
})();
