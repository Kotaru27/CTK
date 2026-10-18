import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('src/js/tools/storyboard.js');
const bundle=read('dist/js/app.js');
const standalone=read('dist/creative-tools-standalone.html');
const css=read('src/css/experience/forge-unified-workspaces.css');

test('Grid Board includes real filenames and semantic reorder/remove buttons',()=>{
 for(const fragment of ['item.file?.name','name.textContent = filename','name.title = filename',
  'button.setAttribute("aria-label",action.name + " " + filename)',
  'button.onclick = () => this.moveImage(index, action.direction)',
  'button.onclick = () => this.removeImage(index)',
  'index + action.direction >= this.active.images.length']){
  assert.ok(source.includes(fragment),'missing component behavior '+fragment);
 }
 assert.ok(source.includes('list.replaceChildren()'));
});
test('Project switch and deletion are two accessible native buttons',()=>{
 for(const fragment of ['"story-project-switch"','"story-project-delete"',
  '"aria-current", active ? "true" : "false"',
  'open.onclick = () => this.switchProject(project.id)',
  'this.deleteProject(project.id)','tabs.replaceChildren()']){
  assert.ok(source.includes(fragment),'missing project behavior '+fragment);
 }
});
test('Story component implementation is identical in source, Pages and standalone',()=>{
 for(const [a,b] of [['          renderTabs() {','          deleteProject(id) {'],
  ['          updateList() {','          moveImage(idx, dir) {']]){
  const part=s=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
  assert.ok(part(source).length>650);
  assert.equal(part(source),part(bundle));
  assert.equal(part(source),part(standalone));
 }
 const d=read('dist/css/forge-unified-workspaces.css');
 assert.equal(css,d);
 assert.ok(standalone.includes('<style id="forge-unified-workspaces-styles">'+css+'</style>'));
});
test('Asset and project styling remains inside Storyboard workspace, preserves canvas size',()=>{
 for(const selector of ['#storyProjectTabs > .story-project-pill',
  '.story-project-switch','.story-project-delete','.story-asset-row',
  '.story-asset-thumb','.story-asset-filename','.story-asset-action']){
  assert.ok(css.includes(selector),'missing storyboard CSS '+selector);
 }
 const tail=css.slice(css.indexOf('/* STORYBOARD / 2026.10'));
 for(const banned of ['#storyPreview canvas','grid-template-columns:repeat','max-width:100vw',
   'position:fixed','object-fit:contain','backdrop-filter']){
  assert.ok(!tail.includes(banned),'unexpected storyboard layout change '+banned);
 }
});

test('Filmstrip reuses named, keyboard-accessible rows without changing rendering',()=>{
 const filmstrip=read('src/js/tools/storyboard-filmstrip.js');
 const bundle=read('dist/js/app.js');
 const standalone=read('dist/creative-tools-standalone.html');
 for(const fragment of ['list.replaceChildren()', 'row.className = "story-asset-row"',
   'name.textContent = filename','button.setAttribute("aria-label", action.name + " " + filename)',
   'button.disabled = index + action.direction < 0',
   'button.onclick = () => this.moveImage(index, action.direction)',
   'button.onclick = () => this.removeImage(index)']){
   assert.ok(filmstrip.includes(fragment),'Filmstrip row missing '+fragment);
 }
 const start='          updateList() {\n            const list = this.els.list;\n            const countBadge = this.els.countBadge;';
 const end='          draw() {';
 const part=s=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));
 assert.ok(part(filmstrip).length>1300);
 assert.equal(part(filmstrip),part(bundle));
 assert.equal(part(filmstrip),part(standalone));
 for(const fragment of [':is(#stillsTabContentStory,#stillsTabContentFilmstrip)',
   ':is(#storyFileList,#filmstripFileList)', '#stillsTabContentFit .fit-source-status',
   '#stillsTabContentFit #fitStatement', '#stillsTabContentFit .fit-render-status']){
   assert.ok(css.includes(fragment),'missing storyboard styling '+fragment);
 }
});
