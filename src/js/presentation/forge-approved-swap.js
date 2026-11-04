/* Pixel-perfect approved home: run the actual verified demo in a viewport-sized
   isolated document, with the existing CTK tool routes left untouched. */
(function forgeExactDemo(){
 'use strict';
 if(window.__forgeDisableSharedHandoff)return;
 const script=document.currentScript;
 const home=document.getElementById('view-home');
 const app=document.getElementById('view-app');
 const grid=document.getElementById('homeContent');
 if(!home||!app||!grid||!document.body)return;
 const ids=['logo','pdf','split','stills','story','links','ads','video'];
 const selectors={logo:'.tool-logo',pdf:'.tool-pdf',split:'.tool-split',
   stills:'.tool-stills',story:'.tool-story',links:'.tool-links',
   ads:'.tool-ads',video:'.tool-video'};
 const routes=Object.fromEntries(ids.map(id=>[id,grid.querySelector(':scope > button.home-card'+selectors[id])]));
 if(ids.some(id=>!routes[id]))return;
 const sourceTag=document.getElementById('forgeExactDemoSource');
 const documentUrl=script?.src?new URL('../forge-centered-exact-demo.html',script.src).href:null;
 if(!sourceTag&&!documentUrl)return;
 window.__forgeSharedHandoffActive=true; // Suppress old overlapping intro engine.
 const oldIntro=document.getElementById('forgeIntro');
 if(oldIntro){oldIntro.hidden=true;oldIntro.style.setProperty('display','none','important')}
 document.body.classList.remove('forge-opening','forge-home-arriving','forge-handoff');
 const frame=document.createElement('iframe');
 frame.id='forgeExactDemoFrame';
 frame.title='The Forge — eight creative workspaces';
 frame.setAttribute('aria-label','The Forge home and introduction');
 frame.setAttribute('data-approved-demo','2026-11-04');
 frame.style.cssText='position:fixed!important;inset:0!important;left:0!important;top:0!important;width:100vw!important;min-width:100vw!important;max-width:none!important;height:100vh!important;height:100dvh!important;min-height:100vh!important;margin:0!important;padding:0!important;border:0!important;background:#102c20!important;z-index:2147483000!important;opacity:1!important;box-shadow:none!important;transform:none!important';
 function isHome(){return !home.classList.contains('hidden')&&!app.classList.contains('active')}
 function sync(){
   const visible=isHome();
   frame.style.display=visible?'block':'none';
   document.body.classList.toggle('forge-exact-demo-home',visible);
 }
 window.addEventListener('message',event=>{
   if(event.source!==frame.contentWindow||event.data?.type!=='ctk-forge-open-tool')return;
   const id=event.data.id;
   if(!Object.prototype.hasOwnProperty.call(routes,id)||!isHome())return;
   routes[id].click(); // Reuse the real original onclick/UI.openTool call.
   sync();
 });
 const observer=new MutationObserver(sync);
 observer.observe(home,{attributes:true,attributeFilter:['class']});
 observer.observe(app,{attributes:true,attributeFilter:['class']});
 document.body.appendChild(frame); // Avoid constrained/translated CTK containers.
 if(sourceTag){
   try{frame.srcdoc=JSON.parse(sourceTag.textContent)}
   catch(error){console.error('Forge approved standalone demo failed:',error);
     frame.remove();observer.disconnect();window.__forgeSharedHandoffActive=false;return}
 }else frame.src=documentUrl;
 sync();
 document.documentElement.dataset.forgeIntroFinished='1';
 const gate=window.__forgePaintGate;
 gate?.endWelcome?.();gate?.release?.();
 document.dispatchEvent(new Event('forge:intro-complete'));
})();
