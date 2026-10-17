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
const visualCss=read('src/css/experience/ad-downloader-v2.css');
const visualJs=read('src/js/presentation/ad-downloader-v2.js');
const typeMotionCss=read('src/css/experience/typography-motion-v3.css');

/* The brand shell is overlaid on the unchanged baseline; never rewrite tool cards. */
const forgeBrandCss=read('src/css/experience/forge-brand.css');
const forgeBrandJs=read('src/js/presentation/forge-brand.js');
const forgeHero=[
  '<section class="forge-hero" aria-labelledby="forgeHeroName">',
  ' <div class="forge-hero-top">',
  '  <span class="forge-hero-edition">THE FORGE / CREATIVE WORKSPACE</span>',
  '  <span class="forge-hero-counter">EIGHT TOOLS · ONE PLACE</span>',
  ' </div>',
  ' <div class="forge-hero-middle">',
  '  <h1 class="forge-hero-name" id="forgeHeroName">The Forge</h1>',
  '  <div class="forge-hero-aside">',
  '   <span class="forge-hero-aside-label">MAKE SOMETHING OF IT</span>',
  '   <p>Everything between your first idea and the finished asset. Without the extra steps.</p>',
  '  </div>',
  ' </div>',
  ' <div class="forge-hero-bottom">',
  '  <span class="forge-hero-lineup">Create / Transform / Deliver</span>',
  '  <span class="forge-hero-manifesto">One considered space for everyday creative work.</span>',
  ' </div>',
  '</section>',
  '<div class="forge-after-hero"><strong>Explore the workspaces</strong><span>CHOOSE WHERE TO BEGIN ↓</span></div>'
].join('\n');
const forgeIntroLetters='The Forge'.split('').map((ch,i)=>
  ch===' '?'<span class="forge-intro-gap" aria-hidden="true"></span>':
  '<span class="forge-intro-glyph" style="--step:'+i+'" aria-hidden="true">'+
   '<span class="forge-intro-outline">'+ch+'</span>'+
   '<span class="forge-intro-fill">'+ch+'</span></span>'
).join('');
const forgeIntro=[
  '<div class="forge-intro" id="forgeIntro" role="region" aria-label="The Forge introduction">',
  ' <div class="forge-intro-layout">',
  '  <div class="forge-intro-label">YOUR CREATIVE WORKSPACE</div>',
  '  <div class="forge-intro-type" id="forgeIntroType" role="img" aria-label="The Forge">'+forgeIntroLetters+'</div>',
  '  <div class="forge-intro-caption"><span>CREATE / TRANSFORM / DELIVER</span>',
  '   <button type="button" class="forge-intro-skip" id="forgeIntroSkip" aria-label="Skip introduction">Skip intro ↗</button>',
  '  </div>',
  ' </div>',
  '</div>'
].join('\n');
function forgeBrand(html,standaloneRelease){
  const start=html.indexOf('<div class="home-wordmark">');
  const end=html.indexOf('<div class="home-grid combined-home-grid" id="homeContent">',start);
  if(start<0||end<0)throw Error('Forge home injection anchors not found: refusing to modify tool cards');
  html=html.slice(0,start)+forgeHero+'\n'+html.slice(end);
  if(!html.includes('<title>Creative Tools Suite</title>'))throw Error('Original suite title not found');
  html=html.replace('<title>Creative Tools Suite</title>','<title>The Forge — Creative Tools</title>');
  html=html.replace('<link href="Toolkit%20logo.png" rel="icon" type="image/png"/>','');
  html=html.replace('<span class="material-symbols-rounded brand-icon">deployed_code</span>','');
  html=html.replace('<span class="brand-text" id="brandText">CREATIVE TOOLS SUITE</span>','<span class="brand-text" id="brandText">The Forge</span>');
  const fontLink='<link rel="preconnect" href="https://api.fontshare.com" crossorigin="anonymous">\n'+
    '<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=kola@400&amp;display=swap">\n';
  const brandStyle=standaloneRelease?'<style id="forge-brand-styles">'+forgeBrandCss+'</style>\n':
    '<link rel="stylesheet" href="./dist/css/forge-brand.css">\n';
  html=html.replace('</head>',fontLink+brandStyle+'</head>');
  const themeBootstrap='<script>try{if(localStorage.getItem("cts_theme")==="dark")document.body.classList.remove("light-mode")}catch(_){}</script>';
  html=html.replace('<body>','<body class="light-mode">\n'+themeBootstrap+'\n'+forgeIntro+'\n');
  const brandScript=standaloneRelease?'<script id="forge-brand-intro-js">'+forgeBrandJs+'</script>':
    '<script id="forge-brand-intro-js" src="./dist/js/forge-brand.js"></script>';
  html=html.replace('</body>',brandScript+'\n</body>');
  return html;
}

output=output.replace('<link rel="stylesheet" href="./dist/css/app.css">','<link rel="stylesheet" href="./dist/css/app.css">\n<link rel="stylesheet" href="./dist/css/ad-downloader-v2.css">');
output=output.replace('</body>','<script id="ctk-ad-downloader-v2" src="./dist/js/ad-downloader-v2.js"></script>\n</body>');
output=output.replace('<link rel="stylesheet" href="./dist/css/ad-downloader-v2.css">',
 '<link rel="stylesheet" href="./dist/css/ad-downloader-v2.css">\n<link rel="stylesheet" href="./dist/css/typography-motion-v3.css">');
save('dist/css/typography-motion-v3.css',typeMotionCss);
save('dist/css/forge-brand.css',forgeBrandCss);
save('dist/js/forge-brand.js',forgeBrandJs);
save('dist/css/ad-downloader-v2.css',visualCss);
save('dist/js/ad-downloader-v2.js',visualJs);
save('dist/css/app.css',css);save('dist/js/app.js',main);
const targets=['home-interactions','vector-icons','video-downloads-presentation','pdf-to-image-presentation'];
for(let i=0;i<targets.length;i++)save(`dist/js/${targets[i]}.js`,read(cfg.presentation[i]));
output=forgeBrand(output,false);
save('index.html',output);
save('dist/index.html',output.replaceAll('./dist/css/','./css/').replaceAll('./dist/js/','./js/'));
// The standalone release includes the current engine while preserving the original HTML and CSS.
let originalIndex=0;let standalone=baseline.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g,(full,attrs)=>attrs.includes('src=')?full:`<script${attrs}>${originalIndex++===0?main:originals[originalIndex-1][2]}</script>`);
if(originalIndex!==5)throw Error('Standalone release is missing a script');
standalone=standalone.replace('</head>','<style id="ctk-ad-downloader-v2">'+visualCss+'</style>\n<style id="ctk-type-motion-v3">'+typeMotionCss+'</style>\n</head>');
standalone=standalone.replace('</body>','<script id="ctk-ad-downloader-v2">'+visualJs+'</script>\n</body>');
standalone=forgeBrand(standalone,true);
save('dist/creative-tools-standalone.html',standalone);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
console.log('Build OK');console.log('CSS',css.length,'SHA256',hash(css));console.log('JS',main.length,'SHA256',hash(main));console.log('Standalone contains optimized engine:',standalone.includes(main));
