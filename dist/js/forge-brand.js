/* The Forge / home-native brand entrance.
   Animate the real Kola heading, never a second full-screen white surface.
   All timelines are cancellable; tool engines, cards and saved state remain
   independent of the entrance. */
(function(){
  'use strict';
  const intro=document.getElementById('forgeIntro');
  const mark=document.getElementById('forgeIntroWordmark');
  const destination=document.getElementById('forgeHeroName');
  if(!intro||!mark||!destination)return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let seen=false,activeTool=null;
  try{
    seen=sessionStorage.getItem('forge_intro_seen_v4')==='1';
    activeTool=localStorage.getItem('cts_activeTool');
  }catch(_){}
  let complete=false,flight=null,safety=0;
  const notify=()=>{
    document.documentElement.dataset.forgeIntroFinished='1';
    document.dispatchEvent(new Event('forge:intro-complete'));
  };
  function cleanup(){
    if(complete)return;
    complete=true;
    clearTimeout(safety);
    document.removeEventListener('keydown',key);
    flight?.cancel();
    document.body.classList.remove('forge-opening','forge-home-arriving');
    intro.remove();
    notify();
  }
  function key(e){
    if(e.key==='Escape'){e.preventDefault();cleanup();}
  }
  if(reduced||seen||(activeTool&&activeTool!=='home')){
    intro.remove();notify();return;
  }
  try{sessionStorage.setItem('forge_intro_seen_v4','1');}catch(_){}
  document.body.classList.add('forge-opening');
  document.getElementById('forgeIntroSkip')?.addEventListener('click',cleanup,{once:true});
  document.addEventListener('keydown',key);
  safety=setTimeout(cleanup,4200);
  // Critically damped step response with no overshoot; the glyph geometry
  // never changes, and the final transform is exactly identity.
  function progress(t){
    const omega=8.7;
    const value=1-(1+omega*t)*Math.exp(-omega*t);
    const total=1-(1+omega)*Math.exp(-omega);
    return Math.min(1,Math.max(0,value/total));
  }
  function play(){
    if(complete)return;
    document.body.classList.add('forge-home-arriving');
    if(!destination.animate){cleanup();return;}
    const frames=[];
    for(let i=0;i<=48;i++){
      const t=i/48,p=progress(t);
      frames.push({
        offset:t,
        opacity:Math.min(1,.12+p*1.28),
        transform:'translate3d(0,'+((1-p)*27).toFixed(3)+'px,0) scale('+
          (.982+.018*p).toFixed(6)+')'
      });
    }
    flight=destination.animate(frames,{duration:1580,easing:'linear',fill:'both'});
    flight.finished.then(cleanup,cleanup);
  }
  // Never conceal the home screen waiting for a font: an unavailable Kola
  // simply shows the usable application immediately.
  if(!document.fonts?.load){cleanup();return;}
  let started=false;
  const begin=()=>{
    if(started)return;
    started=true;
    requestAnimationFrame(()=>requestAnimationFrame(play));
  };
  Promise.race([
    document.fonts.load('400 120px "Kola"').then(faces=>!!faces?.length,()=>false),
    new Promise(resolve=>setTimeout(()=>resolve(false),850))
  ]).then(ready=>ready?begin():cleanup(),cleanup);
})();