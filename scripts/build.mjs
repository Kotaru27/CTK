import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const save=(p,s)=>{const dest=path.join(root,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,s)};
const baseline=read('source/baseline.html');const cfg=JSON.parse(read('scripts/source-map.json'));
const manifest=JSON.parse(read('src/css/order.json'));
const cache={};
for(const [owner,filepath] of Object.entries(cfg.cssPaths)){
  const source=read(filepath), re=/\/\* CTK_RUN_(\d{4})_START \*\/\n([\s\S]*?)\n\/\* CTK_RUN_\1_END \*\//g;
  const runs={};for(const m of source.matchAll(re))runs[m[1]]=m[2];cache[owner]=runs;
}
const css=manifest.map(({id,owner})=>{if(!(id in cache[owner]))throw Error(`CSS section missing ${owner}/${id}`);return cache[owner][id]}).join('');
const expectedCss=baseline.match(/<style>([\s\S]*?)<\/style>/)?.[1];if(css!==expectedCss)throw Error('CSS bytes differ from verified source');
const toolJS=cfg.jsToolPaths.map(file=>{const s=read(file);const m=s.match(/^\/\*[^\n]*\*\/\nexport default \{\n([\s\S]*?)\n\};\n$/);if(!m)throw Error('Unexpected tool module structure: '+file);return m[1]}).join('');
const main=read('src/js/core/sharepoint-graph.js')+'\n'+read('src/js/core/download-rename.js')+'\n'+read('src/js/core/prelude.js')+toolJS+read('src/js/core/post-tools.js')+read('src/js/tools/video-downloads.js')+read('src/js/core/initialize.js');
const originals=[...baseline.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src='));
if(originals.length!==5)throw Error('Unexpected number of original scripts');
// The original baseline stays immutable for output/visual comparison.
// Engine changes are permitted only in modular source; shared CSS and presentation scripts remain identical.
for(let i=1;i<5;i++)if(read(cfg.presentation[i-1])!==originals[i][2])throw Error('Presentation JS differs: '+i);
let output=baseline.replace(/<style>[\s\S]*?<\/style>/,'<link rel="stylesheet" href="./dist/css/app.css">');
const scripts=['./dist/js/app.js',...cfg.presentation.map((_,i)=>`./dist/js/${['home-interactions','vector-icons','video-downloads-presentation','pdf-to-image-presentation'][i]}.js`)];
let k=0;output=output.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g,(full,attrs)=>attrs.includes('src=')?full:`<script${attrs} src="${scripts[k++]}"></script>`);
if(k!==5)throw Error('Did not replace all inline scripts');
save('dist/css/app.css',css);save('dist/js/app.js',main);
const targets=['home-interactions','vector-icons','video-downloads-presentation','pdf-to-image-presentation'];
for(let i=0;i<targets.length;i++)save(`dist/js/${targets[i]}.js`,read(cfg.presentation[i]));
save('index.html',output);
save('dist/index.html',output.replaceAll('./dist/css/','./css/').replaceAll('./dist/js/','./js/'));
// The standalone release includes the current engine while preserving the original HTML and CSS.
let originalIndex=0;const standalone=baseline.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g,(full,attrs)=>attrs.includes('src=')?full:`<script${attrs}>${originalIndex++===0?main:originals[originalIndex-1][2]}</script>`);
if(originalIndex!==5)throw Error('Standalone release is missing a script');
save('dist/creative-tools-standalone.html',standalone);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
console.log('Build OK');console.log('CSS',css.length,'SHA256',hash(css));console.log('JS',main.length,'SHA256',hash(main));console.log('Standalone contains optimized engine:',standalone.includes(main));
