import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => fs.readFileSync(new URL(p,import.meta.url),'utf8');
const baseline = read('../source/baseline.html');
const index = read('../index.html');
const standalone = read('../dist/creative-tools-standalone.html');
const brandCss = read('../src/css/experience/forge-brand.css');
const brandJS = read('../src/js/presentation/forge-brand.js');
function cards(s) {return [...s.matchAll(/<button class="home-card\b[\s\S]*?<\/button>/g)].map(m=>m[0]);}
test('all eight original tool cards have byte-identical markup',()=>{
  assert.equal(cards(baseline).length,8);
  assert.deepEqual(cards(index),cards(baseline));
  assert.deepEqual(cards(standalone),cards(baseline));
});
test('brand name and Kola are integrated in both releases',()=>{
  for (const s of [index,standalone]) {
    assert.match(s,/<title>The Forge — Creative Tools<\/title>/);
    assert.match(s,/id="brandText">The Forge<\/span>/);
    assert.match(s,/class="forge-hero-name" id="forgeHeroName">The Forge<\/h1>/);
    assert.match(s,/api\.fontshare\.com\/v2\/css\?f\[\]=kola@400&amp;display=swap/);
    assert.doesNotMatch(s,/Toolkit%20logo\.png/);
    assert.doesNotMatch(s,/<span class="material-symbols-rounded brand-icon">/);
  }
  assert.match(index,/dist\/css\/forge-brand\.css/);
  assert.match(index,/dist\/js\/forge-brand\.js/);
  assert.match(standalone,/<style id="forge-brand-styles">/);
  assert.match(standalone,/<script id="forge-brand-intro-js">/);
});
test('light is the default and saved dark remains supported',()=>{
  const core = read('../src/js/core/prelude.js');
  assert.match(core,/Core\.AppState\.load\("theme"\) \|\| "light"/);
  assert.match(index,/localStorage\.getItem\("cts_theme"\)==="dark"/);
  assert.match(index,/<body class="light-mode">/);
  assert.match(core,/Core\.AppState\.save\("theme", isLight \? "light" : "dark"\)/);
});
test('intro is accessible, skippable, reduced-motion friendly and session scoped',()=>{
  assert.match(index,/id="forgeIntro"/);
  assert.match(brandJS,/sessionStorage/);
  assert.match(brandJS,/prefers-reduced-motion/);
  assert.match(brandJS,/Escape/);
  assert.match(index,/id="forgeIntroSkip"/);
  assert.match(brandJS,/document\.fonts/);
  assert.match(brandJS,/destination\.getBoundingClientRect/);
  assert.match(brandJS,/mark\.animate/);
  assert.match(brandJS,/flight\.onfinish = cleanup/);
  assert.match(brandJS,/3500/);
  assert.match(brandCss,/@media\(prefers-reduced-motion:reduce\)/);
});
test('new brand CSS does not target tool cards, cards remain untouched',()=>{
  const cssRulesOnly = brandCss.replace(/\/\*[\s\S]*?\*\//g,'');
  assert.doesNotMatch(cssRulesOnly,/\.home-card\b|\.home-card-art\b|\.tool-section\b|#view-app\b/);
  assert.doesNotMatch(brandJS,/home-card|\.tool-section|openTool/);
});

test('editorial hero is light-first, free of the old dark banner and circular decoration',()=>{
  for (const page of [index,standalone]) {
    assert.match(page,/class="forge-hero-middle"/);
    assert.match(page,/class="forge-hero-aside"/);
    assert.match(page,/class="forge-hero-manifesto"/);
    assert.match(page,/class="forge-after-hero"/);
    assert.doesNotMatch(page,/class="forge-hero-index"/);
    assert.doesNotMatch(page,/class="forge-hero-tagline"/);
  }
  assert.match(brandCss,/background:transparent/);
  assert.match(brandCss,/border-top:1px solid var\(--forge-hero-line\)/);
  assert.doesNotMatch(brandCss,/forge-hero::before|forge-hero::after/);
  assert.doesNotMatch(brandCss,/\.forge-hero\s*\{[^}]*linear-gradient/);
});
test('intro constructs Kola lettering rather than only fading a full wordmark',()=>{
  assert.match(index,/class="forge-intro-outline"/);
  assert.match(index,/class="forge-intro-fill"/);
  assert.match(brandCss,/@keyframes forge-draw-letter/);
  assert.match(brandCss,/-webkit-text-stroke:/);
  assert.match(brandCss,/\.forge-intro--handoff/);
  assert.match(brandJS,/forge-home-arriving/);
  assert.match(brandJS,/prefers-reduced-motion/);
  assert.match(brandJS,/forge_intro_seen_v2/);
});
