/* One-time lossless extraction from the verified monolithic source.
   Maintains source order rather than attempting to rewrite code. */
const fs=require('fs'),path=require('path'),postcss=require('postcss');
const root=path.resolve(__dirname,'..');
const input=process.argv[2]||'/mnt/data/creative-tools-homepage-refined.html';
const html=fs.readFileSync(input,'utf8');
const write=(p,s)=>{const full=path.join(root,p);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,s);};
write('source/baseline.html',html);
const styleMatch=html.match(/<style>([\s\S]*?)<\/style>/);if(!styleMatch)throw Error('Inline style missing');
const css=styleMatch[1],nodes=postcss.parse(css).nodes;
const matchers=[['logo-resizer',/#section-logo|#logo[A-Z]|\.logo-/],['pdf-to-image',/#pdf|\.pdf-|#section-pdf/],['image-splitter',/#split|\.split-/],['video-stills',/#stills|\.vs-|\.stills-/],['storyboard',/#story|\.story-|#subMode/],['link-gen',/#adGen|\.adgen-|\.ad-gen|\.link-gen/],['ad-downloader',/#adDl|\.ad-download|\.ad-dl/],['video-downloads',/#yt|\.yt-|\.video-download/]];
const runs=[];let last=0;
for(const n of nodes){const end=n.source.end.offset+1; const ref=n.type==='rule'?n.selector:n.toString().slice(0,80);const found=matchers.filter(([,re])=>re.test(ref));const owner=found.length===1?found[0][0]:'shared';const slice=css.slice(last,end);if(runs.length && runs.at(-1).owner===owner)runs.at(-1).content+=slice;else runs.push({owner,content:slice});last=end;}
if(last<css.length){runs.at(-1).content+=css.slice(last)}
const cssPaths={shared:'src/css/shared.css'};for(const [name] of matchers)cssPaths[name]=`src/css/tools/${name}.css`;
const buckets=Object.fromEntries(Object.keys(cssPaths).map(x=>[x,[]]));const manifest=[];
runs.forEach((r,i)=>{const id=String(i+1).padStart(4,'0');manifest.push({id,owner:r.owner});buckets[r.owner].push(`/* CTK_RUN_${id}_START */\n${r.content}\n/* CTK_RUN_${id}_END */\n`);});
for(const [owner,chunks] of Object.entries(buckets))write(cssPaths[owner],`/* Creative Tools CSS module: ${owner}. Sections reassembled in original cascade order. */\n`+chunks.join('\n'));
write('src/css/order.json',JSON.stringify(manifest,null,2)+'\n');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src='));
if(scripts.length!==5)throw Error(`Expected 5 inline script blocks; found ${scripts.length}`);
const main=scripts[0][2], toolStart=main.indexOf('const Tools = {'), toolEnd=main.indexOf('\n      };',toolStart)+'\n      };'.length;
if(toolStart<0||toolEnd<0)throw Error('Cannot locate original Tools object');
const regex=/^        ([A-Za-z][A-Za-z0-9]*): \{/gm;regex.lastIndex=toolStart;const props=[];let mat;
while((mat=regex.exec(main)) && mat.index<toolEnd)props.push({name:mat[1],start:mat.index});
const expected=['Logo','Pdf','Split','Story','FitToPlatform','Stills','Filmstrip','AdLinkGen','AdDownloader'];
if(props.map(x=>x.name).join(',')!==expected.join(','))throw Error('Tool property inventory changed: '+props.map(x=>x.name));
write('src/js/core/prelude.js',main.slice(0,props[0].start));
const toolPaths={Logo:'logo-resizer',Pdf:'pdf-to-image',Split:'image-splitter',Story:'storyboard',FitToPlatform:'storyboard-fit',Stills:'video-stills',Filmstrip:'storyboard-filmstrip',AdLinkGen:'link-gen',AdDownloader:'ad-downloader'};
const toolOrder=[];props.forEach((m,i)=>{const end=i<props.length-1?props[i+1].start:toolEnd-'\n      };'.length;const raw=main.slice(m.start,end);const file=`src/js/tools/${toolPaths[m.name]}.js`;write(file,'/* Source-preserving module. Build unwraps the object property into the original Tools object. */\nexport default {\n'+raw+'\n};\n');toolOrder.push(file);});
const youtubeStart=main.indexOf('const YouTubeHelper =',toolEnd);const bootStart=main.length;
if(youtubeStart<0)throw Error('Could not identify YouTube helper boundary');
write('src/js/core/post-tools.js',main.slice(toolEnd-'\n      };'.length,youtubeStart));write('src/js/tools/video-downloads.js',main.slice(youtubeStart,bootStart));write('src/js/core/initialize.js',main.slice(bootStart));
const scriptsNames=['home-interactions','vector-icons','video-downloads-presentation','pdf-to-image-presentation'];
for(let i=1;i<scripts.length;i++)write(`src/js/presentation/${scriptsNames[i-1]}.js`,scripts[i][2]);
const config={cssPaths,jsToolPaths:toolOrder,presentation:scriptsNames.map(x=>`src/js/presentation/${x}.js`),cssSourceLength:css.length,mainSourceLength:main.length};
write('scripts/source-map.json',JSON.stringify(config,null,2)+'\n');
console.log('Extracted',runs.length,'ordered CSS fragments and',toolOrder.length,'tool object members; total source',html.length,'characters');
