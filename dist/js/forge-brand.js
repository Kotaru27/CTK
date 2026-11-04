/* The Forge / cinematic assembly. Eight actual tool pictograms form an F,
   then an eight-panel curtain reveals the already-mounted home in sync. */
(function(){
  'use strict';
  if(window.__forgeSharedHandoffActive)return;
  const intro=document.getElementById('forgeIntro');
  const home=document.getElementById('view-home');
  const app=document.getElementById('view-app');
  const body=document.body;
  const gate=window.__forgePaintGate;
  const skip=document.getElementById('forgeIntroSkip');
  const counter=document.getElementById('forgeCineCounter');
  const ticks=Array.from(intro?.querySelectorAll?.('.forge-cine-ticks i')||[]);
  const timers=new Set();
  let complete=false,started=false,leaving=false,observer=null;
  function schedule(fn,ms){
    const id=setTimeout(()=>{
      timers.delete(id);
      if(!complete)fn();
    },ms);
    timers.add(id);
  }
  function homeActive(){
    return !!home&&!home.classList.contains('hidden')&&
      !app?.classList.contains('active')&&document.visibilityState!=='hidden';
  }
  function finish(){
    if(complete)return;
    complete=true;
    for(const id of timers)clearTimeout(id);
    timers.clear();
    document.removeEventListener('keydown',onKey);
    document.removeEventListener('visibilitychange',onVisibility);
    observer?.disconnect();
    body.classList.remove('forge-opening','forge-home-arriving','forge-handoff','forge-cine-home-reveal');
    intro?.remove();
    gate?.endWelcome?.();
    gate?.release?.();
    document.documentElement.dataset.forgeIntroFinished='1';
    document.dispatchEvent(new Event('forge:intro-complete'));
  }
  function onKey(event){
    if(event.key==='Escape'){event.preventDefault();finish();}
  }
  function onVisibility(){
    if(document.visibilityState==='hidden')finish();
  }
  const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  let suppressed=false;
  try{suppressed=sessionStorage.getItem('forge_intro_suppress')==='1';}catch(_){}
  if(!intro||!skip||!counter||!home||reduced||suppressed||gate?.expired||!homeActive()){
    finish();return;
  }
  body.classList.add('forge-opening');
  skip.addEventListener('click',finish,{once:true});
  document.addEventListener('keydown',onKey);
  document.addEventListener('visibilitychange',onVisibility);
  if(typeof MutationObserver==='function'&&app){
    observer=new MutationObserver(()=>{
      if(!homeActive())finish();
    });
    observer.observe(app,{attributes:true,attributeFilter:['class']});
    observer.observe(home,{attributes:true,attributeFilter:['class']});
  }
  // Never strand the real app after a blocked font or interrupted animation.
  schedule(finish,6200);
  function handoff(){
    if(complete||leaving)return;
    leaving=true;
    // The destination is revealed under the *same* eight panels,
    // before the top edge of any panel moves.
    if(homeActive())
      body.classList.add('forge-home-arriving','forge-handoff','forge-cine-home-reveal');
    intro.classList.add('forge-cine-leaving');
    schedule(finish,1160);
  }
  function start(){
    if(complete||started||!homeActive())return;
    started=true;
    intro.hidden=false;
    intro.classList.add('forge-intro-ready');
    document.documentElement.dataset.forgeIntroAnimated='1';
    gate?.release?.();
    requestAnimationFrame(()=>{
      if(complete)return;
      intro.classList.add('forge-cine-playing');
    });
    for(let i=0;i<8;i++){
      schedule(()=>{
        counter.textContent=String(i+1).padStart(2,'0');
        ticks[i]?.classList.add('is-lit');
      },160+i*112+630);
    }
    schedule(handoff,3100);
  }
  let fontReady=false;
  const loadFont=spec=>{
    try{return Promise.resolve(document.fonts?.load?.(spec)||[]).catch(()=>[]);}
    catch(_){return Promise.resolve([]);}
  };
  Promise.race([
    loadFont('400 130px "Kola"').then(faces=>{fontReady=!!faces?.length}),
    new Promise(resolve=>schedule(resolve,900))
  ]).then(()=>{
    if(!fontReady)document.documentElement.classList.add('forge-launch-fallback-kola');
    start();
  },start);
})();