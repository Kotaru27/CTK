import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rd=s=>fs.readFileSync(path.join(root,s),'utf8');
const a=rd('source/baseline.html'), b=rd('index.html');
const ids=s=>[...s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]).sort();
const getRoutes=s=>[...s.matchAll(/<button\b[^>]*class="[^"]*home-card[^>]*"[^>]*onclick="([^"]+)"/g)].map(m=>m[1]);
const beforeIds=ids(a),afterIds=ids(b).filter(id=>!["forgeIntro","forgeHeroName","forgeIntroType","forgeIntroSkip","forgeIntroWordmark","forgeIntroGlyphs",
  "forgeWhatsNew","forgeWhatsNewTitle","forgeWhatsNewDescription","forgeWhatsNewClose","forgeWhatsNewNever","forgeWhatsNewContinue","forgeWhatsNewEnter","forgeWhatsNewTrigger","forge-first-paint-css"].includes(id));
if(JSON.stringify(beforeIds)!==JSON.stringify(afterIds))throw Error('DOM element IDs changed');
const beforeRoutes=getRoutes(a),afterRoutes=getRoutes(b);
if(beforeRoutes.length!==8||JSON.stringify(beforeRoutes)!==JSON.stringify(afterRoutes))throw Error('Homepage routes changed');
if(!b.includes('./dist/css/app.css')||!b.includes('./dist/js/app.js'))throw Error('Missing built assets');
const scripts=s=>[...s.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m=>m[1]);
const ext=scripts(a),ext2=scripts(b).filter(x=>!x.startsWith('./dist/'));
if(JSON.stringify(ext)!==JSON.stringify(ext2))throw Error('External script dependency order changed');
const standalone=rd('dist/creative-tools-standalone.html');
const originalMain=[...a.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>!m[1].includes('src='))[2];
const newMain=rd('dist/js/app.js');
const visualCss=rd('src/css/experience/ad-downloader-v2.css');
const visualJs=rd('src/js/presentation/ad-downloader-v2.js');
const typeMotionCss=rd('src/css/experience/typography-motion-v3.css');
const videoRouteCss=rd('src/css/experience/forge-video-route.css');
const videoRouteJs=rd('src/js/presentation/forge-video-route.js');
const whatsNewJs=rd('src/js/presentation/forge-whats-new.js');
const whatsNewCss=rd('src/css/experience/forge-whats-new.css');
const firstPaintCss=rd('src/css/experience/forge-first-paint.css');
const firstPaintJs=rd('src/js/presentation/forge-first-paint.js');
if(!b.includes('<style id="forge-first-paint-css">'+firstPaintCss+'</style>') ||
   !b.includes('<script id="forge-first-paint-js">'+firstPaintJs+'</script>') ||
   !standalone.includes('<style id="forge-first-paint-css">'+firstPaintCss+'</style>') ||
   !standalone.includes('<script id="forge-first-paint-js">'+firstPaintJs+'</script>'))
  throw Error('Early first-paint guard is missing or stale');
if(!b.includes('./dist/css/forge-whats-new.css') || !b.includes('./dist/js/forge-whats-new.js') ||
   !standalone.includes('<style id="forge-whats-new-styles">'+whatsNewCss+'</style>') ||
   !standalone.includes('<script id="forge-whats-new-js">'+whatsNewJs+'</script>') ||
   rd('dist/css/forge-whats-new.css')!==whatsNewCss ||
   rd('dist/js/forge-whats-new.js')!==whatsNewJs)
  throw Error('Launch popup assets missing or stale');
if(!standalone.includes('<style id="forge-video-route-styles">'+videoRouteCss+'</style>') ||
   !standalone.includes('<script id="forge-video-route-js">'+videoRouteJs+'</script>'))
  throw Error('Standalone shared route layer missing or stale');
if(rd('dist/css/forge-video-route.css')!==videoRouteCss ||
   rd('dist/js/forge-video-route.js')!==videoRouteJs)
  throw Error('Modular Video Stills route layer differs from its source');
const withoutVisual=standalone
  .replace('<style id="ctk-type-motion-v3">'+typeMotionCss+'</style>\n','')
  .replace('<style id="ctk-ad-downloader-v2">'+visualCss+'</style>\n','')
  .replace('<script id="ctk-ad-downloader-v2">'+visualJs+'</script>\n','')
  .replace('<style id="forge-video-route-styles">'+videoRouteCss+'</style>\n','')
  .replace('<script id="forge-video-route-js">'+videoRouteJs+'</script>\n','');
// Remove only the new, explicitly-scoped Forge presentation layer before
// comparing to the untouched original. Tool sections and cards must be identical.
const forgeJs=rd('src/js/presentation/forge-brand.js');
let withoutForge=withoutVisual
  .replace('<style id="forge-first-paint-css">'+firstPaintCss+'</style>\n','')
  .replace('<script id="forge-first-paint-js">'+firstPaintJs+'</script>\n','')
  .replace('<script id="forge-brand-intro-js">'+forgeJs+'</script>\n','')
  .replace('<script id="forge-whats-new-js">'+whatsNewJs+'</script>\n','');
const brandStart=withoutForge.indexOf('<section class="forge-hero"');
const brandEnd=withoutForge.indexOf('<div class="home-grid combined-home-grid" id="homeContent">',brandStart);
const originalStart=a.indexOf('<div class="home-wordmark">');
const originalEnd=a.indexOf('<div class="home-grid combined-home-grid" id="homeContent">',originalStart);
if([brandStart,brandEnd,originalStart,originalEnd].some(i=>i<0))
  throw Error('Forge hero or source home anchor missing');
withoutForge=withoutForge.slice(0,brandStart)+a.slice(originalStart,originalEnd)+withoutForge.slice(brandEnd);
const bodyStart=withoutForge.indexOf('<body class="light-mode">');
const firstHeader=withoutForge.indexOf('<header class="header">',bodyStart);
if(bodyStart<0||firstHeader<0)throw Error('Forge intro/theme bootstrap missing');
withoutForge=a.slice(0,a.indexOf('<body>'))+'<body>\n'+withoutForge.slice(firstHeader);
const brandAnchor='<div class="brand-title"';
const headerStart=withoutForge.indexOf(brandAnchor);
const headerEnd=withoutForge.indexOf('<span class="brand-text"',headerStart);
const sourceHeaderStart=a.indexOf(brandAnchor);
const sourceHeaderEnd=a.indexOf('<span class="brand-text"',sourceHeaderStart);
if([headerStart,headerEnd,sourceHeaderStart,sourceHeaderEnd].some(i=>i<0))
  throw Error('Header wordmark anchors missing');
withoutForge=withoutForge.slice(0,headerStart)+a.slice(sourceHeaderStart,sourceHeaderEnd)+withoutForge.slice(headerEnd);
withoutForge=withoutForge.replace('id="brandText">The Forge</span>','id="brandText">CREATIVE TOOLS SUITE</span>');
const restored=withoutForge.replace('<script>'+newMain+'</script>','<script>'+originalMain+'</script>');
// Only five known, textual naming alignments are allowed outside the hero.
// Reconstruct the legacy terms before the strict byte-for-byte parity check.
const restoredNames=restored
  .replace('aria-label="Open Logo Resizer"','aria-label="Open Logo Workspace"')
  .replace('<h2 class="home-card-title">Logo Resizer</h2>','<h2 class="home-card-title">Logo Workspace</h2>')
  .replace('title="Ad Downloader"','title="Ad Link Downloader"')
  .replace('<span class="nav-item-text">Ad Downloader</span>','<span class="nav-item-text">Ad Link Downloader</span>')
  .replace('<span style="flex: 1">Ad Downloader</span>','<span style="flex: 1">Ad Link Downloader</span>')
  // V9 changes only the visible sequence numbers; control order, handlers,
  // values and the original underlying tool source remain byte-identical.
  .replace('<div class="edition-rule-label">01 / DESTINATION</div>',
           '<div class="edition-rule-label">02 / DESTINATION</div>')
  .replace('<div class="edition-rule-label">02 / INPUT</div>',
           '<div class="edition-rule-label">01 / INPUT</div>');
if(restoredNames!==a)throw Error('Standalone changes source HTML/CSS or scripts outside the intentional presentation/naming layer');
if(!standalone.includes(`<script>${newMain}</script>`))throw Error('Standalone does not contain current engine');
if(!b.includes('./dist/css/ad-downloader-v2.css')||!b.includes('./dist/js/ad-downloader-v2.js'))throw Error('Ad Downloader experience layer missing');
if(!standalone.includes('<style id="ctk-ad-downloader-v2">')||!standalone.includes('<script id="ctk-ad-downloader-v2">'))throw Error('Standalone experience layer missing');
if(!b.includes('./dist/css/typography-motion-v3.css')||!standalone.includes('<style id="ctk-type-motion-v3">'))throw Error('Typography & motion design layer missing');
if(rd('dist/css/typography-motion-v3.css')!==typeMotionCss)throw Error('Typography & motion modular stylesheet mismatch');
if(!b.includes('./dist/css/forge-brand.css')||!b.includes('./dist/js/forge-brand.js'))throw Error('Forge brand assets missing');
if(!b.includes('./dist/css/forge-video-route.css')||!b.includes('./dist/js/forge-video-route.js'))
  throw Error('Video Stills shared transition assets missing');
if(!standalone.includes('<style id="forge-brand-styles">')||!standalone.includes('<script id="forge-brand-intro-js">'))throw Error('Forge standalone assets missing');
console.log(`Verified: ${beforeIds.length} IDs, ${beforeRoutes.length} homepage links, ${ext.length} external dependencies, untouched tool functionality and additive Ad Downloader visual layer.`);
