/* Optional, user-authorized local export. This is storage, not an encoder:
 * selecting a folder cannot make the browser execute native FFmpeg.
 * Existing browser downloads stay the default for unsupported devices.
 */
import {safeDownloadName} from './codec.mjs';

let directory=null;
export function folderSaveSupported(){
  return typeof window!=='undefined' && window.isSecureContext &&
    typeof window.showDirectoryPicker==='function';
}
function candidateName(name,index){
  if(index===0)return name;
  const dot=name.lastIndexOf('.');
  const stem=dot>0?name.slice(0,dot):name;
  const ext=dot>0?name.slice(dot):'';
  return `${stem} (compressed${index>1?' '+index:''})${ext}`;
}
async function exists(folder,name){
  try{await folder.getFileHandle(name);return true;}
  catch(e){if(e?.name==='NotFoundError')return false;throw e;}
}
export async function saveOutputToFolder(blob,sourceName){
  if(!folderSaveSupported())throw Error('Folder saving requires Chrome or Edge on HTTPS. Use Download instead.');
  if(!(blob instanceof Blob)||!blob.size)throw Error('No completed MP4 is available to save.');
  // The browser asks on a direct click; permission never grants access to
  // unrelated folders. The handle remains in memory only for this session.
  if(!directory)directory=await window.showDirectoryPicker({
    id:'forge-video-output',mode:'readwrite',startIn:'downloads'
  });
  if(!directory||directory.kind!=='directory')throw Error('A folder was not selected.');
  if(typeof directory.queryPermission==='function' &&
     await directory.queryPermission({mode:'readwrite'})!=='granted'){
    directory=null;
    throw Error('Folder write access was not granted. Use Download instead.');
  }
  const safe=safeDownloadName(sourceName);
  for(let i=0;i<100;i++){
    const name=candidateName(safe,i);
    if(await exists(directory,name))continue;
    // File System Access has no universally supported atomic create-exclusive;
    // check again before opening, never deliberately overwrite any file.
    const handle=await directory.getFileHandle(name,{create:true});
    let writer=null;
    try{
      writer=await handle.createWritable({keepExistingData:false});
      await blob.stream().pipeTo(writer);
      writer=null;
      const saved=await handle.getFile();
      if(saved.size!==blob.size)throw Error('Incomplete folder save; original MP4 remains downloadable.');
      return {name,folder:directory.name};
    }catch(error){
      try{await writer?.abort();}catch{}
      // Only remove the new destination attempted by this action.
      try{await directory.removeEntry(name);}catch{}
      throw error;
    }
  }
  throw Error('Too many conflicting filenames in this folder. Use Download instead.');
}
