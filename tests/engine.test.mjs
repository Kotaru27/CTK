import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const coreText = fs.readFileSync(new URL('../src/js/core/prelude.js', import.meta.url), 'utf8');
const begin = coreText.indexOf('BlobRegistry: ') + 'BlobRegistry: '.length;
const end = coreText.indexOf(',\n        AppState:', begin);
assert.ok(begin > 15 && end > begin, 'BlobRegistry is present in app core');
function makeRegistry() {
  const revoked = [];
  let count = 0;
  const URLs = {
    createObjectURL: () => `blob:mock-${++count}`,
    revokeObjectURL: url => revoked.push(url),
  };
  const literal = coreText.slice(begin, end);
  const registry = vm.runInNewContext(`(${literal})`, {URL: URLs, Map});
  return {registry, revoked};
}

test('URL ownership: clearing PDF cannot revoke other tools', () => {
  const {registry, revoked} = makeRegistry();
  const pdf = registry.create({name:'p'},'pdf');
  const video = registry.create({name:'v'},'stills');
  const logo = registry.create({name:'l'},'logo');
  registry.revokeOwner('pdf');
  assert.deepEqual([...revoked], [pdf]);
  assert.deepEqual([...registry.urls], [video, logo]);
  registry.release(video);
  registry.release(video);
  assert.equal(revoked.filter(x=>x===video).length,1);
  registry.revokeAll();
  assert.equal(registry.urls.length,0);
  assert.equal(registry.owners.size,0);
  assert.deepEqual([...revoked], [pdf,video,logo]);
});

const makeEl = () => ({innerHTML:'',textContent:'',innerText:'',src:'',disabled:false,
  style:{},classList:{add(){},remove(){},contains(){return false}},
  appendChild(){}, prepend(){}, querySelector(selector){return selector==='img'?this.img:(selector==='.stack-count'?this.count:this.div)},
  img:{src:''},count:{innerText:''},div:{replaceWith(){}},
  children:[], addEventListener(){}, removeAttribute(){}, load(){},pause(){}});
let canvasCreations=0,stillEncodes=0,previewEncodes=0,storyEncodes=0;
class MockCanvas {
  constructor(){this.width=0;this.height=0;}
  getContext(){return {drawImage(){}};}
  toBlob(resolve, type, quality) { stillEncodes++; resolve({type,quality}); }
  toDataURL(){previewEncodes++;return 'data:image/jpeg;base64,preview';}
}
const dom = {getElementById:()=>makeEl(), createElement(tag){
  if(tag==='canvas'){canvasCreations++; return new MockCanvas();}
  if(tag==='video')return Object.assign(makeEl(),{videoWidth:1920,videoHeight:1080,duration:2.5,currentTime:0,readyState:4});
  return makeEl();
}};
globalThis.document=dom;
globalThis.Image=class {src='';};
globalThis.Core={BlobRegistry:makeRegistry().registry, AdaptiveRenderer:{renderBoard:()=>new MockCanvas()}};
let errors=[];
globalThis.UI={toggleEmptyState(){},showError:s=>errors.push(s)};
const {default: stillsModule}=await import('../src/js/tools/video-stills.js');
const {default: pdfModule}=await import('../src/js/tools/pdf-to-image.js');

function setupStills() {
  let sequence=0;
  const obj = Object.assign({},stillsModule.Stills,{
    collection:{},queue:[],currentId:null,_generation:0,_processing:false,
    els:{stacks:makeEl(),empty:makeEl(),dlBtn:makeEl(),xlBtn:{checked:true},storyBtn:{checked:false},storyGrid:{value:'4'},overlay:{classList:{remove(){}}}},
    async loadMetadata(){await new Promise(r=>setTimeout(r,5));},
    async seekVideo(video,time){video.currentTime=time;},
  });
  return obj;
}
async function until(predicate, ms=1500){for(let t=0;t<ms;t+=10){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error('timed out waiting for engine');}

test('Video Stills drains overlapping queue once and reuses its extraction canvas',async()=>{
  canvasCreations=stillEncodes=previewEncodes=0;
  const engine=setupStills();
  engine.handleFiles([{name:'one.mp4',type:'video/mp4'}]);
  engine.handleFiles([{name:'two.mp4',type:'video/mp4'}]);
  await until(()=>!engine._processing && !engine.queue.length);
  assert.equal(Object.keys(engine.collection).length,2);
  assert.equal(stillEncodes,4,'2 extracted frames per 2.5-second input');
  assert.equal(canvasCreations,2,'one reusable canvas per video');
  assert.equal(previewEncodes,0,'export preview reuses the encoded first frame');
  assert.equal(engine.els.dlBtn.disabled,false);
  assert.deepEqual(errors,[]);
});

test('Clearing Video Stills invalidates an in-flight run',async()=>{
  const engine=setupStills();
  engine.loadMetadata=async()=>{await new Promise(r=>setTimeout(r,20));};
  engine.handleFiles([{name:'cancel.mp4',type:'video/mp4'}]);
  engine.destroy();
  await until(()=>!engine._processing);
  assert.equal(Object.keys(engine.collection).length,0);
  assert.equal(engine.queue.length,0);
});

test('PDF conversion encodes a page once and clears only PDF URLs',async()=>{
  const engine=Object.assign({},pdfModule.Pdf,{
    collection:{},_pdfBusy:false,_pdfGeneration:0,_pendingPdfFiles:[],
    els:{stacks:makeEl(),empty:makeEl(),progress:makeEl(),cancelBtn:makeEl(),status:makeEl(),percent:makeEl(),bar:makeEl(),format:{value:'image/png'}},
  });
  const beforeOther=globalThis.Core.BlobRegistry.create({name:'logo'},'logo');
  const prev=globalThis.document.createElement;
  let pdfEncodes=0, pdfPreviewEncodes=0;
  globalThis.document.createElement=(tag)=>{
    if(tag==='canvas')return {
      width:0,height:0,getContext:()=>({}),
      toBlob(resolve,type,quality){pdfEncodes++;resolve({type,quality});},
      toDataURL(){pdfPreviewEncodes++;return 'should-not-encode';},
    };
    return makeEl();
  };
  globalThis.pdfjsLib={getDocument(){return {promise:Promise.resolve({numPages:2,getPage:async()=>({
    getViewport:()=>({width:100,height:100}),render:()=>({promise:Promise.resolve()}),
  })})};}};
  try {
    await engine.handleFiles([{name:'sample.pdf',type:'application/pdf',arrayBuffer:async()=>new ArrayBuffer(1)}]);
    assert.equal(pdfEncodes,2);
    assert.equal(pdfPreviewEncodes,0);
    assert.equal(engine._pdfBusy,false);
    assert.equal(Object.values(engine.collection)[0].pages.length,2);
    engine.destroy();
    assert.equal(globalThis.Core.BlobRegistry.urls.includes(beforeOther),true);
  } finally {globalThis.document.createElement=prev;}
});

test('Logo Resizer collapses repeated redraw requests into one frame', async () => {
  globalThis.window={pica:null};
  const {default: logoModule}=await import('../src/js/tools/logo-resizer.js');
  const pending=[];
  globalThis.requestAnimationFrame=cb=>(pending.push(cb),pending.length);
  let draws=0;
  const card={img:{complete:true,naturalWidth:100,naturalHeight:100},els:{localFontInp:{placeholder:''}},canvas:{},};
  const logo=Object.assign({},logoModule.Logo,{
    cards:[card],activeDetailIndex:null,getGlobalFont:()=>20,
    els:{width:{value:'200'},height:{value:'200'},mOverlay:{classList:{contains:()=>false}}},
    performDraw(){draws++;}
  });
  for(let n=0;n<20;n++)logo.draw(card);
  assert.equal(pending.length,1);
  pending.shift()();
  assert.equal(draws,1);
  logo.draw(card);
  assert.equal(pending.length,1,'render schedules again on a later frame');
});

test('PDF clearing during render cancels pending page publication', async () => {
  const obj=Object.assign({},pdfModule.Pdf,{
    collection:{}, _pdfBusy:false, _pdfGeneration:0,
    els:{stacks:makeEl(),empty:makeEl(),progress:makeEl(),cancelBtn:makeEl(),status:makeEl(),percent:makeEl(),bar:makeEl(),format:{value:'image/png'}},
  });
  const prev=globalThis.document.createElement;
  globalThis.document.createElement=tag=>tag==='canvas'?new MockCanvas():makeEl();
  const beforeErrors=errors.length;
  globalThis.pdfjsLib={getDocument(){return {promise:Promise.resolve({numPages:1,getPage:async()=>({
    getViewport:()=>({width:100,height:100}),
    render:()=>({promise:new Promise(r=>setTimeout(r,30))}),
  })})};}};
  try {
    const work=obj.handleFiles([{name:'slow.pdf',type:'application/pdf',arrayBuffer:async()=>new ArrayBuffer(1)}]);
    await new Promise(r=>setTimeout(r,10));
    obj.destroy();
    await work;
    assert.equal(Object.keys(obj.collection).length,0);
    assert.equal(obj._pdfBusy,false);
    assert.equal(errors.length,beforeErrors,'cancellation is not reported as a user-facing failure');
    assert.equal(globalThis.Core.BlobRegistry.urls.some(x=>globalThis.Core.BlobRegistry.owners.get(x)==='pdf'),false);
  }finally {globalThis.document.createElement=prev;}
});
