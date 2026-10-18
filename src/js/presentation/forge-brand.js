/* The Forge / cinematic wordmark introduction.
   Three stages: ink reveal, composed hold, measured home handoff.
   Remote fonts are optional. Intro markup starts hidden, so a failed
   script never leaves a blocking overlay over the tools. */
(function(){
  'use strict';
  const intro=document.getElementById('forgeIntro');
  const mark=document.getElementById('forgeIntroWordmark');
  const destination=document.getElementById('forgeHeroName');
  const home=document.getElementById('view-home');
  const app=document.getElementById('view-app');
  const body=document.body;
  let done=false,observer=null,safety=0,hold=0;
  const flights=new Set();
  const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  let suppress=false;
  try{suppress=sessionStorage.getItem('forge_intro_suppress')==='1';}catch(_){}

  function notify(reason){
    document.documentElement.dataset.forgeIntroFinished='1';
    document.dispatchEvent(new Event('forge:intro-complete'));
  }
  function complete(reason){
    if(done)return;
    done=true;
    clearTimeout(safety);
    clearTimeout(hold);
    document.removeEventListener('keydown',onKey);
    document.removeEventListener('visibilitychange',onVisibility);
    observer?.disconnect();
    for(const animation of flights){try{animation.cancel();}catch(_){}}
    flights.clear();
    body.classList.remove('forge-opening','forge-home-arriving');
    intro?.remove();
    notify(reason);
  }
  function onKey(event){
    if(event.key==='Escape'){event.preventDefault();complete('skip');}
  }
  function onVisibility(){
    if(document.visibilityState==='hidden')complete('hidden');
  }
  if(!intro||!mark||!destination||!home||reduced||suppress||
     home.classList.contains('hidden')||
     app?.classList.contains('active')||
     document.visibilityState==='hidden'){
    complete('bypass');
    return;
  }

  // Launch only after script initialization: never expose an unstyled,
  // blocking splash if a network request interrupts page execution.
  body.classList.add('forge-opening');
  intro.hidden=false;
  intro.classList.add('forge-intro-ready');
  document.getElementById('forgeIntroSkip')?.addEventListener('click',()=>complete('skip'),{once:true});
  document.addEventListener('keydown',onKey);
  document.addEventListener('visibilitychange',onVisibility);
  if(typeof MutationObserver==='function'&&app){
    observer=new MutationObserver(()=>{
      if(app.classList.contains('active')||home.classList.contains('hidden'))
        complete('navigation');
    });
    observer.observe(app,{attributes:true,attributeFilter:['class']});
    observer.observe(home,{attributes:true,attributeFilter:['class']});
  }
  safety=setTimeout(()=>complete('safety'),6700);

  // Smooth but never overshooting; the last sampled pose is exact.
  function settle(t,omega){
    const denom=1-(1+omega)*Math.exp(-omega);
    return Math.min(1,Math.max(0,(1-(1+omega*t)*Math.exp(-omega*t))/denom));
  }
  function animate(el,frames,options){
    try{
      const a=el.animate(frames,options);
      flights.add(a);
      return a;
    }catch(_){return null;}
  }
  function handoff(){
    if(done)return;
    if(typeof mark.animate!=='function'){
      complete('fallback');return;
    }
    // Finish the reveal in-place before measuring. These same font
    // settings exist on the destination, including when Kola is offline.
    mark.style.opacity='1';
    mark.style.clipPath='none';
    mark.style.transform='none';
    const from=mark.getBoundingClientRect();
    const to=destination.getBoundingClientRect();
    if(!from.width||!from.height||!to.width||!to.height){
      complete('geometry');return;
    }
    const dx=to.left-from.left,dy=to.top-from.top;
    const sx=to.width/from.width,sy=to.height/from.height;
    if(![dx,dy,sx,sy].every(Number.isFinite)||
       sx<=0||sy<=0||sx>4||sy>4){
      complete('geometry');return;
    }
    body.classList.add('forge-home-arriving');
    intro.classList.add('forge-intro-leaving');
    const frames=[];
    for(let i=0;i<=64;i++){
      const t=i/64,p=settle(t,8.4);
      frames.push({
        offset:t,
        transform:'translate3d('+(dx*p).toFixed(3)+'px,'+
          (dy*p).toFixed(3)+'px,0) scale('+
          (1+(sx-1)*p).toFixed(6)+','+
          (1+(sy-1)*p).toFixed(6)+')'
      });
    }
    const flight=animate(mark,frames,{
      duration:1080,easing:'linear',fill:'both'
    });
    if(!flight){complete('fallback');return;}
    flight.finished.then(()=>complete('finished'),()=>complete('interrupted'));
  }
  function reveal(){
    if(done)return;
    intro.classList.add('forge-intro-playing');
    if(typeof mark.animate!=='function'){
      intro.classList.add('forge-intro-fallback');
      hold=setTimeout(()=>complete('fallback'),2850);
      return;
    }
    const frames=[];
    for(let i=0;i<=55;i++){
      const t=i/55;
      // Delay the ink by a fraction of a beat, then ease it into place.
      const p=settle(Math.max(0,Math.min(1,(t-.09)/.91)),6.2);
      frames.push({
        offset:t,
        opacity:Math.min(1,.45+p*.55),
        clipPath:'inset(0 '+((1-p)*100).toFixed(3)+'% 0 0)',
        transform:'translate3d(0,'+((1-p)*21).toFixed(3)+'px,0)'
      });
    }
    const first=animate(mark,frames,{
      duration:1590,easing:'linear',fill:'both'
    });
    if(first){
      first.finished.then(()=>{
        if(done)return;
        mark.style.opacity='1';
        mark.style.clipPath='none';
        mark.style.transform='none';
        first.cancel();
        flights.delete(first);
      }).catch(()=>{});
    }
    hold=setTimeout(handoff,2220);
  }
  // Resolve ALL introductory typefaces before showing a single letter.
  // FontFaceSet.load resolves with [] if the face is not declared: that
  // is not proof the intended font was loaded. Freeze system fallback
  // instead of letting a late download visibly replace live typography.
  function loadFont(specimen){
    try{return Promise.resolve(document.fonts?.load?.(specimen)||[])
      .catch(()=>[]);}
    catch(_){return Promise.resolve([]);}
  }
  let started=false;
  function begin(results){
    if(started||done)return;
    started=true;
    if(!results?.[0]?.length)
      document.documentElement.classList.add('forge-launch-fallback-kola');
    if(!results?.[1]?.length)
      intro.classList.add('forge-intro-fallback-ui');
    requestAnimationFrame(()=>requestAnimationFrame(reveal));
  }
  Promise.race([
    Promise.all([
      loadFont('400 130px "Kola"'),
      loadFont('600 12px "Plus Jakarta Sans"')
    ]),
    new Promise(resolve=>setTimeout(()=>resolve(null),1650))
  ]).then(begin,()=>begin(null));
})();
