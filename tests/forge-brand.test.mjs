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
test('first opening animates the actual homepage, preserves skip and first-run semantics',()=>{
 assert.match(index,/id="forgeIntro"/);
 assert.match(index,/id="forgeIntroSkip"/);
 assert.match(brandJS,/sessionStorage\.getItem\('forge_intro_seen_v4'\)/);
 assert.match(brandJS,/sessionStorage\.setItem\('forge_intro_seen_v4'/);
 assert.match(brandJS,/prefers-reduced-motion/);
 assert.match(brandJS,/Escape/);
 assert.match(brandJS,/document\.fonts\.load/);
 assert.match(brandJS,/destination\.animate\(frames/);
 assert.match(brandJS,/function progress\(t\)/);
 assert.match(brandJS,/forge:intro-complete/);
 assert.match(brandJS,/clearTimeout\(safety\)/);
 assert.doesNotMatch(brandJS,/mark\.animate\(/);
 assert.match(brandCss,/\.forge-intro\{[\s\S]*?inset:auto 36px 24px auto/);
 assert.match(brandCss,/\.forge-intro::before,\.forge-intro::after\{content:none!important/);
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
    assert.doesNotMatch(page,/class="forge-hero-tagline"/);
  }
  assert.match(brandCss,/background:transparent/);
  assert.match(brandCss,/border-top:1px solid var\(--forge-hero-line\)/);
  assert.doesNotMatch(brandCss,/forge-hero::before|forge-hero::after/);
  assert.doesNotMatch(brandCss,/\.forge-hero\s*\{[^}]*linear-gradient/);
});
test('real Kola heading has no opaque splash, wipe or second moving text copy',()=>{
 assert.match(index,/class="forge-hero-name" id="forgeHeroName">The Forge/);
 assert.doesNotMatch(index,/class="forge-intro-glyphs"/);
 assert.doesNotMatch(brandCss,/@keyframes forge-mask-unveil|@keyframes forge-draw-letter/);
 assert.doesNotMatch(brandCss,/\.forge-intro-type::before\s*\{/);
 assert.match(brandCss,/\.forge-intro\{[\s\S]*?background:transparent/);
 assert.match(brandCss,/\.forge-intro-type,\.forge-intro-label\{display:none!important/);
 assert.match(brandJS,/Math\.exp\(-omega\*t\)/);
 assert.match(brandJS,/translate3d\(0,/);
 assert.doesNotMatch(brandJS,/\.createRange\(|clipPath/);
});
test('intro and home avoid expensive animated backdrops and layout font changes',()=>{
 assert.doesNotMatch(brandCss,/\.forge-intro::before\s*\{\s*content:""/);
 assert.doesNotMatch(brandCss,/transition:background-color \.82s/);
 assert.match(brandCss,/min-height:clamp\(322px,27vw,392px\)/);
 assert.match(brandCss,/\.home-card:hover\s*\{\s*box-shadow:none!important/);
 assert.match(brandCss,/\.home-card-go[\s\S]*?transform:translate3d/);
 assert.match(brandJS,/duration:1580/);
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
