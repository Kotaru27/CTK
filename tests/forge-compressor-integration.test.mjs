import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('tool route 08 becomes compressor and retains eight homepage routes',()=>{
  const html=read('../index.html');
  assert.match(html,/id="nav-yt-helper"[^>]*title="Video Compressor"/);
  assert.match(html,/class="home-card home-item tool-video"[^>]*aria-label="Open Video Compressor"/);
  assert.match(html,/class="forge-compressor-frame"[^>]*src="\.\/compressor\/index\.html\?v=background-20261022"/);
  assert.equal((html.match(/class="home-card home-item/g)||[]).length,8);
});
/* Added compressor surface is a deliberate overlay; legacy IDs remain in the baseline. */
test('legacy downloader is visually hidden while the compressor loads same-origin',()=>{
  const css=read('../src/css/experience/forge-compressor-frame.css');
  assert.match(css,/#section-yt-helper > :not\(\.forge-compressor-surface\)\{display:none!important\}/);
  assert.match(css,/\.forge-compressor-frame/);
});
test('root and dist publish the same compressor logic and style',()=>{
  const source=read('../compressor/index.html');
  assert.equal(source,read('../dist/compressor/index.html'));
  assert.match(source,/src="\.\/app\.mjs\?v=13"/);
  assert.match(source,/href="\.\/forge-theme\.css\?v=1"/);
  for(const p of ['app.mjs','codec.mjs','probe.mjs','native-encode.mjs','native-worker.mjs','native-worker-bridge.mjs','save-folder.mjs','video-worker.js','zip.mjs','styles.css','forge-theme.css'])
    assert.equal(read('../compressor/'+p),read('../dist/compressor/'+p),p);
  assert.match(read('../dist/creative-tools-standalone.html'),/src="\.\/compressor\/index\.html\?v=background-20261022"/);
});
test('what’s new announces the replacement without defeating opt-out',()=>{
  const html=read('../index.html');
  const js=read('../src/js/presentation/forge-whats-new.js');
  assert.match(html,/Video Compressor · New/);
  assert.match(html,/Video Downloads is now Video Compressor/);
  assert.match(js,/forge_whatsnew_dismissed_2026_v3/);
});

test('development server serves the native ESM compressor entrypoint as JavaScript',()=>{
  const dev=read('../scripts/dev.mjs');
  assert.match(dev,/'\.mjs':'text\/javascript'/);
  assert.match(dev,/'\.wasm':'application\/wasm'/);
});
