/* Launch gate: every ordered pair of the eight tools must have one
   coordinated transition, including pairs sharing a section. No export,
   upload or app engine behavior is replaced by this audit. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const routes=[
 {key:'logo',id:'section-logo',mode:null,nav:'nav-logo',heading:'Logo Resizer'},
 {key:'pdf',id:'section-pdf',mode:'convert',nav:'nav-pdf-image',heading:'PDF to Image',panel:'pdfTabContentConvert'},
 {key:'split',id:'section-pdf',mode:'split',nav:'nav-pdf-split',heading:'Image Splitter',panel:'pdfTabContentSplit'},
 {key:'stills',id:'section-stills-boards',mode:'video',nav:'nav-stills-video',heading:'Video Stills',panel:'stillsTabContentVideo'},
 {key:'story',id:'section-stills-boards',mode:'story',nav:'nav-stills-story',heading:'Storyboard',panel:'stillsTabContentStory'},
 {key:'links',id:'section-adlinks',mode:'gen',nav:'nav-adlinks-gen',heading:'Link Gen',panel:'adlinksTabContentGen'},
 {key:'ads',id:'section-adlinks',mode:'downloader',nav:'nav-adlinks-dl',heading:'Ad Downloader',panel:'adlinksTabContentDownloader'},
 {key:'video',id:'section-yt-helper',mode:null,nav:'nav-yt-helper',heading:'Video Compressor'}
];
try {
  const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
    sessionStorage.setItem('forge_intro_suppress','1');
    sessionStorage.setItem('forge_whatsnew_suppress','1');
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.ForgeWorkspaceRoute && typeof UI==='object');
  const hasNative=await page.evaluate(()=>typeof document.startViewTransition==='function');
  assert.equal(hasNative,true,'Native View Transitions unavailable in QA browser');
  await page.evaluate(()=>{
    window.__routeTransitions=0;
    const original=document.startViewTransition.bind(document);
    document.startViewTransition=function(callback){
      window.__routeTransitions++;
      return original(callback);
    };
  });
  const cases=[];
  const settled=()=>page.waitForFunction(()=>
    !document.documentElement.classList.contains('forge-route-running'),null,{timeout:6500});
  for(const from of routes){
    await page.evaluate(({id,mode})=>UI.openTool(id,mode),from);
    await settled();
    for(const to of routes){
      if(from.key===to.key)continue;
      // Independently start each pair at the actual source; this tests
      // every pair instead of only an easy sequence through the tool list.
      await page.evaluate(({id,mode})=>UI.openTool(id,mode),from);
      await settled();
      const before=await page.evaluate(()=>window.__routeTransitions);
      await page.evaluate(({id,mode})=>UI.openTool(id,mode),to);
      await settled();
      const state=await page.evaluate(()=>({
        snapshots:window.__routeTransitions,
        nav:document.querySelector('.nav-sidebar .nav-item.active')?.id,
        heading:document.querySelector('#view-app .tool-section.active .tool-header h2')?.textContent.trim(),
        sections:document.querySelectorAll('#view-app .tool-section.active').length,
        hidden:document.querySelector('#view-home').classList.contains('hidden'),
        locked:document.documentElement.classList.contains('forge-route-running')
      }));
      if(from.id===to.id){
        // Shared DOM section: the incoming panel gets a damped WAAPI spring,
        // not a native root snapshot (which can leave Chrome stuck).
        assert.equal(state.snapshots,before,
          `${from.key}→${to.key}: inappropriate root snapshot for shared section`);
        await page.waitForTimeout(35);
        const spring=await page.evaluate(id=>{
          const panel=document.getElementById(id);
          return document.getAnimations({subtree:true}).filter(a=>
            a.playState==='running'&&a.effect?.target===panel).length;
        },to.panel);
        assert.ok(spring>0,`${from.key}→${to.key}: missing shared-section spring`);
      }else{
        assert.equal(state.snapshots,before+1,
          `${from.key}→${to.key}: skipped native surface transition`);
      }
      assert.equal(state.nav,to.nav,`${from.key}→${to.key}: wrong selected navigation`);
      assert.equal(state.heading,to.heading,`${from.key}→${to.key}: wrong destination header`);
      assert.equal(state.sections,1,`${from.key}→${to.key}: multiple active sections`);
      assert.equal(state.hidden,true,`${from.key}→${to.key}: home incorrectly visible`);
      assert.equal(state.locked,false,`${from.key}→${to.key}: transition stuck`);
      cases.push(from.key+'>'+to.key);
    }
  }
  assert.equal(cases.length,56);
  assert.deepEqual(errors,[],'Unhandled errors during all-pairs navigation');
  // Multiple rapid route changes must end at the last clicked destination.
  await page.evaluate(()=>{
    UI.openTool('section-pdf','convert');
    UI.openTool('section-stills-boards','story');
    UI.openTool('section-adlinks','downloader');
  });
  await settled();
  const final=await page.evaluate(()=>({
    nav:document.querySelector('.nav-sidebar .nav-item.active')?.id,
    heading:document.querySelector('#view-app .tool-section.active .tool-header h2')?.textContent.trim()
  }));
  assert.deepEqual(final,{nav:'nav-adlinks-dl',heading:'Ad Downloader'});
  console.log('FORGE_ALL_ORDERED_PAIRS '+JSON.stringify({count:cases.length,examples:cases.slice(0,12),final,errors}));
  await context.close();
} finally { await browser.close(); }
