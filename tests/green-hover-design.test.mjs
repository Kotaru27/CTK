import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const ad=read('../src/css/experience/ad-downloader-v2.css');
const global=read('../src/css/experience/typography-motion-v3.css');
const standalone=read('../dist/creative-tools-standalone.html');
test('Ad Downloader follows shared light studio palette and retains forest dark tokens',()=>{
 for(const value of [
   '--ad-primary:#c4ddba',
   '--ad-primary:var(--studio-accent)',
   '--ad-base:var(--studio-main)',
   '--ad-stage:var(--studio-main)',
   '--ad-surface:var(--studio-panel)',
   '--ad-surface-alt:var(--studio-raised)',
   '--ad-ink:var(--studio-title)',
   '--ad-line-strong:var(--studio-border)'
 ]) assert.ok(ad.includes(value),value);
 for(const old of ['#b7cbff','#3157bf','#101927','#d5e1ff','#0d1422']) assert.ok(!ad.includes(old),old);
 assert.ok(!ad.includes('body:has(#nav-adlinks-dl.active)'),'Ad-specific dark chrome must not override shared theme');
 assert.ok(ad.includes('body.light-mode #view-home .combined-home-grid > .home-card.tool-ads'));
 assert.ok(standalone.includes('<style id="ctk-ad-downloader-v2">'+ad+'</style>'));
});
test('Storyboard uses green surfaces and accents in both themes',()=>{
 assert.match(global,/#view-app #section-stills-boards/);
 assert.match(global,/--sb-action:#c5dbba/);
 assert.match(global,/--sb-action:#28543d/);
 assert.match(global,/--sb-focus:#367351/);
});
test('Button hover has no flash overlay, bounce, scale or shadow',()=>{
 assert.match(global,/#view-app \.liquid-btn::before/);
 assert.match(global,/transform:none!important/);
 assert.match(global,/scale:none!important/);
 assert.match(global,/box-shadow:none!important/);
 assert.match(global,/\.liquid-btn\.danger-btn:hover/);
 assert.match(global,/\.liquid-btn\.active-mode:hover/);
 assert.match(global,/prefers-reduced-motion:reduce/);
});
test('Modular build and standalone contain matching approved CSS',()=>{
 assert.equal(read('../dist/css/ad-downloader-v2.css'),ad);
 assert.equal(read('../dist/css/typography-motion-v3.css'),global);
 assert.ok(standalone.includes('<style id="ctk-type-motion-v3">'+global+'</style>'));
});
