/* THE FORGE / visible, replayable wordmark introduction.
   Keep the real homepage underneath the opening. All animations are
   cancellable and do not touch tool state, uploads or navigation. */
(function(){
  'use strict';
  const initial=document.getElementById('forgeIntro');
  const destination=document.getElementById('forgeHeroName');
  if(!initial||!destination)return;
  const template=initial.cloneNode(true);
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let running=null;

  function notify(){
    document.documentElement.dataset.forgeIntroFinished='1';
    document.dispatchEvent(new Event('forge:intro-complete'));
  }
  function launch(replay){
    if(running)return;
    const cover=replay?template.cloneNode(true):initial;
    if(replay){
      window.scrollTo(0,0);
      document.body.insertBefore(cover,document.body.firstChild);
    }
    if(reduced || !document.getElementById('view-home')?.getClientRects().length){
      cover.remove();notify();return;
    }
    // Automated route audits intentionally preseed the old QA flag. Ordinary
    // browsers NEVER consult previous session history to suppress the intro.
    let automatedSkip=false;
    try{
      automatedSkip=!!navigator.webdriver &&
        sessionStorage.getItem('forge_intro_seen_v4')==='1' && !replay;
    }catch(_){}
    if(automatedSkip){cover.remove();notify();return;}

    const mark=cover.querySelector('#forgeIntroWordmark');
    if(!mark){cover.remove();notify();return;}
    const state={cover,mark,finished:false,delay:0,safety:0,flight:null,fade:null};
    running=state;
    const escape=event=>{
      if(event.key==='Escape'){event.preventDefault();finish();}
    };
    function finish(){
      if(state.finished)return;
      state.finished=true;
      clearTimeout(state.delay);
      clearTimeout(state.safety);
      document.removeEventListener('keydown',escape);
      state.flight?.cancel();
      state.fade?.cancel();
      mark.remove();
      cover.remove();
      document.body.classList.remove('forge-opening','forge-home-arriving','forge-intro-playing');
      destination.style.removeProperty('opacity');
      running=null;
      notify();
    }
    cover.querySelector('#forgeIntroSkip')?.addEventListener('click',finish,{once:true});
    document.addEventListener('keydown',escape);
    document.body.classList.add('forge-opening','forge-intro-playing');
    state.safety=setTimeout(finish,4800);

    function handoff(){
      if(state.finished)return;
      const from=mark.getBoundingClientRect();
      const to=destination.getBoundingClientRect();
      if(!from.width||!from.height||!to.width||!to.height||!mark.animate){
        finish();return;
      }
      const style=getComputedStyle(mark);
      // Detach just the typography before the backdrop dissolves. Its fixed
      // position retains its exact pixels and animates into the home heading.
      Object.assign(mark.style,{
        position:'fixed',left:from.left+'px',top:from.top+'px',
        width:from.width+'px',height:from.height+'px',
        fontFamily:style.fontFamily,fontSize:style.fontSize,
        fontWeight:style.fontWeight,lineHeight:style.lineHeight,
        letterSpacing:style.letterSpacing,color:style.color,
        clipPath:'none',opacity:'1',animation:'none',
        margin:'0',transformOrigin:'top left',
        whiteSpace:'nowrap',pointerEvents:'none',zIndex:'2147483001'
      });
      document.body.appendChild(mark);
      document.body.classList.add('forge-home-arriving');
      destination.style.opacity='0';
      const dx=to.left-from.left,dy=to.top-from.top;
      const sx=to.width/from.width,sy=to.height/from.height;
      const omega=8.9,normalizer=1-(1+omega)*Math.exp(-omega);
      const frames=[];
      for(let i=0;i<=40;i++){
        const t=i/40;
        const p=(1-(1+omega*t)*Math.exp(-omega*t))/normalizer;
        frames.push({
          offset:t,
          transform:'translate3d('+(dx*p).toFixed(2)+'px,'+(dy*p).toFixed(2)+'px,0) scale('+
            (1+(sx-1)*p).toFixed(5)+','+(1+(sy-1)*p).toFixed(5)+')'
        });
      }
      try{
        state.fade=cover.animate([{opacity:1},{opacity:0}],{
          duration:570,easing:'cubic-bezier(.4,0,.7,1)',fill:'forwards'
        });
        state.flight=mark.animate(frames,{duration:950,easing:'linear',fill:'forwards'});
        state.flight.finished.then(finish,finish);
      }catch(_){finish();}
    }
    // Time, not network availability, governs the entrance. Missing Kola
    // falls back to a usable font without silently cancelling the opening.
    state.delay=setTimeout(()=>requestAnimationFrame(handoff),1870);
  }
  document.getElementById('forgeIntroReplay')?.addEventListener('click',()=>launch(true));
  launch(false);
})();
