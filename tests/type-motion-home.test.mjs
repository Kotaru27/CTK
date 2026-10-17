import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(new URL(p,import.meta.url),"utf8");
const css=read("../src/css/experience/typography-motion-v3.css");
const index=read("../index.html");
const standalone=read("../dist/creative-tools-standalone.html");
test("type/motion layer is present in both builds and does not change workspaces or engine",()=>{
 assert.ok(index.includes('./dist/css/typography-motion-v3.css'));
 assert.ok(standalone.includes('<style id="ctk-type-motion-v3">'+css+'</style>'));
 assert.match(css,/#view-home \.combined-home-grid/);
 assert.match(css,/#view-app \.tool-section\.active/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/addEventListener|fetch\(|window\.open|onclick=/);
});
test("premium motion avoids blur, perpetual keyframes and content layout animation",()=>{
 const rules=css.match(/@keyframes [\w-]+\s*\{[\s\S]*?\n\}/g)||[];
 assert.ok(rules.length>=3);
 assert.ok(rules.every(r=>!/\bfilter\s*:|\bwidth\s*:|\bheight\s*:|\bblur\(/.test(r)));
 assert.ok(!css.includes('infinite'));
 assert.match(css,/translate/);
});
test("typography preserves webfont choices and improves accessibility",()=>{
 assert.match(css,/Instrument Serif/);
 assert.match(css,/Plus Jakarta Sans/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/font-synthesis: none/);
 assert.match(css,/text-wrap:balance/);
});
