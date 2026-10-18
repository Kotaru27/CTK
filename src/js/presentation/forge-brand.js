/* The Forge / stable, genuine typing entrance.
   The full wordmark reserves its final width; visible characters are added
   without clipping, shifting the overall layout or waiting for FLIP motion.
   The completed wordmark crossfades to the prepared home / welcome state. */
(function(){
  'use strict';
  const intro=document.getElementById('forgeIntro');
  const mark=document.getElementById('forgeIntroWordmark');
  const typed=mark?.querySelector('.forge-intro-typed');
  const home=document.getElementById('view-home');
  const app=document.getElementById('view-app');
  const body=document.body;
  const gate=window.__forgePaintGate;
  const caret=mark?.querySelector('.forge-intro-caret');
  const timers=new Set();
  const kineticGlyphs=new Set();
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
    for(const glyph of kineticGlyphs)glyph.remove?.();
    kineticGlyphs.clear();
    document.removeEventListener('keydown',onKey);
    document.removeEventListener('visibilitychange',onVisibility);
    observer?.disconnect();
    // The popup curtain is armed BEFORE the intro disappears, in the
    // same task, so even a delayed font has no exposed homepage frame.
    const homeActive=home&&!home.classList.contains('hidden')&&
      !app?.classList.contains('active')&&document.visibilityState!=='hidden';
    if(homeActive)gate?.beginWelcome?.();
    else gate?.endWelcome?.();
    body.classList.remove('forge-opening','forge-home-arriving','forge-handoff');
    intro?.remove();
    gate?.release?.();
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
  if(!intro||!mark||!typed||!home||reduced||suppressed||gate?.expired||
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
  gate?.release?.();
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
  // Adapted from kinetic typography: each new character leaves a tiny,
  // deterministic 3D ink settle. The actual name remains ONE native text
  // run, so Kola's kerning and descenders are never split or masked.
  // The transient glyph echoes are decorative and never alter layout.
  function kineticArrival(char,index){
    if(!char.trim()||complete||typeof document.createElement!=='function'||
       typeof typed.getBoundingClientRect!=='function')return;
    const glyph=document.createElement('span');
    glyph.className='forge-intro-kinetic-glyph';
    glyph.setAttribute('aria-hidden','true');
    glyph.textContent=char;
    mark.appendChild(glyph);
    kineticGlyphs.add(glyph);
    const nativeWidth=typed.getBoundingClientRect().width;
    const glyphWidth=glyph.getBoundingClientRect().width;
    if(!Number.isFinite(nativeWidth)||!Number.isFinite(glyphWidth)){
      glyph.remove();kineticGlyphs.delete(glyph);return;
    }
    glyph.style.left='calc(.075em + '+Math.max(0,nativeWidth-glyphWidth).toFixed(2)+'px)';
    const release=()=>{glyph.remove();kineticGlyphs.delete(glyph);};
    const direction=index%2===0?-1:1;
    if(typeof glyph.animate!=='function'){release();return;}
    try{
      const flight=glyph.animate([
        {offset:0,opacity:.30,
         transform:'translate3d('+(direction*8)+'px,12px,-15px) rotateX(10deg) rotateY('+(direction*9)+'deg)'},
        {offset:.55,opacity:.16,
         transform:'translate3d('+(direction*3)+'px,3px,-3px) rotateX(3deg) rotateY('+(direction*3)+'deg)'},
        {offset:1,opacity:0,
         transform:'translate3d(0,0,0) rotateX(0deg) rotateY(0deg)'}
      ],{duration:245,easing:'cubic-bezier(.2,.72,.26,1)',fill:'forwards'});
      flight.finished.then(release,release);
    }catch(_){release();}
  }
  // Tuned typing cadence: calm at the beginning, a natural pause at the
  // word boundary, and a gentle deceleration without artificial holds.
  const intervals=[112,116,121,150,122,118,124,130,122];
  const letters=Array.from(mark.dataset.fullName||'The Forge');
  function type(index){
    if(complete)return;
    if(index>=letters.length){
      intro.classList.add('forge-intro-typed-complete');
      // Prepare the destination beneath the intro BEFORE the last fade.
      // The welcome curtain remains behind the typography until handoff.
      if(home&&!home.classList.contains('hidden')&&
         !app?.classList.contains('active')&&
         document.visibilityState!=='hidden')gate?.beginWelcome?.();
      body.classList.add('forge-home-arriving','forge-handoff');
      intro.classList.add('forge-intro-finishing');
      schedule(finish,380);
      return;
    }
    typed.textContent+=letters[index];
    kineticArrival(letters[index],index);
    // Composited cursor glides to the new character boundary; its
    // transition is CSS-driven, never a reflowing width animation.
    if(caret&&typeof typed.getBoundingClientRect==='function'){
      const width=typed.getBoundingClientRect().width;
      if(Number.isFinite(width))
        caret.style.transform='translate3d('+width.toFixed(2)+'px,0,0)';
    }
    const ms=intervals[index]||118;
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
