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
test('all eight cards preserve exact structure and routes except two intentional Logo Resizer texts',()=>{
  assert.equal(cards(baseline).length,8);
  const normalize=s=>s
    .replaceAll('aria-label="Open Logo Resizer"','aria-label="Open Logo Workspace"')
    .replaceAll('<h2 class="home-card-title">Logo Resizer</h2>','<h2 class="home-card-title">Logo Workspace</h2>');
  assert.deepEqual(cards(index).map(normalize),cards(baseline));
  assert.deepEqual(cards(standalone).map(normalize),cards(baseline));
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
test('light-only release hides appearance toggle and ignores legacy dark selection',()=>{
  const core = read('../src/js/core/prelude.js');
  assert.match(core,/initTheme\(\)\s*\{[\s\S]*?document\.body\.classList\.add\("light-mode"\)/);
  assert.match(core,/toggleTheme\(\)\s*\{[\s\S]*?document\.body\.classList\.add\("light-mode"\)/);
  assert.doesNotMatch(core,/Core\.AppState\.save\("theme", isLight \? "light" : "dark"\)/);
  assert.match(brandCss,/#themeToggleBtn\s*\{display:none!important;/);
  assert.match(index,/<body class="light-mode">/);
  assert.doesNotMatch(index,/localStorage\.getItem\("cts_theme"\)==="dark"/);
  assert.doesNotMatch(standalone,/localStorage\.getItem\("cts_theme"\)==="dark"/);
});
test('cinematic Forge intro is bounded, skippable and staged before the welcome dialog',()=>{
 assert.match(index,/id="forgeIntro"/);
 assert.match(index,/id="forgeIntroSkip"/);
 assert.match(brandJS,/sessionStorage\.getItem\('forge_intro_suppress'\)/);
 assert.match(brandJS,/prefers-reduced-motion/);
 assert.match(brandJS,/Escape/);
 assert.match(brandJS,/document\.fonts\?\.load/);
 assert.match(brandJS,/function type\(index\)/);
 assert.match(brandJS,/forge:intro-complete/);
 assert.match(brandJS,/schedule\(finish,380\)/);
 assert.match(brandJS,/schedule\(finish,6000\)/);
 assert.match(brandJS,/gate\?\.beginWelcome\?\.\(\)/);
 assert.match(brandJS,/clearTimeout\(id\)/);
 assert.doesNotMatch(brandJS,/mark\.animate\(/);
 assert.match(brandCss,/\.forge-intro\.forge-intro-ready\{[\s\S]*?position:fixed;inset:0/);
 assert.match(brandCss,/html\.forge-welcome-pending body\.forge-opening::after/);
 assert.match(brandCss,/@media\(prefers-reduced-motion:reduce\)/);
});
test('card polish is strictly visual and confined to the home page',()=>{
  const cssRulesOnly = brandCss.replace(/\/\*[\s\S]*?\*\//g,'');
  assert.doesNotMatch(cssRulesOnly,/\.tool-section\b|#view-app\b|\.editor-layout\b/);
  assert.match(cssRulesOnly,/#view-home \.combined-home-grid > \.home-card/);
  assert.match(cssRulesOnly,/\.home-card:focus-visible/);
  assert.doesNotMatch(brandJS,/home-card|\.tool-section|openTool/);
});

test('editorial hero is light-first, free of the old dark banner and circular decoration',()=>{
  for (const page of [index,standalone]) {
    assert.match(page,/class="forge-hero-middle"/);
    assert.match(page,/class="forge-hero-aside"/);
    assert.match(page,/class="forge-after-hero"/);
    assert.doesNotMatch(page,/class="forge-hero-index"/);
    assert.match(page,/class="forge-hero-tagline">Import/);
    assert.match(page,/class="forge-intro-steps" role="text"/);
  }
  assert.match(brandCss,/#view-home \.forge-hero-aside\{/);
  assert.match(brandCss,/border-left:2px solid rgba\(43,101,69,\.42\)/);
  assert.match(brandCss,/\.forge-intro-step-part\.is-visible/);
  assert.match(brandCss,/background:transparent/);
  assert.match(brandCss,/border-top:1px solid var\(--forge-hero-line\)/);
  assert.doesNotMatch(brandCss,/forge-hero::before|forge-hero::after/);
  assert.doesNotMatch(brandCss,/\.forge-hero\s*\{[^}]*linear-gradient/);
});
test('real Kola heading keeps native character geometry and a single kinetic echo',()=>{
 assert.match(index,/class="forge-hero-name" id="forgeHeroName">The Forge/);
 assert.doesNotMatch(index,/class="forge-intro-glyphs"/);
 assert.doesNotMatch(brandCss,/@keyframes forge-mask-unveil|@keyframes forge-draw-letter/);
 assert.match(brandCss,/\.forge-intro\.forge-intro-ready \.forge-intro-type\{/);
 assert.match(brandCss,/#forgeIntroWordmark::before\{/);
 assert.match(brandCss,/content:attr\(data-full-name\)/);
 assert.match(brandCss,/clip-path:none!important/);
 assert.match(brandJS,/function kineticArrival\(char,index\)/);
 assert.match(brandJS,/translate3d\(/);
 assert.doesNotMatch(brandJS,/\.createRange\(|clipPath/);
});
test('intro and home avoid expensive animated backdrops and layout font changes',()=>{
 assert.doesNotMatch(brandCss,/\.forge-intro::before\s*\{\s*content:""/);
 assert.doesNotMatch(brandCss,/transition:background-color \.82s/);
 assert.match(brandCss,/min-height:clamp\(322px,27vw,392px\)/);
 assert.match(brandCss,/\.home-card:hover\s*\{\s*box-shadow:none!important/);
 assert.match(brandCss,/\.home-card-go[\s\S]*?transform:translate3d/);
 assert.match(brandJS,/duration:245/);
 assert.match(brandJS,/schedule\(finish,380\)/);
 assert.doesNotMatch(brandJS,/fontSize|backdropFilter/);
});
test('executive hero states one purpose, one description, then tool selection',()=>{
  for(const page of [index,standalone]){
    assert.match(page,/EIGHT TOOLS\. ONE CREATIVE WORKSPACE\./);
    assert.match(page,/Resize images, convert PDFs, capture stills and build storyboards/);
    assert.match(page,/class="forge-after-hero"><strong>Choose a tool<\/strong>/);
    assert.doesNotMatch(page,/Everything at your fingertips/);
    assert.doesNotMatch(page,/From working files to finished assets/);
    assert.doesNotMatch(page,/class="forge-hero-bottom"/);
    assert.doesNotMatch(page,/class="forge-hero-counter"/);
    assert.match(page,/aria-label="Open Logo Resizer"/);
    assert.match(page,/>Logo Resizer<\/h2>/);
    assert.match(page,/<span class="nav-item-text">Ad Downloader<\/span>/);
  }
  assert.match(brandCss,/\.header::after/);
  assert.match(brandCss,/content:none!important/);
  assert.match(brandCss,/body:has\(#view-home:not\(\.hidden\)\) \.header/);
  assert.match(brandCss,/\.home-card-num/);
});
