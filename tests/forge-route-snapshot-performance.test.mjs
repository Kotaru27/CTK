import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const routeCss=readFileSync(new URL('../src/css/experience/forge-video-route.css',import.meta.url),'utf8');

test('home and return transitions avoid an expensive full-root snapshot at QHD',()=>{
  assert.match(routeCss,/html\.forge-route-running\[data-forge-route-travel="home"\],[\s\S]*?html\.forge-route-running\[data-forge-route-travel="return"\]\{\s*view-transition-name:none!important;/);
  assert.match(routeCss,/forge-live-workspace-arrive 320ms/);
  assert.match(routeCss,/forge-live-home-arrive 310ms/);
  assert.match(routeCss,/@keyframes forge-live-workspace-arrive/);
  assert.match(routeCss,/@keyframes forge-live-home-arrive/);
  assert.match(routeCss,/@media\(prefers-reduced-motion:reduce\)[\s\S]*?forge-live-home-arrive[\s\S]*?animation:none!important;/);
  assert.match(routeCss,/view-transition-name: forge-workspace-title/);
  assert.match(routeCss,/view-transition-name: forge-workspace-art/);
});
