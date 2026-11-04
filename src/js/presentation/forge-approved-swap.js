(function forgeApprovedSwap(){
  'use strict';
  const d=document,w=window,body=d.body;
  const intro=d.getElementById('forgeIntro'),home=d.getElementById('view-home');
  const app=d.getElementById('view-app'),approved=d.getElementById('forgeApprovedHome');
  const oldLayout=home?.querySelector('.combined-home-layout'),grid=d.getElementById('homeContent');
  const pieces=[...intro?.querySelectorAll('.forge-cine-piece')||[]];
  const cards=[...grid?.querySelectorAll(':scope > button.home-card')||[]];
  if(!intro||!home||!approved||!oldLayout||!grid||pieces.length!==8||cards.length!==8||
     !window.Element?.prototype?.animate||!d.getElementById('forgeApprovedGridMount'))return;
  // The previous engine remains the fallback for browsers without Web Animations.
  w.__forgeSharedHandoffActive=true;
  const gate=w.__forgePaintGate,skip=d.getElementById('forgeIntroSkip');
  const counter=d.getElementById('forgeCineCounter'),ticks=[...intro.querySelectorAll('.forge-cine-ticks i')];
  const hero=d.getElementById('forgeHeroName'),identity=intro.querySelector('.forge-cine-identity');
  const assembly=intro.querySelector('.forge-cine-assembly'),orbit=intro.querySelector('.forge-cine-orbit');
  const shell=intro.querySelector('.forge-cine-shell'),foot=intro.querySelector('.forge-cine-foot');
  const reduced=w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seq=0,phase='init',timers=[],anims=[],layer=null,wordmark=null,ready=false,completed=false;
  function later(fn,ms){const t=setTimeout(fn,ms);timers.push(t);return t}
  function clearMotion(){
    timers.forEach(clearTimeout);timers=[];
    anims.forEach(a=>{try{a.cancel()}catch(_){}});anims=[];
    layer?.remove();layer=null;
  }
  function foundHome(){
    return !home.classList.contains('hidden')&&!app?.classList.contains('active')&&d.visibilityState!=='hidden';
  }
  function fireFinished(){
    gate?.endWelcome?.();gate?.release?.();
    d.documentElement.dataset.forgeIntroFinished='1';
    d.dispatchEvent(new Event('forge:intro-complete'));
  }
  function seen(){
    try{return sessionStorage.getItem('forge_intro_suppress')==='1'||
      sessionStorage.getItem('forge_intro_seen_centered')==='1'}catch(_){return false}
  }
  function markSeen(){try{sessionStorage.setItem('forge_intro_seen_centered','1')}catch(_){}}
  function attachTitle(){
    if(!wordmark)return;
    wordmark.removeAttribute('style');wordmark.className='';
    hero.replaceChildren(wordmark);
  }
  function finish(record=true){
    if(phase==='done')return;
    seq++;clearMotion();phase='done';
    if(record)markSeen();
    attachTitle();
    intro.hidden=true;intro.remove();
    body.classList.remove('forge-opening','forge-swap-active','forge-home-arriving','forge-handoff','forge-cine-home-reveal');
    if(!completed){completed=true;fireFinished()}
  }
  function composeIntro(){
    const previous=identity.querySelector('.forge-cine-wordmark');
    wordmark=d.createElement('span');wordmark.className='forge-cine-wordmark';
    wordmark.textContent=previous?.textContent||'The Forge';
    previous?.replaceWith(wordmark);
    const composition=d.createElement('div');composition.className='forge-cine-composition';
    const emblem=d.createElement('div');emblem.className='forge-cine-emblem';
    emblem.append(orbit,assembly);
    composition.append(emblem,identity);
    shell.insertBefore(composition,foot);
    intro.classList.add('forge-swap-prepared');
  }
  function setupHome(){
    if(ready)return;
    try{
      if(!hero||!identity||!assembly||!orbit||!shell||!foot||!skip||!counter||
        !d.getElementById('forgeToolSearch')||!d.getElementById('forgeSearchCount')||
        !d.getElementById('forgeFeaturedLabel'))throw Error('Missing Forge workbench anchor');
      // The original workbench search/keyboard handlers are bound before reparenting.
      d.getElementById('forgeApprovedTitleMount').append(hero);
      hero.classList.add('home-brandword');
      d.getElementById('forgeApprovedSearchMount').append(d.getElementById('forgeToolSearch'));
      d.getElementById('forgeApprovedCountMount').append(d.getElementById('forgeSearchCount'));
      d.getElementById('forgeApprovedFeaturedMount').append(d.getElementById('forgeFeaturedLabel'));
      d.getElementById('forgeApprovedGridMount').replaceWith(grid);
      grid.classList.add('card-grid');
      cards.forEach((card,i)=>{
        const icon=d.createElement('span');icon.className='forge-home-icon';icon.setAttribute('aria-hidden','true');
        icon.appendChild(pieces[i].querySelector('svg').cloneNode(true));
        card.insertBefore(icon,card.firstChild);
      });
      composeIntro();
      body.classList.add('forge-swap-ready');
      oldLayout.setAttribute('aria-hidden','true');oldLayout.inert=true;
      skip.addEventListener('click',()=>finish());
      d.addEventListener('keydown',e=>{if(e.key==='Escape'&&phase!=='done'){e.preventDefault();finish()}});
      d.addEventListener('visibilitychange',()=>{
        if(d.visibilityState==='hidden'&&phase!=='done')finish(false);
      });
      if(typeof MutationObserver==='function'){
        const observer=new MutationObserver(()=>{if(!foundHome()&&phase!=='done')finish(false)});
        observer.observe(home,{attributes:true,attributeFilter:['class']});
        if(app)observer.observe(app,{attributes:true,attributeFilter:['class']});
      }
      d.getElementById('replay')?.addEventListener('click',()=>start(true));
      ready=true;
      if(reduced||seen()||gate?.expired||!foundHome())finish(false);
      else{
        let fonts=Promise.resolve();
        try{fonts=Promise.race([
          d.fonts?.load('400 105px "Kola"')||Promise.resolve(),
          new Promise(resolve=>later(resolve,740))
        ]).catch(()=>{})}catch(_){}
        fonts.then(()=>{if(phase==='init')start(false)});
      }
    }catch(error){
      console.error('Forge shared handoff fallback:',error);
      body.classList.remove('forge-swap-ready','forge-swap-active','forge-opening');
      oldLayout.inert=false;oldLayout.removeAttribute('aria-hidden');approved.style.display='none';
      if(hero&&!oldLayout.contains(hero))oldLayout.querySelector('.forge-hero-identity')?.append(hero);
      if(!oldLayout.contains(grid))oldLayout.append(grid);
      intro.remove();gate?.endWelcome?.();gate?.release?.();
      d.dispatchEvent(new Event('forge:intro-complete'));
    }
  }
  function replayPreparation(){
    if(!intro.isConnected)body.insertBefore(intro,body.firstChild);
    if(wordmark?.parentNode!==identity)identity.insertBefore(wordmark,identity.querySelector('.forge-cine-rule'));
    wordmark?.removeAttribute('style');wordmark.className='forge-cine-wordmark';
    hero.textContent='The Forge';
    intro.hidden=false;
    intro.classList.remove('forge-swap-releasing','forge-cine-leaving','forge-cine-playing');
    pieces.forEach(piece=>{piece.style.opacity='0';piece.style.transform='none'});
    ticks.forEach(x=>x.classList.remove('is-lit'));
    counter.textContent='00';
    body.classList.add('forge-opening','forge-swap-active');
    d.documentElement.dataset.forgeIntroFinished='0';
  }
  function start(replay){
    if(!ready)return;
    seq++;clearMotion();phase='assembly';
    if(!replay&&!foundHome()){finish(false);return}
    replayPreparation();
    intro.classList.add('forge-intro-ready');
    d.documentElement.dataset.forgeIntroAnimated='1';
    gate?.release?.();
    const run=seq;
    const directions=[[-.68,-.56],[0,-1],[.68,-.56],[-1,0],[-.72,.65],[.7,.68],[0,1],[1,0]];
    const entry=pieces.map((piece,i)=>{
      const [nx,ny]=directions[i],delay=70+i*72;
      const dx=Math.round(nx*w.innerWidth*.88),dy=Math.round(ny*w.innerHeight*.84);
      const turn=[-30,17,30,-23,31,-35,-24,34][i];
      const a=piece.animate([
        {opacity:0,transform:`translate3d(${dx}px,${dy}px,0) rotate(${turn}deg) scale(.68)`,offset:0},
        {opacity:1,transform:'translate3d(0,0,0) rotate(0deg) scale(1)',offset:1}
      ],{duration:750,delay,easing:'cubic-bezier(.22,.8,.22,1)',fill:'forwards'});
      anims.push(a);
      return a.finished.catch(()=>{});
    });
    for(let i=0;i<8;i++)later(()=>{
      if(run!==seq)return;
      counter.textContent=String(i+1).padStart(2,'0');ticks[i]?.classList.add('is-lit');
    },300+i*115);
    Promise.all(entry).then(()=>{
      if(run===seq&&phase==='assembly')later(()=>handoff(run),200);
    });
    later(()=>{if(run===seq&&phase!=='done')finish()},5200);
  }
  function handoff(run){
    if(run!==seq||phase!=='assembly')return;
    phase='flight';
    const from=pieces.map(piece=>piece.getBoundingClientRect());
    const to=cards.map(card=>card.getBoundingClientRect());
    const iconTo=cards.map(card=>card.querySelector('.forge-home-icon').getBoundingClientRect());
    const fromTitle=wordmark.getBoundingClientRect(),toTitle=hero.getBoundingClientRect();
    const computed=cards.map(card=>{
      const style=getComputedStyle(card);return{bg:style.backgroundColor,fg:style.color};
    });
    const tileColors=pieces.map(piece=>getComputedStyle(piece).backgroundColor);
    const duration=940,easing='cubic-bezier(.22,.72,.16,1)';
    layer=d.createElement('div');layer.id='forgeSwapFlightLayer';layer.setAttribute('aria-hidden','true');
    body.append(layer);
    const jobs=[];
    cards.forEach((card,i)=>{
      const a=from[i],b=to[i];if(!b.width||!b.height)return;
      const ghost=d.createElement('div');ghost.className='forge-flight-card';
      ghost.style.cssText=`left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px;background:${tileColors[i]};color:${computed[i].fg}`;
      const art=d.createElement('div');art.className='forge-flight-art';
      const originalArt=card.querySelector('.home-card-art');
      if(originalArt)art.appendChild(originalArt.cloneNode(true));
      const copy=d.createElement('div');copy.className='forge-flight-copy';
      const strong=d.createElement('strong');strong.textContent=card.querySelector('.home-card-title')?.textContent||'';
      const small=d.createElement('small');small.textContent=card.querySelector('.home-card-desc')?.textContent||'';
      copy.append(strong,small);ghost.append(art,copy);layer.append(ghost);
      const dx=a.left-b.left,dy=a.top-b.top,sx=a.width/b.width,sy=a.height/b.height;
      const ghostAnim=ghost.animate([
        {offset:0,transform:`translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`},
        {offset:.47,transform:`translate3d(${dx*.46}px,${dy*.53}px,0) scale(${sx+(1-sx)*.49},${sy+(1-sy)*.49})`},
        {offset:1,transform:'translate3d(0,0,0) scale(1,1)'}
      ],{duration,easing:'linear',fill:'forwards'});
      const paint=ghost.animate([
        {offset:0,backgroundColor:tileColors[i]},
        {offset:.54,backgroundColor:computed[i].bg},
        {offset:1,backgroundColor:computed[i].bg}
      ],{duration,easing:'linear',fill:'forwards'});
      [art,copy].forEach((el,j)=>{
        const reveal=el.animate([
          {offset:0,opacity:0,transform:'translate3d(0,10px,0)'},
          {offset:j===0?.3:.52,opacity:0,transform:'translate3d(0,10px,0)'},
          {offset:j===0?.66:.88,opacity:1,transform:'translate3d(0,0,0)'},
          {offset:1,opacity:1,transform:'translate3d(0,0,0)'}
        ],{duration,easing:'linear',fill:'forwards'});
        anims.push(reveal);
      });
      const symbol=d.createElement('div');symbol.className='forge-flight-symbol';
      symbol.style.cssText=`left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;
      const svg=pieces[i].querySelector('svg')?.cloneNode(true);
      if(svg)symbol.append(svg);
      layer.append(symbol);
      const dest=iconTo[i],sdx=dest.left-a.left,sdy=dest.top-a.top,scale=dest.width/a.width;
      const symAnim=symbol.animate([
        {offset:0,transform:'translate3d(0,0,0) scale(1)'},
        {offset:.5,transform:`translate3d(${sdx*.62}px,${sdy*.54}px,0) scale(${1+(scale-1)*.5})`},
        {offset:1,transform:`translate3d(${sdx}px,${sdy}px,0) scale(${scale})`}
      ],{duration,easing:'linear',fill:'forwards'});
      const svgAnim=svg?.animate([{transform:'scale(1)'},{transform:'scale(1.47)'}],
        {duration,easing:'linear',fill:'forwards'});
      anims.push(ghostAnim,paint,symAnim);if(svgAnim)anims.push(svgAnim);
      jobs.push(ghostAnim.finished.catch(()=>{}));
    });
    const st=getComputedStyle(wordmark);
    const type={fontSize:st.fontSize,fontFamily:st.fontFamily,lineHeight:st.lineHeight,color:st.color};
    wordmark.className='forge-flight-wordmark';
    Object.assign(wordmark.style,{
      position:'fixed',left:fromTitle.left+'px',top:fromTitle.top+'px',
      width:fromTitle.width+'px',height:fromTitle.height+'px',
      fontSize:type.fontSize,fontFamily:type.fontFamily,lineHeight:type.lineHeight,
      margin:'0',padding:'0',color:type.color,transformOrigin:'top left'
    });
    layer.append(wordmark);
    const tx=toTitle.left-fromTitle.left,ty=toTitle.top-fromTitle.top;
    const mx=toTitle.width/Math.max(1,fromTitle.width),my=toTitle.height/Math.max(1,fromTitle.height);
    const titleAnim=wordmark.animate([
      {transform:'translate3d(0,0,0) scale(1,1)'},
      {transform:`translate3d(${tx}px,${ty}px,0) scale(${mx},${my})`}
    ],{duration,easing,fill:'forwards'});
    anims.push(titleAnim);
    intro.classList.add('forge-swap-releasing');
    body.classList.add('forge-home-arriving');
    Promise.all([...jobs,titleAnim.finished.catch(()=>{})]).then(()=>{
      if(run===seq&&phase==='flight')finish();
    });
  }
  // Give the original workbench handler one DOMContentLoaded turn to bind direct cards.
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>setTimeout(setupHome,0),{once:true});
  else setTimeout(setupHome,0);
})();
