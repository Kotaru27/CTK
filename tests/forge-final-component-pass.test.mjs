import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const css = read('src/css/experience/forge-unified-workspaces.css');
const bundle = read('dist/js/app.js');
const standalone = read('dist/creative-tools-standalone.html');

test('all eight existing tools have scoped populated-component refinements', () => {
  const finish = css.slice(css.indexOf('/* THE FORGE / FINAL EIGHT-TOOL COMPONENT PASS'));
  assert.ok(finish.length > 2500, 'final component pass missing');
  for (const selector of [
    '#section-logo #logoGrid .logo-card-item .card-fname-lbl',
    '#section-pdf #pdfStacksContainer .stack-title',
    '#pdfTabContentSplit #splitGrid .split-file-name',
    '#stillsDetailOverlay #stillsOverlayGrid>.vs-frame-row',
    '#stillsTabContentStory #storyBoardControls',
    '#stillsTabContentFilmstrip #filmstripFileList',
    '#section-adlinks #adlinksTabContentGen .adgen-output-card',
    '#section-adlinks #adlinksTabContentDownloader #adDlTableContainer tbody',
    '#section-yt-helper #ytMetadataContent'
  ]) assert.ok(finish.includes(selector), 'missing actual tool component ' + selector);
  for (const dangerous of ['grid-template-columns:', 'position:fixed', 'position:absolute',
    'max-width:100vw', 'transform:scale', 'filter:blur', 'object-fit:',
    'canvas {', 'pointer-events:none!important', '@keyframes']) {
    assert.ok(!finish.includes(dangerous), 'unexpected geometry/process override ' + dangerous);
  }
  assert.equal(read('dist/css/forge-unified-workspaces.css'), css);
  assert.ok(standalone.includes('<style id="forge-unified-workspaces-styles">' + css + '</style>'));
});

test('Splitter filenames are text-only; completion status follows the actual processing state', () => {
  const source = read('src/js/tools/image-splitter.js');
  for (const snippet of [
    'card.querySelector(".split-file-name").textContent = item.file.name',
    'card.dataset.ready = item.splitBlobs.length ? "done" : "ready"',
    'item.card.dataset.ready = "done"',
    'item.checked = e.target.checked',
    'this.els.dlBtn.disabled = !this.items.some'
  ]) {
    assert.ok(source.includes(snippet), 'splitter component missing ' + snippet);
    assert.ok(bundle.includes(snippet));
    assert.ok(standalone.includes(snippet));
  }
  assert.ok(!source.includes('>${item.file.name}</div>'));
});

test('Logo, PDF and video collection cards expose the original inspect action to keyboard users', () => {
  for (const [path, action, label] of [
    ['src/js/tools/logo-resizer.js','previewArea.click();','Open Focus Mode for '],
    ['src/js/tools/pdf-to-image.js','stack.click();','Inspect PDF '],
    ['src/js/tools/video-stills.js','stack.click();','Inspect stills from ']
  ]) {
    const s = read(path);
    for (const snippet of ['.tabIndex = 0', 'setAttribute?.("role", "button")',
      'event.key === "Enter" || event.key === " "', action, label]) {
      assert.ok(s.includes(snippet), path + ': missing ' + snippet);
      assert.ok(bundle.includes(snippet), 'bundle missing ' + snippet);
      assert.ok(standalone.includes(snippet), 'standalone missing ' + snippet);
    }
  }
  assert.ok(read('src/js/tools/pdf-to-image.js').includes('stack.querySelector(".stack-title").textContent = file.name'));
  assert.ok(read('src/js/tools/video-stills.js').includes('stack.querySelector(".stack-title").textContent = name'));
});

test('Video Stills frame preview is keyboard-operable independently of download checkboxes', () => {
  const source = read('src/js/tools/video-stills.js');
  for (const snippet of [
    'card.classList.add("vs-frame-row")', 'card.setAttribute?.("role", "group")',
    'card.setAttribute?.("aria-current", "false")',
    'card.setAttribute?.("aria-current", "true")',
    'event.target === card', 'card.click();',
    'card.querySelector(".detail-check").onchange'
  ]) {
    assert.ok(source.includes(snippet), 'frame-list component missing ' + snippet);
    assert.ok(bundle.includes(snippet));
    assert.ok(standalone.includes(snippet));
  }
});
