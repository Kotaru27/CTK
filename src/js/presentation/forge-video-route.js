/* THE FORGE / UNIFIED WORKSPACE MOTION
   Native snapshots of unchanged home cards and real workspace headings.
   The existing _openTool/_showHome remain the sole owners of application state.
   No media, uploads, exports, tool modes or controls are touched. */
(function(){
  'use strict';
  const root=document.documentElement;
  const preference=window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)');
  const routes=Object.freeze({
    'section-logo': 'logo',
    'section-yt-helper': 'video'
  });
  const byNav=Object.freeze({
    'nav-logo':'logo',
    'nav-pdf-image':'pdf',
    'nav-pdf-split':'split',
    'nav-stills-video':'stills',
    'nav-stills-story':'story',
    'nav-adlinks-gen':'links',
    'nav-adlinks-dl':'ads',
    'nav-yt-helper':'video'
  });
  const keys=new Set(Object.values(byNav));
  let active=null;
  let serial=0;

  function fromOpen(id,mode){
    if(routes[id])return routes[id];
    if(id==='section-pdf')return mode==='split'?'split':'pdf';
    if(id==='section-stills-boards')
      return ['story','filmstrip','fit'].includes(mode)?'story':'stills';
    if(id==='section-adlinks')return mode==='downloader'?'ads':'links';
    return null;
  }
  function selected(){
    const nav=document.querySelector('.nav-sidebar .nav-item.active');
    return nav && byNav[nav.id] || null;
  }
  function canTransition(){
    return typeof document.startViewTransition==='function' &&
      !(preference&&preference.matches) &&
      document.visibilityState==='visible';
  }
  function clear(){
    root.classList.remove('forge-route-running');
    delete root.dataset.forgeRoute;
    delete root.dataset.forgeRouteTravel;
  }
  function cancel(){
    ++serial;
    const previous=active;
    active=null;
    if(previous)previous.skipTransition();
    clear();
  }
  function navigate(change,key){
    if(typeof change!=='function')return;
    if(!keys.has(key)||!canTransition()){
      cancel();
      change();
      return;
    }
    if(active)active.skipTransition();
    const token=++serial;
    root.dataset.forgeRoute=key;
    // The user is doing one of three fundamentally different things.
    // Home -> tool and tool -> home keep the shared title; tool -> tool
    // keeps the shell stationary and exchanges only the working surface.
    const inside=document.getElementById('view-app')?.classList.contains('active');
    root.dataset.forgeRouteTravel=inside?(selected()===key?'return':'tool'):'home';
    root.classList.add('forge-route-running');
    let transition;
    try{
      transition=document.startViewTransition(()=>{
        // Stale deferred callbacks never overwrite a more recent selection.
        if(token===serial)change();
      });
    }catch(_){
      clear();
      change();
      return;
    }
    active=transition;
    transition.finished.catch(()=>{}).then(()=>{
      if(token!==serial)return;
      if(active===transition)active=null;
      clear();
    });
  }
  // One visual coordinator for every workspace. Observe the existing
  // class/style mutations instead of intercepting UI methods or tool engines.
  // Navigation, tab selection, focus and exports therefore remain synchronous.
  const workspaces=[
    'section-logo','section-pdf','section-stills-boards',
    'section-adlinks','section-yt-helper'
  ];
  const panelIds=[
    'pdfTabContentConvert','pdfTabContentSplit',
    'stillsTabContentStory','stillsTabContentVideo',
    'stillsTabContentFilmstrip','stillsTabContentFit',
    'adlinksTabContentGen','adlinksTabContentDownloader'
  ];
  function attachWorkspaceObserver(){
    const host=document.getElementById('view-app');
    if(!host || typeof MutationObserver!=='function')return;
    const sections=workspaces.map(id=>document.getElementById(id)).filter(Boolean);
    const panels=panelIds.map(id=>document.getElementById(id)).filter(Boolean);
    const activeSection=()=>host.classList.contains('active')
      ? sections.find(el=>el.classList.contains('active'))||null : null;
    const shown=el=>{
      const section=el.closest('.tool-section');
      return !!(section && section===activeSection() &&
        getComputedStyle(el).display!=='none' && el.getClientRects().length);
    };
    let lastSection=activeSection();
    const wasShown=new Map(panels.map(el=>[el,shown(el)]));
    let sectionFlight=null, panelFlight=null;
    function play(element,kind){
      if(!element || !element.animate || !canAnimateWorkspace(kind==='panel'))return null;
      const distance=kind==='section'?4:3;
      const duration=kind==='section'?220:180;
      try{
        return element.animate([
          {opacity:kind==='section'?.95:.92,transform:'translate3d(0,'+distance+'px,0)'},
          {opacity:1,transform:'translate3d(0,0,0)'}
        ],{duration,easing:'cubic-bezier(.2,.7,.2,1)'});
      }catch(_){return null;}
    }
    function canAnimateWorkspace(isPanel=false){
      // Native route snapshots suppress section entrances, not an explicit
      // user-triggered mode switch that can occur while a snapshot finishes.
      return !(preference&&preference.matches) &&
        document.visibilityState==='visible' &&
        (isPanel || !root.classList.contains('forge-route-running'));
    }
    function reconcile(){
      const nextSection=activeSection();
      const changed=nextSection!==lastSection;
      lastSection=nextSection;
      if(changed){
        if(sectionFlight)sectionFlight.cancel();
        if(panelFlight)panelFlight.cancel();
        sectionFlight=nextSection?play(nextSection,'section'):null;
        panelFlight=null;
      }
      // Update the ledger on *every* route, including native snapshots, so
      // re-entering a previous tab does not replay stale opening animations.
      for(const panel of panels){
        const now=shown(panel),previous=wasShown.get(panel);
        wasShown.set(panel,now);
        if(now&&!previous&&!changed&&canAnimateWorkspace(true)){
          if(panelFlight)panelFlight.cancel();
          panelFlight=play(panel,'panel');
        }
      }
    }
    const observer=new MutationObserver(reconcile);
    observer.observe(host,{attributes:true,attributeFilter:['class']});
    for(const el of sections)
      observer.observe(el,{attributes:true,attributeFilter:['class']});
    for(const el of panels)
      observer.observe(el,{attributes:true,attributeFilter:['style','class','hidden']});
    if(preference&&preference.addEventListener)
      preference.addEventListener('change',()=>{
        if(preference.matches){
          if(sectionFlight)sectionFlight.cancel();
          if(panelFlight)panelFlight.cancel();
        }
      });
  }
  attachWorkspaceObserver();

  // Storyboard's Board / Filmstrip / Fit buttons share one active indicator.
  // This is a visual overlay only; existing button handlers still own state,
  // focus, export and panel visibility. Positions are measured from the real
  // buttons so no tool geometry, breakpoints or order are hardcoded.
  function attachStoryModeIndicator(){
    const host=document.getElementById('storySubModeToggle');
    if(!host || typeof MutationObserver!=='function')return;
    const buttons=[
      document.getElementById('subModeBtnBoard'),
      document.getElementById('subModeBtnFilmstrip'),
      document.getElementById('subModeBtnFit')
    ].filter(Boolean);
    if(buttons.length!==3 || document.getElementById('forgeStoryModeIndicator'))return;
    const indicator=document.createElement('span');
    indicator.id='forgeStoryModeIndicator';
    indicator.className='forge-story-mode-indicator';
    indicator.setAttribute('aria-hidden','true');
    host.appendChild(indicator);
    let frame=0,initialized=false;
    const update=()=>{
      frame=0;
      const activeButton=buttons.find(button=>button.classList.contains('active-mode'));
      if(!activeButton || !host.getClientRects().length){
        indicator.style.opacity='0';return;
      }
      // First placement is instantaneous; subsequent changes animate.
      const width=Math.max(0,activeButton.offsetWidth-16);
      const x=activeButton.offsetLeft+8;
      if(!initialized){
        indicator.style.transition='none';
        indicator.style.width=width+'px';
        indicator.style.transform='translate3d('+x+'px,0,0)';
        indicator.style.opacity='1';
        initialized=true;
        requestAnimationFrame(()=>{indicator.style.removeProperty('transition');});
      }else{
        indicator.style.width=width+'px';
        indicator.style.transform='translate3d('+x+'px,0,0)';
        indicator.style.opacity='1';
      }
    };
    const schedule=()=>{
      if(frame)cancelAnimationFrame(frame);
      frame=requestAnimationFrame(update);
    };
    const observer=new MutationObserver(schedule);
    for(const button of buttons)
      observer.observe(button,{attributes:true,attributeFilter:['class','style']});
    observer.observe(host,{attributes:true,attributeFilter:['style']});
    if(typeof ResizeObserver==='function'){
      const resize=new ResizeObserver(schedule);
      resize.observe(host);
      for(const button of buttons)resize.observe(button);
    }else window.addEventListener('resize',schedule,{passive:true});
    schedule();
  }
  attachStoryModeIndicator();

  const api=Object.freeze({navigate,fromOpen,selected,canTransition,cancel});
  window.ForgeWorkspaceRoute=api;
  // Retain the old extension point for any existing private usage.
  window.ForgeVideoRoute=api;
})();
