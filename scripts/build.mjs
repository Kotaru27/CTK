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
const forgeVideoRouteCss=read('src/css/experience/forge-video-route.css');
const forgeAdaptiveCss=read('src/css/experience/forge-adaptive-desktop.css');
const forgeWorkspaceFinishCss=read('src/css/experience/forge-workspace-finish.css');
const forgeSpecimensCss=read('src/css/experience/forge-tool-specimens.css');
const forgeUnifiedCss=read('src/css/experience/forge-unified-workspaces.css');
const forgeWorkflowCss=read('src/css/experience/forge-workflow-interactions.css');
const forgeVideoRouteJs=read('src/js/presentation/forge-video-route.js');
const forgeWhatsNewCss=read('src/css/experience/forge-whats-new.css');
const forgeWhatsNewJs=read('src/js/presentation/forge-whats-new.js');
const forgeHero=[
  '<section class="forge-hero" aria-labelledby="forgeHeroName">',
  ' <div class="forge-hero-top">',
  '  <span class="forge-hero-edition">EIGHT TOOLS. ONE CREATIVE WORKSPACE.</span>',
  '  <button class="forge-hero-updates" id="forgeWhatsNewTrigger" type="button" aria-haspopup="dialog" aria-controls="forgeWhatsNew">What’s new ↗</button>',
  ' </div>',
  ' <div class="forge-hero-middle">',
  '  <h1 class="forge-hero-name" id="forgeHeroName">The Forge</h1>',
  '  <div class="forge-hero-aside">',
  '   <p>Resize images, convert PDFs, capture stills and build storyboards. One focused workspace from start to finish.</p>',
  '  </div>',
  ' </div>',
  '</section>',
  '<div class="forge-after-hero"><strong>Choose a tool</strong></div>'
].join('\n');
const forgeIntro=[
  '<div class="forge-intro" id="forgeIntro" role="region" aria-label="The Forge introduction" hidden>',
  ' <div class="forge-intro-layout">',
  '  <div class="forge-intro-label">CREATIVE TOOL KIT / REIMAGINED</div>',
  '  <div class="forge-intro-type" id="forgeIntroType" role="img" aria-label="The Forge">',
  '   <div class="forge-intro-wordmark" id="forgeIntroWordmark" data-full-name="The Forge" aria-hidden="true"><span class="forge-intro-typed"></span></div>',
  '  </div>',
  '  <div class="forge-intro-caption"><span>EIGHT TOOLS / ONE WORKSPACE</span>',
  '   <button type="button" class="forge-intro-skip" id="forgeIntroSkip" aria-label="Skip introduction">Skip intro ↗</button>',
  '  </div>',
  ' </div>',
  '</div>'
].join('\n');
const forgeWhatsNew=[
  '<div class="forge-whatsnew" id="forgeWhatsNew" hidden>',
  ' <section class="forge-whatsnew-dialog" role="dialog" aria-modal="true" aria-labelledby="forgeWhatsNewTitle" aria-describedby="forgeWhatsNewDescription">',
  '  <div class="forge-whatsnew-opening">',
  '   <div class="forge-whatsnew-edition">FIRST MAJOR REBRAND / 2026</div>',
  '   <div>',
  '    <span class="forge-whatsnew-brand" aria-label="The Forge">The Forge</span>',
  '    <h2 id="forgeWhatsNewTitle">Same purpose.<br><em>A new beginning.</em></h2>',
  '    <p class="forge-whatsnew-intro" id="forgeWhatsNewDescription">Creative Tool Kit is now The Forge. The tools you know, with a more focused way to get things done.</p>',
  '   </div>',
  '   <p class="forge-whatsnew-foot">CREATE / TRANSFORM / DELIVER</p>',
  '  </div>',
  '  <div class="forge-whatsnew-content">',
  '   <div class="forge-whatsnew-topline">',
  '    <span class="forge-whatsnew-section-label">WHAT\'S NEW / THE FORGE</span>',

  '   </div>',
  '   <div class="forge-whatsnew-changes">',
  '    <article class="forge-whatsnew-change"><span class="forge-whatsnew-number">01</span><div>',
  '     <h3>The Forge</h3><p>Creative Tool Kit has a new name and a more focused experience. Your eight familiar tools are still here.</p>',
  '    </div></article>',
  '    <article class="forge-whatsnew-change"><span class="forge-whatsnew-number">02</span><div>',
  '     <h3>Video Stills</h3><p>Choose frames from several videos. One Send to Board action creates a separate storyboard for each video.</p>',
  '    </div></article>',
  '    <article class="forge-whatsnew-change"><span class="forge-whatsnew-number">03</span><div>',
  '     <h3>Storyboard</h3><p>Use Add Assets to select a main campaign folder. A board is created for each ad\'s stills folder.</p>',
  '    </div></article>',
  '    <article class="forge-whatsnew-change"><span class="forge-whatsnew-number">04</span><div>',
  '     <h3>Ad Downloader · Auto-name</h3><p>Choose a writable folder before uploading Excel. The tool can automatically rename supported SharePoint downloads in that folder.</p>',
  '    </div></article>',
  '    <article class="forge-whatsnew-change"><span class="forge-whatsnew-number">05</span><div>',
  '     <h3>Ad Downloader · Downloads</h3><p>Pending ads stay first. Requested and confirmed downloads move below, with Download again always available.</p>',
  '    </div></article>',
  '   </div>',
  '   <div class="forge-whatsnew-actions">',
  '    <button type="button" id="forgeWhatsNewNever" class="forge-whatsnew-enter">Don\'t show again <span aria-hidden="true">→</span></button>',

  '   </div>',
  '  </div>',
  ' </section>',
  '</div>'
].join('\n');
function forgeBrand(html,standaloneRelease){
  const start=html.indexOf('<div class="home-wordmark">');
  const end=html.indexOf('<div class="home-grid combined-home-grid" id="homeContent">',start);
  if(start<0||end<0)throw Error('Forge home injection anchors not found: refusing to modify tool cards');
  html=html.slice(0,start)+forgeHero+'\n'+html.slice(end);
  // Two strictly textual naming alignments. Keep card artwork, structure,
  // navigation handlers, tool logic and all eight button routes unchanged.
  for(const [before,after] of [
    ['aria-label="Open Logo Workspace"','aria-label="Open Logo Resizer"'],
    ['<h2 class="home-card-title">Logo Workspace</h2>','<h2 class="home-card-title">Logo Resizer</h2>'],
    ['title="Ad Link Downloader"','title="Ad Downloader"'],
    ['<span class="nav-item-text">Ad Link Downloader</span>','<span class="nav-item-text">Ad Downloader</span>'],
    ['<span style="flex: 1">Ad Link Downloader</span>','<span style="flex: 1">Ad Downloader</span>']
  ]) {
    if(!html.includes(before)) throw Error('Naming refinement anchor missing: '+before);
    html=html.replace(before,after);
  }

  if(!html.includes('<title>Creative Tools Suite</title>'))throw Error('Original suite title not found');
  html=html.replace('<title>Creative Tools Suite</title>','<title>The Forge — Creative Tools</title>');
  html=html.replace('<link href="Toolkit%20logo.png" rel="icon" type="image/png"/>','');
  html=html.replace('<span class="material-symbols-rounded brand-icon">deployed_code</span>','');
  html=html.replace('<span class="brand-text" id="brandText">CREATIVE TOOLS SUITE</span>','<span class="brand-text" id="brandText">The Forge</span>');
  const fontLink='<link rel="preconnect" href="https://api.fontshare.com" crossorigin="anonymous">\n'+
    '<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=kola@400&amp;display=swap">\n';
  const brandStyle=standaloneRelease?'<style id="forge-brand-styles">'+forgeBrandCss+'</style>\n':
    '<link rel="stylesheet" href="./dist/css/forge-brand.css?v=forge-launch-20261018-typing-v5">\n';
  const routeStyle=standaloneRelease?'<style id="forge-video-route-styles">'+forgeVideoRouteCss+'</style>\n':
    '<link rel="stylesheet" href="./dist/css/forge-video-route.css">\n';
  const adaptiveStyle=standaloneRelease?'<style id="forge-adaptive-styles">'+forgeAdaptiveCss+'</style>\n':
    '<link rel="stylesheet" href="./dist/css/forge-adaptive-desktop.css">\n';
  const workspaceFinishStyle=standaloneRelease?'<style id="forge-workspace-finish-styles">'+forgeWorkspaceFinishCss+'</style>\n':
    '<link rel="stylesheet" href="./dist/css/forge-workspace-finish.css">\n';
  const specimenStyle=standaloneRelease?'<style id="forge-tool-specimens-styles">'+forgeSpecimensCss+'</style>\n':
    '<link rel="stylesheet" href="./dist/css/forge-tool-specimens.css">\n';
  const unifiedStyle=standaloneRelease?'<style id="forge-unified-workspaces-styles">'+forgeUnifiedCss+'</style>\n':
    '<link rel="stylesheet" href="./dist/css/forge-unified-workspaces.css">\n';
  const workflowStyle=standaloneRelease?'<style id="forge-workflow-interactions-styles">'+forgeWorkflowCss+'</style>\n':
    '<link rel="stylesheet" href="./dist/css/forge-workflow-interactions.css">\n';
  const welcomeStyle=standaloneRelease?'<style id="forge-whats-new-styles">'+forgeWhatsNewCss+'</style>\n':
    '<link rel="stylesheet" href="./dist/css/forge-whats-new.css?v=forge-launch-20261018-typing-v5">\n';
  html=html.replace('</head>',fontLink+brandStyle+routeStyle+adaptiveStyle+workspaceFinishStyle+specimenStyle+unifiedStyle+workflowStyle+welcomeStyle+'</head>');
  // Light-only presentation: do not read an old dark preference on first paint.
  html=html.replace('<body>','<body class="light-mode">\n'+forgeIntro+'\n'+forgeWhatsNew+'\n');
  const brandScript=standaloneRelease?'<script id="forge-brand-intro-js">'+forgeBrandJs+'</script>':
    '<script id="forge-brand-intro-js" src="./dist/js/forge-brand.js?v=forge-launch-20261018-typing-v5"></script>';
  const routeScript=standaloneRelease?'<script id="forge-video-route-js">'+forgeVideoRouteJs+'</script>':
    '<script id="forge-video-route-js" src="./dist/js/forge-video-route.js"></script>';
  const welcomeScript=standaloneRelease?'<script id="forge-whats-new-js">'+forgeWhatsNewJs+'</script>':
    '<script id="forge-whats-new-js" src="./dist/js/forge-whats-new.js?v=forge-launch-20261018-typing-v5"></script>';
  html=html.replace('</body>',brandScript+'\n'+routeScript+'\n'+welcomeScript+'\n</body>');
  return html;
}

output=output.replace('<link rel="stylesheet" href="./dist/css/app.css">','<link rel="stylesheet" href="./dist/css/app.css">\n<link rel="stylesheet" href="./dist/css/ad-downloader-v2.css">');
output=output.replace('</body>','<script id="ctk-ad-downloader-v2" src="./dist/js/ad-downloader-v2.js"></script>\n</body>');
output=output.replace('<link rel="stylesheet" href="./dist/css/ad-downloader-v2.css">',
 '<link rel="stylesheet" href="./dist/css/ad-downloader-v2.css">\n<link rel="stylesheet" href="./dist/css/typography-motion-v3.css">');
save('dist/css/typography-motion-v3.css',typeMotionCss);
save('dist/css/forge-brand.css',forgeBrandCss);
save('dist/js/forge-brand.js',forgeBrandJs);
save('dist/css/forge-video-route.css',forgeVideoRouteCss);
save('dist/css/forge-adaptive-desktop.css',forgeAdaptiveCss);
save('dist/css/forge-workspace-finish.css',forgeWorkspaceFinishCss);
save('dist/css/forge-tool-specimens.css',forgeSpecimensCss);
save('dist/css/forge-unified-workspaces.css',forgeUnifiedCss);
save('dist/css/forge-workflow-interactions.css',forgeWorkflowCss);
save('dist/css/forge-whats-new.css',forgeWhatsNewCss);
save('dist/js/forge-whats-new.js',forgeWhatsNewJs);
save('dist/js/forge-video-route.js',forgeVideoRouteJs);
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
