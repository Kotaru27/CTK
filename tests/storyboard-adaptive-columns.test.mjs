import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual renderer, not a reimplementation of its layout formula.
const prelude = fs.readFileSync(new URL('../src/js/core/prelude.js', import.meta.url), 'utf8');
const begin = prelude.indexOf('AdaptiveRenderer: ') + 'AdaptiveRenderer: '.length;
const end = prelude.indexOf(',\n        BlobRegistry:', begin);
assert.ok(begin > 20 && end > begin, 'AdaptiveRenderer is present in the source');

function makeRenderer() {
  const document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      const canvas = {width:0, height:0, draws:[]};
      canvas.getContext = () => ({
        imageSmoothingEnabled:false,
        imageSmoothingQuality:'low',
        fillStyle:'',
        fillRect(){},
        drawImage(image, ...coords) { canvas.draws.push({image, x:coords[0], y:coords[1]}); },
      });
      return canvas;
    },
  };
  return vm.runInNewContext('(' + prelude.slice(begin, end) + ')', {
    document, console:{log(){},warn(){}}
  });
}

const renderer = makeRenderer();
const frames = n => Array.from({length:n}, (_, i) => ({
  img:{naturalWidth:300,naturalHeight:200,complete:true,id:i+1}
}));
const render = (n, cols=0) => renderer.renderBoard(frames(n), {
  cols, rows:0, autoWidth:false, targetWidth:900, gap:0,
  bgColor:'#fff', fitMode:'cover'
});

test('auto Storyboard layouts 1-12: 4 makes 2x2, otherwise never above 3 columns', () => {
  for (let n=1; n<=12; n++) {
    const canvas = render(n);
    const cols = n===4 ? 2 : Math.min(3,n);
    const rows = Math.ceil(n/cols);
    const tileW = 900/cols;
    const tileH = tileW/(300/200);
    assert.equal(canvas.width,900,'width for '+n);
    assert.equal(canvas.height,Math.round(rows*tileH),'height for '+n);
    assert.equal(canvas.draws.length,n,'frame count for '+n);
    canvas.draws.forEach(({x,y},index) => {
      const row = Math.floor(index/cols);
      const inRow = Math.min(cols,n-row*cols);
      const column = index%cols;
      assert.equal(x,Math.round((column+(cols-inRow)/2)*tileW),'centered x for '+n+' frame '+index);
      assert.equal(y,Math.round(row*tileH),'ordered y for '+n+' frame '+index);
    });
  }
});

test('5 and 8 stills have a centered two-frame final row; 7 and 10 center one', () => {
  for (const n of [5,8]) {
    const c = render(n);
    assert.equal(c.draws.at(-2).x,150);
    assert.equal(c.draws.at(-1).x,450);
  }
  for (const n of [7,10]) assert.equal(render(n).draws.at(-1).x,300);
});

test('layout reflows after add/remove and honors manual 1-3 columns without allowing 4+', () => {
  assert.equal(render(4).height,600);
  assert.equal(render(5).height,400);
  assert.equal(render(12).height,800);
  assert.equal(render(13).height,1000);
  assert.equal(render(5,1).height,3000);
  assert.equal(render(5,2).height,900);
  assert.equal(render(5,8).height,400,'manual count must cap at 3');
});
