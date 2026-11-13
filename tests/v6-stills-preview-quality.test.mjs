import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import v6 from '../src/js/tools/v6-stills-engine.js';

globalThis.document={getElementById:()=>null};
const {default:{Stills}}=await import('../src/js/tools/video-stills.js');

function createVideo(name){
  return {name,frames:[
    {num:1,type:'still',checked:false,blob:{id:name+'-blurred'},url:'blob:frame1'},
    {num:2,type:'still',checked:false,blob:{id:name+'-clear'},url:'blob:frame2'},
    {num:3,type:'still',checked:false,blob:{id:name+'-portrait'},url:'blob:frame3'}
  ]};
}
function makeTool(){
  return Object.assign(Object.create(Stills),{
    collection:{a:createVideo('ad-a'),b:createVideo('ad-b')},
    currentId:'a'
  });
}

test('manual selection does not discard blurry, low-content or portrait captures',()=>{
  const t=makeTool(),frames=t.collection.a.frames;
  assert.equal(frames.length,3);
  assert.ok(frames.every(f=>f.checked===false));
  assert.deepEqual(t.selectedGroups(),[]);
  frames[0].checked=true;
  assert.deepEqual(t.selectedGroups().map(g=>g.frames[0].num),[1],
    'the user can deliberately retain a blurry frame');
  frames[0].checked=false;
  frames[2].checked=true;
  assert.deepEqual(t.selectedGroups().map(g=>g.frames[0].num),[3],
    'the user can select portrait frames without being blocked by quality rules');
});

test('manual selection changes do not affect the next imported video',()=>{
  const t=makeTool();
  t.collection.a.frames[1].checked=true;
  assert.ok(t.collection.b.frames.every(f=>f.checked===false));
  t.currentId='b';
  t.collection.b.frames[0].checked=true;
  assert.deepEqual(t.selectedGroups().map(g=>g.name),['ad-a','ad-b']);
  t.collection.a.frames[1].checked=false;
  assert.deepEqual(t.selectedGroups().map(g=>g.name),['ad-b']);
});

test('empty per-video and combined exports must require user selection',async()=>{
  const errors=[];globalThis.UI={showError:message=>errors.push(message)};
  const t=makeTool();
  await t.downloadSelected();
  await t.downloadAll();
  assert.equal(errors.length,2);
  assert.ok(errors.every(m=>/Select at least one frame/i.test(m)));
});

test('only V6 extraction helpers remain in the runtime',()=>{
  const src=fs.readFileSync(new URL('../src/js/tools/video-stills.js',import.meta.url),'utf8');
  assert.deepEqual(Object.keys(v6).sort(),[
    'frameDifference','pickProbe','probePlan','sampleFingerprint'
  ]);
  assert.match(src,/CTKV6\.probePlan\(/);
  assert.match(src,/CTKV6\.pickProbe\(/);
  assert.doesNotMatch(src,/CTKV6\.curate\(|Reset Smart Selection|smartSelected|detailFingerprint\(/);
});
