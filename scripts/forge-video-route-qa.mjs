import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
fs.mkdirSync('artifacts/forge-video-route',{recursive:true});
const errorsAll=[];
const routes=[
 {key:'logo',card:'tool-logo',nav:'nav-logo',header:'Logo Resizer'},
 {key:'pdf',card:'tool-pdf',nav:'nav-pdf-image',header:'PDF to Image'},
 {key:'split',card:'tool-split',nav:'nav-pdf-split',header:'Image Splitter'},
 {key:'stills',card:'tool-stills',nav:'nav-stills-video',header:'Video Stills'},
 {key:'story',card:'tool-story',nav:'nav-stills-story',header:'Storyboard'},
 {key:'links',card:'tool-links',nav:'nav-adlinks-gen',header:'Link Gen'},
 {key:'ads',card:'tool-ads',nav:'nav-adlinks-dl',header:'Ad Link Downloader'},
 {key:'video',card:'tool-video',nav:'nav-yt-helper',header:'Video Downloads'}
];
const base='http://127.0.0.1:4173/';
async function setup(viewport,motion='no-preference'){
 const ctx=await browser.newContext({viewport,reducedMotion:motion});
 await ctx.addInitScript(()=>sessionStorage.setItem('forge_intro_seen_v4','1'));
 const page=await ctx.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>typeof UI==='object' && !!window.ForgeWorkspaceRoute);
 await page.evaluate(()=>{
   const original=document.startViewTransition?.bind(document);
   window.__routeSnapshots=[];
   if(original)document.startViewTransition=function(update){
     window.__routeSnapshots.push(document.documentElement.dataset.forgeRoute);
     return original(update);
   };
 });
 return {ctx,page,errors};
}
async function completed(page){
 await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'),null,{timeout:6000});
}
try{
 for(const viewport of [{width:1440,height:900},{width:2560,height:1440}]){
   const {ctx,page,errors}=await setup(viewport);
   for(const route of routes){
     await page.locator('button.home-card.'+route.card).click();
     await page.locator('#view-app.active .tool-section.active').waitFor({state:'visible',timeout:8500});
     await completed(page);
     const state=await page.evaluate(()=>{
       const nav=document.querySelector('.nav-sidebar .nav-item.active');
       const section=document.querySelector('#view-app .tool-section.active');
       return {nav:nav?.id,header:section?.querySelector('.tool-header h2')?.textContent.trim(),
         count:document.querySelectorAll('#view-app .tool-section.active').length,
         homeHidden:document.querySelector('#view-home').classList.contains('hidden'),
         snapshotKeys:window.__routeSnapshots.slice()};
     });
     assert.equal(state.nav,route.nav,'Wrong selected navigation for '+route.key);
     assert.equal(state.header,route.header,'Wrong workspace header for '+route.key);
     assert.equal(state.count,1,'Multiple workspaces active for '+route.key);
     assert.equal(state.homeHidden,true,'Homepage remained visible for '+route.key);
     assert.equal(state.snapshotKeys.at(-1),route.key,'Missing selected card snapshot for '+route.key);
     if(route.key==='stills'){
       await page.screenshot({path:'artifacts/forge-video-route/stills-'+viewport.width+'.png',animations:'disabled'});
     }
     await page.locator('.header .brand-title').click();
     await page.locator('#view-home').waitFor({state:'visible',timeout:7000});
     await completed(page);
     const back=await page.evaluate(()=>({
       home:!document.querySelector('#view-home').classList.contains('hidden'),
       cards:document.querySelectorAll('button.home-card').length,
       snapshotKeys:window.__routeSnapshots.slice(),
       inactive:!document.querySelector('#view-app').classList.contains('active')
     }));
     assert.ok(back.home&&back.inactive&&back.cards===8,'Return home failed for '+route.key);
     assert.equal(back.snapshotKeys.at(-1),route.key,'Missing reverse shared transition for '+route.key);
   }
   const n=await page.evaluate(()=>window.__routeSnapshots.length);
   assert.equal(n,16,'Expected 16 native snapshots (8 routes forward and reverse)');
   // Changing modes while inside the app must keep the original data flow.
   await page.locator('button.tool-stills').click();
   await completed(page);
   await page.evaluate(()=>UI.openTool('section-stills-boards','story'));
   const changed=await page.evaluate(()=>({
     nav:document.querySelector('.nav-sidebar .nav-item.active')?.id,
     title:document.querySelector('#stillsToolTitle')?.textContent.trim()
   }));
   assert.deepEqual(changed,{nav:'nav-stills-story',title:'Storyboard'});
   await page.locator('.header .brand-title').click();
   await completed(page);
   // Interruption: last requested tool must win.
   await page.evaluate(()=>{
     UI.openTool('section-pdf','split');
     UI.showHome();
     UI.openTool('section-adlinks','downloader');
   });
   await completed(page);
   const rapid=await page.evaluate(()=>({
     nav:document.querySelector('.nav-sidebar .nav-item.active')?.id,
     header:document.querySelector('#section-adlinks .tool-header h2')?.textContent.trim(),
     active:document.querySelectorAll('.tool-section.active').length,
     stuck:document.documentElement.classList.contains('forge-route-running')
   }));
   assert.equal(rapid.nav,'nav-adlinks-dl','Fast navigation ended on wrong tool');
   assert.equal(rapid.header,'Ad Link Downloader','Fast navigation left wrong mode');
   assert.equal(rapid.active,1,'Fast navigation left multiple workspaces active');
   assert.equal(rapid.stuck,false,'Motion class remained after fast navigation');
   assert.deepEqual(errors,[],'Unexpected console errors');
   console.log('FORGE_ALL_ROUTES',JSON.stringify({viewport,nativeTransitions:n,changed,rapid,errors}));
   await ctx.close();
 }
 // Native motion bypass for reduced-motion preference.
 const {ctx,page,errors}=await setup({width:1440,height:900},'reduce');
 for(const key of ['tool-stills','tool-ads','tool-split']){
   await page.locator('button.home-card.'+key).click();
   await page.locator('#view-app.active').waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>window.__routeSnapshots.length),0,'Reduced-motion must not start snapshots');
   await page.locator('.header .brand-title').click();
   await page.locator('#view-home').waitFor({state:'visible'});
 }
 assert.deepEqual(errors,[],'Reduced-motion console errors');
 console.log('FORGE_ALL_ROUTES_REDUCED',JSON.stringify({snapshots:0,errors}));
 await ctx.close();
}finally{
 await browser.close();
}
