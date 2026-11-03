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
    .replaceAll('<h2 class="home-card-title">Logo Resizer</h2>','<h2 class="home-card-title">Logo Workspace</h2>')
    .replaceAll('aria-label="Open Video Compressor"','aria-label="Open Video Downloads"')
    .replaceAll('<h2 class="home-card-title">Video Compressor</h2>','<h2 class="home-card-title">Video Downloads</h2>')
    .replaceAll('<p class="home-card-desc">Compress videos to a chosen size.</p>','<p class="home-card-desc">Create video download commands.</p>')
    .replaceAll('<div class="video-command"><span>›</span><b>compress</b>','<div class="video-command"><span>›</span><b>download</b>');
  assert.deepEqual(cards(index).map(normalize),cards(baseline));
  assert.deepEqual(cards(standalone).map(normalize),cards(baseline));
});
test('brand name and Kola are integrated in both releases',()=>{
  for (const s of [index,standalone]) {
    assert.match(s,/<title>The Forge<\/title>/);
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
test('cinematic Forge intro is bounded, skippable, and hands off to the real home',()=>{
 assert.match(index,/id="forgeIntro"/);
 assert.match(index,/id="forgeIntroSkip"/);
 assert.match(index,/id="forgeCineCounter"/);
 assert.match(brandJS,/sessionStorage\.getItem\('forge_intro_suppress'\)/);
 assert.match(brandJS,/prefers-reduced-motion/);
 assert.match(brandJS,/Escape/);
 assert.match(brandJS,/document\.fonts\?\.load/);
 assert.match(brandJS,/forge:intro-complete/);
 assert.match(brandJS,/schedule\(handoff,2750\)/);
 assert.match(brandJS,/schedule\(finish,1160\)/);
 assert.match(brandJS,/schedule\(finish,6200\)/);
 assert.match(brandJS,/forge-cine-home-reveal/);
 assert.match(brandJS,/gate\?\.endWelcome\?\.\(\)/);
 assert.match(brandJS,/clearTimeout\(id\)/);
 assert.match(brandCss,/\.forge-intro\.forge-intro-ready\.forge-cinematic\{/);
 assert.match(brandCss,/forge-cine-curtain/);
 assert.match(brandCss,/@media\(prefers-reduced-motion:reduce\)/);
});\n
test('card polish is strictly visual and confined to the home page',()=>{
  const cssRulesOnly = brandCss.replace(/\/\*[\s\S]*?\*\//g,'');
  assert.doesNotMatch(cssRulesOnly,/\.tool-section\b|#view-app\b|\.editor-layout\b/);
  assert.match(cssRulesOnly,/#view-home \.combined-home-grid > \.home-card/);
  assert.match(cssRulesOnly,/\.home-card:focus-visible/);
  assert.doesNotMatch(brandJS,/home-card|\.tool-section|openTool/);
});

test('editorial hero stays intact and intro uses all eight named pictogram tiles',()=>{
 for (const page of [index,standalone]) {
  assert.match(page,/class="forge-hero-middle"/);
  assert.match(page,/class="forge-hero-aside"/);
  assert.match(page,/class="forge-after-hero"/);
  assert.match(page,/class="forge-hero-tagline">Import/);
  const scene=page.split('id="forgeIntro"')[1]?.split('id="forgeWhatsNew"')[0]||'';
  assert.equal((scene.match(/class="forge-cine-piece"/g)||[]).length,8);
  assert.equal((scene.match(/<svg viewBox="0 0 24 24"/g)||[]).length,8);
  for(const name of ['Logo Resizer','PDF to Image','Image Splitter','Video Stills',
    'Storyboard','Link Gen','Ad Downloader','Video Compressor'])
   assert.ok(scene.includes('title="'+name+'"'),'Missing iconic tile: '+name);
 }
 assert.match(brandCss,/#view-home \.forge-hero-aside\{/);
 assert.match(brandCss,/border-top:1px solid var\(--forge-hero-line\)/);
});\n
test('cinematic wordmark uses Kola while preserving the original home wordmark',()=>{
 assert.match(index,/class="forge-hero-name" id="forgeHeroName">The Forge/);
 assert.match(index,/class="forge-cine-wordmark">The Forge/);
 assert.match(brandCss,/\.forge-cine-wordmark\{/);
 assert.match(brandCss,/html\.forge-launch-fallback-kola \.forge-cine-wordmark/);
 assert.match(brandCss,/body\.forge-opening\.forge-home-arriving\.forge-cine-home-reveal #forgeHeroName/);
 assert.doesNotMatch(brandJS,/openTool|home-card|createRange/);
});\n
test('intro animates transforms and opacity, not homepage layout',()=>{
 assert.match(brandCss,/min-height:clamp\(322px,27vw,392px\)/);
 assert.match(brandCss,/\.home-card:hover\s*\{\s*box-shadow:none!important/);
 assert.match(brandCss,/@keyframes forge-cine-curtain/);
 assert.match(brandCss,/@keyframes forge-cine-piece-in/);
 assert.match(brandJS,/schedule\(handoff,2750\)/);
 assert.doesNotMatch(brandJS,/fontSize|backdropFilter|\.animate\(/);
});\n
test('executive hero states one purpose, one description, then tool selection',()=>{
  for(const page of [index,standalone]){
    assert.doesNotMatch(page,/class="forge-hero-edition"/);
    assert.doesNotMatch(page,/class="forge-hero-top"/);
    assert.match(page,/<header class="header">[\s\S]*?id="forgeWhatsNewTrigger"/);
    assert.match(page,/<link rel="icon" type="image\/svg\+xml"/);
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

test('browser favicon and install manifest have the new Forge identity',()=>{
  const icon=read('../src/branding/favicon.svg');
  const manifest=JSON.parse(read('../manifest.json'));
  assert.match(icon,/<svg[^>]*viewBox="0 0 64 64"/);
  assert.match(icon,/The Forge<\/title>/);
  assert.equal(read('../favicon.svg'),icon);
  assert.equal(read('../dist/favicon.svg'),icon);
  assert.equal(manifest.name,'The Forge');
  assert.equal(manifest.start_url,'./');
  assert.match(index,/href="\.\/favicon\.svg\?v=forge-favicon-launch-20261019"/);
  assert.match(standalone,/href="data:image\/svg\+xml,/);
  assert.match(brandCss,/\.header #forgeWhatsNewTrigger\{/);
  assert.match(brandCss,/grid-template-rows:1fr/);
});
