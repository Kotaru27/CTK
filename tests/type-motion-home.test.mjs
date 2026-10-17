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
 const rules=[...css.matchAll(/@keyframes\s+([\w-]+)\s*\{\s*from\s*\{([^}]*)\}\s*to\s*\{([^}]*)\}\s*\}/g)];
 assert.equal(rules.length,(css.match(/@keyframes/g)||[]).length);
 assert.ok(rules.every(r=>!/\bfilter\s*:|\bwidth\s*:|\bheight\s*:|\bblur\(/.test(r[2]+r[3])));
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

test("workspace text scale is explicitly defined and storyboard help stays centered",()=>{
 assert.match(css,/--ctk-type-xs:11px/);
 assert.match(css,/--ctk-type-sm:12\.5px/);
 assert.match(css,/#storyPreview:has\(> span\.text-muted\)::before/);
 assert.match(css,/#storyPreview:has\(> span\.text-muted\)::after/);
 assert.match(css,/transform:translateX\(-50%\)!important/);
 assert.match(css,/#section-stills-boards \.label-header/);
});
test("one stylesheet handles focused tool feedback and reduced-motion entrances",()=>{
 assert.match(css,/ctk-header-settle/);
 assert.match(css,/ctk-body-arrive/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/:focus-visible/);
});
