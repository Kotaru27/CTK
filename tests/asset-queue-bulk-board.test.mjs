import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The source-preserving modules expose plain tool methods. A minimal document
// stub allows exercising business behavior without relying on a web browser.
globalThis.document={getElementById:()=>null};
globalThis.Core={Utils:{sanitize:value=>String(value).replace(/[<>:"|?*]/g,"")} };
globalThis.CTKSharePoint={isSharePoint:()=>false,directUrl:()=>"/asset"};
const [{default:{Story}},{default:{AdDownloader}}]=await Promise.all([
  import('../src/js/tools/storyboard.js'),
  import('../src/js/tools/ad-downloader.js'),
]);

function makeStory(activeName="Board_1", populated=false){
  const active={id:1,name:activeName,images:populated?[{id:"existing"}]:[],settings:{}};
  const story=Object.assign(Object.create(Story),{
    projects:[active],active,els:{drop:{title:""}},
    switchProject(id){this.active=this.projects.find(p=>p.id===id);},
    async handleFiles(files,project=this.active,folder=""){
      const accepted=files.filter(file=>file.type.startsWith("image/")||file.type.startsWith("video/"));
      if(accepted.length){
        project.images.push(...accepted);
        if(folder && (project!==this.active||/^Board_\d+$/.test(project.name))){
          project.name=this.uniqueBoardName(folder,project);
        }
      }
      return {accepted:accepted.length,rejected:files.length-accepted.length};
    }
  });
  return story;
}
const still=(path,type="image/jpeg")=>({webkitRelativePath:path,type,name:path.split("/").at(-1)});

test("Add Assets is the only folder entry point, without extra import button",()=>{
  const source=readFileSync(new URL('../src/js/tools/storyboard.js',import.meta.url),'utf8');
  assert.match(source,/this\.els\.input\.setAttribute\("webkitdirectory", ""\)/);
  assert.match(source,/await this\.importSelection\(selected\)/);
  assert.doesNotMatch(source,/storyFolderInput|story-folder-import/);
});
test("selecting an individual ad folder names the existing empty board",async()=>{
  const story=makeStory();
  await story.importSelection([still("AD7_LIDL/frame01.jpg"),still("AD7_LIDL/frame02.jpg")]);
  assert.equal(story.projects.length,1);
  assert.equal(story.projects[0].name,"AD7_LIDL");
  assert.equal(story.projects[0].images.length,2);
});
test("one parent folder with ad subfolders generates independent boards",async()=>{
  const story=makeStory();
  await story.importSelection([
    still("Campaign/AD2/frame1.jpg"),
    still("Campaign/AD1/frame1.jpg"),
    still("Campaign/AD1/stills/frame2.png"),
    still("Campaign/AD2/stills/frame2.jpg"),
  ]);
  assert.deepEqual(story.projects.map(p=>p.name),["AD1","AD2"]);
  assert.deepEqual(story.projects.map(p=>p.images.length),[2,2]);
  assert.equal(story.active.name,"AD1");
});
test("bulk folder import does not overwrite populated boards",async()=>{
  const story=makeStory("Edited Board",true);
  const previous=story.active;
  await story.importSelection([still("Campaign/AD1/f1.jpg"),still("Campaign/AD2/f2.jpg")]);
  assert.equal(previous.name,"Edited Board");
  assert.equal(previous.images.length,1);
  assert.deepEqual(story.projects.slice(1).map(p=>p.name),["AD1","AD2"]);
});
test("duplicate folder board names get deterministic suffixes",async()=>{
  const story=makeStory("AD1",true);
  await story.importSelection([still("Campaign/AD1/frame1.jpg")]);
  assert.equal(story.projects[1].name,"AD1 2");
});
function fakeRow(){
  return {classList:{values:new Set(),add(v){this.values.add(v);}},
    style:{removeProperty(){}},title:""};
}
test("downloaded rows go below pending items and remain downloadable",()=>{
  const rows=[];
  const body={appendChild(row){
    const prior=rows.indexOf(row);if(prior!==-1)rows.splice(prior,1);rows.push(row);
  }};
  const head={style:{display:"none"}};
  globalThis.document.getElementById=id=>({
    adDlDownloadedBody:body,adDlDownloadedHeaderRow:head
  })[id];
  const queue=Object.assign(Object.create(AdDownloader),{updateBulkButton(){}});
  const entry={downloaded:false,row:fakeRow(),downloadButton:{disabled:true,textContent:"Download"}};
  queue.markDownloaded(entry);
  assert.equal(entry.downloaded,true);
  assert.equal(entry.downloadButton.textContent,"Download again");
  assert.equal(entry.downloadButton.disabled,false);
  assert.deepEqual(rows,[entry.row]);
  queue.markDownloaded(entry,true);
  assert.equal(rows.length,1);
  assert.equal(entry.downloadVerified,true);
});
test("direct asset can be downloaded a second time after being moved",async()=>{
  const body={appendChild(){}},head={style:{}};
  globalThis.document.getElementById=id=>({
    adDlDownloadedBody:body,adDlDownloadedHeaderRow:head
  })[id];
  let saved=0;
  const queue=Object.assign(Object.create(AdDownloader),{
    getAsset:async()=>({blob:{size:1024},name:"AD1.jpg"}),
    saveBlob(){saved++;},status(){},updateBulkButton(){}
  });
  const entry={url:"https://example.test/image.jpg",row:fakeRow(),downloadButton:{disabled:false,textContent:"Download"}};
  await queue.downloadFile(entry);
  await queue.downloadFile(entry);
  assert.equal(saved,2);
  assert.equal(entry.downloadButton.textContent,"Download again");
});
test("SharePoint is not marked completed until the renamer confirms it",()=>{
  const rootDocument=globalThis.document;
  globalThis.document={body:{appendChild(){}},createElement:()=>({click(){},remove(){}})};
  globalThis.CTKDownloadRenamer={
    active:()=>true,begin:()=>true,stats:()=>({renamed:0,waiting:1,failed:0})
  };
  const confirmed=[];
  const queue=Object.assign(Object.create(AdDownloader),{
    markDownloaded:(entry,verified)=>confirmed.push(verified),status(){}
  });
  const entry={url:"https://sharepoint.test/file",displayName:"AD1",downloadButton:{textContent:"Download"}};
  queue.downloadSharePoint(entry);
  assert.equal(confirmed.length,0);
  entry.renameComplete();
  assert.deepEqual(confirmed,[true]);
  globalThis.document=rootDocument;
});
