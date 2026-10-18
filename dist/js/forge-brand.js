/* The Forge / stable, genuine typing entrance.
   The full wordmark reserves its final width; visible characters are added
   without clipping, shifting the overall layout or waiting for FLIP motion.
   Finishing the final character immediately hands control to the homepage. */
(function(){
  'use strict';
  const intro=document.getElementById('forgeIntro');
  const mark=document.getElementById('forgeIntroWordmark');
  const typed=mark?.querySelector('.forge-intro-typed');
  const home=document.getElementById('view-home');
  const app=document.getElementById('view-app');
  const body=document.body;
  const timers=new Set();
  let complete=false,observer=null,started=false;

  const notify=()=>{
    document.documentElement.dataset.forgeIntroFinished='1';
    document.dispatchEvent(new Event('forge:intro-complete'));
  };
  function schedule(fn,ms){
    const id=setTimeout(()=>{
      timers.delete(id);
      if(!complete)fn();
    },ms);
    timers.add(id);
  }
  function finish(){
    if(complete)return;
    complete=true;
    for(const id of timers)clearTimeout(id);
    timers.clear();
    document.removeEventListener('keydown',onKey);
    document.removeEventListener('visibilitychange',onVisibility);
    observer?.disconnect();
    body.classList.remove('forge-opening','forge-home-arriving');
    intro?.remove();
    notify();
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
  if(!intro||!mark||!typed||!home||reduced||suppressed||
     home.classList.contains('hidden')||
     app?.classList.contains('active')||
     document.visibilityState==='hidden'){
    finish();
    return;
  }

  // The intro starts hidden in HTML and can never block the app if the
  // presentation script fails. Skip works during font loading and typing.
  body.classList.add('forge-opening');
  intro.hidden=false;
  intro.classList.add('forge-intro-ready');
  typed.textContent='';
  document.getElementById('forgeIntroSkip')
    ?.addEventListener('click',finish,{once:true});
  document.addEventListener('keydown',onKey);
  document.addEventListener('visibilitychange',onVisibility);
  if(typeof MutationObserver==='function'&&app){
    observer=new MutationObserver(()=>{
      if(app.classList.contains('active')||home.classList.contains('hidden'))
        finish();
    });
    observer.observe(app,{attributes:true,attributeFilter:['class']});
    observer.observe(home,{attributes:true,attributeFilter:['class']});
  }
  // Absolute fail-safe: even if a font or a browser animation stalls, the
  // homepage never remains behind the intro indefinitely.
  schedule(finish,4400);

  function loadFont(spec){
    try{return Promise.resolve(document.fonts?.load?.(spec)||[]).catch(()=>[]);}
    catch(_){return Promise.resolve([]);}
  }
  const available=[false,false];
  const fonts=[
    loadFont('400 130px "Kola"').then(faces=>{available[0]=!!faces?.length;}),
    loadFont('600 12px "Plus Jakarta Sans"').then(faces=>{available[1]=!!faces?.length;})
  ];
  // Deterministic typing rhythm with a slightly longer pause between words.
  const intervals=[110,112,120,135,110,118,116,124,112];
  const letters=Array.from(mark.dataset.fullName||'The Forge');
  function type(index){
    if(complete)return;
    if(index>=letters.length){
      intro.classList.add('forge-intro-typed-complete');
      // No intermediate FLIP or composed hold. Just a 130ms dissolve,
      // then restore the already-laid-out homepage and notify the popup.
      intro.classList.add('forge-intro-finishing');
      schedule(finish,130);
      return;
    }
    typed.textContent+=letters[index];
    const ms=intervals[index]||110;
    schedule(()=>type(index+1),ms);
  }
  function start(){
    if(complete||started)return;
    started=true;
    if(!available[0])
      document.documentElement.classList.add('forge-launch-fallback-kola');
    if(!available[1])
      intro.classList.add('forge-intro-fallback-ui');
    intro.classList.add('forge-intro-playing');
    requestAnimationFrame(()=>requestAnimationFrame(()=>type(0)));
  }
  Promise.race([
    Promise.all(fonts),
    new Promise(resolve=>schedule(resolve,1350))
  ]).then(start,start);
})();
