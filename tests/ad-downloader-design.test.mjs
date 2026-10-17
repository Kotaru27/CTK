import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=name=>fs.readFileSync(new URL(name,import.meta.url),"utf8");
const css=read("../src/css/experience/ad-downloader-v2.css");
const js=read("../src/js/presentation/ad-downloader-v2.js");
const index=read("../index.html");
const standalone=read("../dist/creative-tools-standalone.html");
test("Ad downloader v2 ships in both modular and standalone releases without losing original handlers",()=>{
  assert.match(index,/ad-downloader-v2\.css/);
  assert.match(index,/ad-downloader-v2\.js/);
  assert.match(standalone,/<style id="ctk-ad-downloader-v2">/);
  assert.match(standalone,/<script id="ctk-ad-downloader-v2">/);
  for (const value of ["fix","save","copy","download"]) assert.ok(js.includes(value));
  assert.match(js,/actions\.insertBefore\(download,copy\)/);
  assert.match(js,/body\.append\(fix,save\)/);
  assert.match(js,/new MutationObserver\(enhance\)/);
  assert.match(js,/observer\.observe\(rows,\{childList:true\}\)/);
});
test("New experience is isolated to Ad Downloader and supports both themes and reduced motion",()=>{
  assert.match(css,/#section-adlinks #adlinksTabContentDownloader/);
  assert.match(css,/body\.light-mode #section-adlinks/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/:focus-visible/);
  assert.doesNotMatch(css,/(?:pointer-events:none;)\s*\/\* disable/);
});
