import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const markup = read('src/html/forge-approved-home.html');
const js = read('src/js/presentation/forge-approved-swap.js');
const css = read('src/css/experience/forge-approved-swap.css');
const index = read('index.html');

test('approved home uses one green header and the existing Whats new dialog trigger', () => {
  assert.match(markup, /id="forgeApprovedUpdatesMount"/);
  assert.match(markup, /class="home-nav-right"[\s\S]*?id="forgeApprovedUpdatesMount"[\s\S]*?id="replay"/);
  assert.match(js, /forgeApprovedUpdatesMount'\)\.append\(d\.getElementById\('forgeWhatsNewTrigger'\)\)/);
  assert.match(css, /body\.forge-swap-ready:not\(\.tool-active\) > \.header\{display:none!important\}/);
  assert.doesNotMatch(css, /body\.forge-swap-ready > \.header\{display:none/);
  // The HTML keeps one trigger, and the approved shell only supplies its mount.
  assert.equal((index.match(/id="forgeWhatsNewTrigger"/g) || []).length, 1);
});

test('shared intro reveals the full-size title with staggered character masks and replays cleanly', () => {
  assert.match(js, /function prepareWordmark\(\)/);
  assert.match(js, /\.\.\.'The Forge'\]\.forEach\(\(character,i\)/);
  assert.match(js, /prepareWordmark\(\);[\s\S]*?intro\.classList\.remove\('forge-swap-releasing'/);
  assert.match(js, /intro\.classList\.add\('forge-intro-ready','forge-swap-title-playing'\)/);
  assert.match(js, /wordmark\.textContent='The Forge'/);
  assert.match(css, /forge-swap-glyph-reveal 590ms/);
  assert.match(css, /forge-swap-glyph-reveal 590ms[\s\S]*?var\(--glyph-delay\)/);
  assert.match(css, /forge-cine-wordmark\{font-size:clamp\(58px,7\.2vw,118px\)!important/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('home and tool workspaces cannot render together after navigation', () => {
  assert.match(css, /body\.forge-swap-ready:not\(\.tool-active\) #view-home:not\(\.hidden\)\{display:block!important/);
  assert.match(css, /body\.forge-swap-ready #view-home\.hidden,[\s\S]*?body\.forge-swap-ready\.tool-active #view-home\{display:none!important\}/);
  assert.match(css, /body\.forge-swap-ready:not\(\.tool-active\) #view-app\{display:none!important\}/);
  assert.match(css, /body\.forge-swap-ready:not\(\.tool-active\) #mainSidebar\{display:none!important\}/);
  assert.doesNotMatch(css, /body\.forge-swap-ready #view-home\{display:block!important/);
  assert.match(read('src/js/core/prelude.js'), /_openTool\(id, mode\)[\s\S]*?this\.els\.viewHome\.classList\.add\("hidden"\)/);
});
