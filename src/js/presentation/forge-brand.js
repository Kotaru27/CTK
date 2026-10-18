/* The Forge / resilient, home-native wordmark entrance.
   Animate the actual heading: no backdrop, duplicated wordmark, or
   network-dependent font gate. Navigation and every tool stay interactive. */
(function(){
  'use strict';
  const intro=document.getElementById('forgeIntro');
  const destination=document.getElementById('forgeHeroName');
  if(!destination){intro?.remove();return;}
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const home=document.getElementById('view-home');
  const app=document.getElementById('view-app');
  const onHome=home && !home.classList.contains('hidden') &&
    !app?.classList.contains('active');
  // Explicit suppression is reserved for unattended QA/embeds; ordinary
  // page reloads never inherit an old auto-seen session flag.
  let suppressed=false;
  try{suppressed=sessionStorage.getItem('forge_intro_suppress')==='1';}catch(_){}
  let complete=false,flight=null,safety=0,observer=null;
  function notify(){
    document.documentElement.dataset.forgeIntroFinished='1';
    document.dispatchEvent(new Event('forge:intro-complete'));
  }
  function cleanup(){
    if(complete)return;
    complete=true;
    clearTimeout(safety);
    document.removeEventListener('keydown',onKey);
    document.removeEventListener('visibilitychange',onVisibility);
    observer?.disconnect();
    flight?.cancel();
    document.body.classList.remove('forge-opening','forge-home-arriving');
    intro?.remove();
    notify();
  }
  function onKey(event){
    if(event.key==='Escape'){event.preventDefault();cleanup();}
  }
  function onVisibility(){
    if(document.visibilityState==='hidden')cleanup();
  }
  // Saved tool preferences and session history are not evidence that a
  // visible homepage should skip its opening. Reload always replays it.
  if(reduced||suppressed||!onHome||document.visibilityState==='hidden'){
    intro?.remove();notify();return;
  }
  document.body.classList.add('forge-opening');
  document.getElementById('forgeIntroSkip')?.addEventListener('click',cleanup,{once:true});
  document.addEventListener('keydown',onKey);
  document.addEventListener('visibilitychange',onVisibility);
  if(typeof MutationObserver==='function'&&app){
    observer=new MutationObserver(()=>{
      if(app.classList.contains('active')||home.classList.contains('hidden'))
        cleanup();
    });
    observer.observe(app,{attributes:true,attributeFilter:['class']});
    observer.observe(home,{attributes:true,attributeFilter:['class']});
  }
  safety=setTimeout(cleanup,3900);

  // Slow-to-fast ink reveal, followed by a critically damped settle.
  // The actual glyphs stay laid out in one position; only the heading's
  // clip and composited translation change, avoiding a white mask rectangle.
  function progress(t){
    const x=Math.min(1,Math.max(0,(t-.08)/.88));
    const omega=6.4;
    const end=1-(1+omega)*Math.exp(-omega);
    return Math.min(1,(1-(1+omega*x)*Math.exp(-omega*x))/end);
  }
  function play(){
    if(complete)return;
    document.body.classList.add('forge-home-arriving');
    if(typeof destination.animate!=='function'){cleanup();return;}
    const frames=[];
    for(let i=0;i<=64;i++){
      const t=i/64,p=progress(t);
      frames.push({
        offset:t,
        opacity:1,
        clipPath:'inset(0 '+((1-p)*100).toFixed(3)+'% 0 0)',
        transform:'translate3d(0,'+((1-p)*12).toFixed(3)+'px,0)'
      });
    }
    try{
      flight=destination.animate(frames,{duration:2250,easing:'linear',fill:'both'});
      flight.finished.then(cleanup,cleanup);
    }catch(_){cleanup();}
  }
  let started=false;
  function begin(){
    if(started||complete)return;
    started=true;
    // Keep the first frame stable even when the font arrived from cache.
    requestAnimationFrame(()=>requestAnimationFrame(play));
  }
  // Wait briefly for Kola, but NEVER cancel the intro when offline, if the
  // CSS font fails, or when document.fonts is missing. The fallback draws.
  const fontReady=(()=>{try{
    return document.fonts?.load?.('400 120px "Kola"')||Promise.resolve();
  }catch(_){return Promise.resolve();}})();
  Promise.race([
    Promise.resolve(fontReady).catch(()=>null),
    new Promise(resolve=>setTimeout(resolve,650))
  ]).then(begin,begin);
})();
