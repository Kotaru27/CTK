import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rd=s=>fs.readFileSync(path.join(root,s),'utf8');
const a=rd('source/baseline.html'), b=rd('index.html');
const ids=s=>[...s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]).sort();
const getRoutes=s=>[...s.matchAll(/<button\b[^>]*class="[^"]*home-card[^>]*"[^>]*onclick="([^"]+)"/g)].map(m=>m[1]);
const beforeIds=ids(a),afterIds=ids(b).filter(id=>id!=="forgeIntro"&&id!=="forgeHeroName");
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
const withoutVisual=standalone
  .replace('<style id="ctk-type-motion-v3">'+typeMotionCss+'</style>\n','')
  .replace('<style id="ctk-ad-downloader-v2">'+visualCss+'</style>\n','')
  .replace('<script id="ctk-ad-downloader-v2">'+visualJs+'</script>\n','');
// Remove only the new, explicitly-scoped Forge presentation layer before
// comparing to the untouched original. Tool sections and cards must be identical.
const forgeJs=rd('src/js/presentation/forge-brand.js');
let withoutForge=withoutVisual.replace('<script id="forge-brand-intro-js">'+forgeJs+'</script>\n','');
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
if(restored!==a)throw Error('Standalone changes source HTML/CSS or scripts outside the intentional presentation layer');
if(!standalone.includes(`<script>${newMain}</script>`))throw Error('Standalone does not contain current engine');
if(!b.includes('./dist/css/ad-downloader-v2.css')||!b.includes('./dist/js/ad-downloader-v2.js'))throw Error('Ad Downloader experience layer missing');
if(!standalone.includes('<style id="ctk-ad-downloader-v2">')||!standalone.includes('<script id="ctk-ad-downloader-v2">'))throw Error('Standalone experience layer missing');
if(!b.includes('./dist/css/typography-motion-v3.css')||!standalone.includes('<style id="ctk-type-motion-v3">'))throw Error('Typography & motion design layer missing');
if(rd('dist/css/typography-motion-v3.css')!==typeMotionCss)throw Error('Typography & motion modular stylesheet mismatch');
if(!b.includes('./dist/css/forge-brand.css')||!b.includes('./dist/js/forge-brand.js'))throw Error('Forge brand assets missing');
if(!standalone.includes('<style id="forge-brand-styles">')||!standalone.includes('<script id="forge-brand-intro-js">'))throw Error('Forge standalone assets missing');
console.log(`Verified: ${beforeIds.length} IDs, ${beforeRoutes.length} homepage links, ${ext.length} external dependencies, untouched tool functionality and additive Ad Downloader visual layer.`);
