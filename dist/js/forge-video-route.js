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
    // The same damped (non-overshooting) response drives all internal
    // panels. Do not transform media, canvases or their individual controls.
    // Route snapshots own cross-tool transitions, so these two animators
    // never compete on the same surface.
    function play(element,kind){
      if(!element || !element.animate || !canAnimateWorkspace())return null;
      const distance=kind==='section'?10:7;
      const duration=kind==='section'?380:300;
      const frames=[];
      const omega=8.5,denom=1-(1+omega)*Math.exp(-omega);
      for(let i=0;i<=28;i++){
        const t=i/28;
        const p=Math.min(1,(1-(1+omega*t)*Math.exp(-omega*t))/denom);
        frames.push({offset:t,opacity:Math.min(1,.22+p),
          transform:'translate3d(0,'+((1-p)*distance).toFixed(3)+'px,0)'});
      }
      try{
        return element.animate(frames,{duration,easing:'linear'});
      }catch(_){return null;}
    }
    function canAnimateWorkspace(){
      return !(preference&&preference.matches) &&
        document.visibilityState==='visible' &&
        !root.classList.contains('forge-route-running');
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
    let frame=0,initialized=false,flight=null,lastX=null,lastWidth=null;
    const update=()=>{
      frame=0;
      const activeButton=buttons.find(button=>button.classList.contains('active-mode'));
      if(!activeButton || !host.getClientRects().length){
        flight?.cancel();flight=null;
        indicator.style.opacity='0';return;
      }
      const width=Math.max(0,activeButton.offsetWidth-16);
      const x=activeButton.offsetLeft+8;
      if(initialized && lastX===x && lastWidth===width)return;
      lastX=x;lastWidth=width;
      const target='translate3d('+x+'px,0,0)';
      if(!initialized || preference?.matches || !indicator.animate){
        flight?.cancel();flight=null;
        indicator.style.transition='none';
        indicator.style.width=width+'px';
        indicator.style.transform=target;
        indicator.style.opacity='1';
        initialized=true;
        return;
      }
      // Retarget from the actual current frame. A second click never snaps
      // the indicator back to its previous start point.
      const style=getComputedStyle(indicator);
      const previous=style.transform==='none'?0:new DOMMatrixReadOnly(style.transform).m41;
      const priorWidth=parseFloat(style.width)||width;
      flight?.cancel();
      indicator.style.transform=target;
      indicator.style.width=width+'px';
      const omega=9,denom=1-(1+omega)*Math.exp(-omega);
      const frames=[];
      for(let i=0;i<=30;i++){
        const t=i/30;
        const progress=(1-(1+omega*t)*Math.exp(-omega*t))/denom;
        frames.push({offset:t,
          transform:'translate3d('+(previous+(x-previous)*progress).toFixed(3)+'px,0,0)',
          width:(priorWidth+(width-priorWidth)*progress).toFixed(3)+'px'});
      }
      flight=indicator.animate(frames,{duration:360,easing:'linear'});
      indicator.style.opacity='1';
      flight.finished.catch(()=>{}).then(()=>{
        if(flight?.playState==='finished')flight=null;
      });
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

  // Newly generated work results get one short, physically damped arrival.
  // No decorative entrance is applied to individual pixels, canvas, video,
  // labels, inputs or buttons; processing continues independently.
  function attachResultArrival(){
    if(typeof MutationObserver!=='function')return;
    const targets=[
      ['logoGrid','.logo-card-item'],
      ['pdfStacksContainer','.pdf-stack-wrapper'],
      ['splitGrid','.logo-card-item'],
      ['stillsStacksContainer','.pdf-stack-wrapper'],
      ['storyFileList','.story-asset-row'],
      ['filmstripFileList','.story-asset-row'],
      ['adDlTableBody','tr'],
      ['adDlRequestedBody','tr'],
      ['adDlDownloadedBody','tr']
    ];
    const omega=9;
    const normalizer=1-(1+omega)*Math.exp(-omega);
    const frames=Array.from({length:21},(_,i)=>{
      const t=i/20;
      const p=Math.min(1,(1-(1+omega*t)*Math.exp(-omega*t))/normalizer);
      return {offset:t,opacity:Math.min(1,.74+.26*p),
        transform:'translate3d(0,'+((1-p)*5).toFixed(3)+'px,0)'};
    });
    const observers=[];
    const observe=(id,selector)=>{
      const target=document.getElementById(id);
      if(!target)return;
      const observer=new MutationObserver(records=>{
        if(preference?.matches || document.visibilityState!=='visible' ||
           root.classList.contains('forge-route-running'))return;
        const added=[];
        for(const record of records){
          for(const node of record.addedNodes){
            if(node.nodeType!==1)continue;
            if(node.matches?.(selector))added.push(node);
            for(const item of node.querySelectorAll?.(selector)||[])added.push(item);
          }
        }
        // Large imports must never enqueue dozens of animations; an import
        // is a single useful result, not a series of cards waiting to appear.
        if(!added.length || added.length>8)return;
        const unique=[...new Set(added)];
        for(const node of unique){
          if(!node.isConnected || !node.getClientRects().length ||
             typeof node.animate!=='function')continue;
          try{node.animate(frames,{duration:300,easing:'linear'});}
          catch(_){}
        }
      });
      observer.observe(target,{childList:true,subtree:true});
      observers.push(observer);
    };
    for(const [id,selector] of targets)observe(id,selector);
    // Requested/verified download tables can be created after first import.
    const table=document.getElementById('adDlTableContainer');
    if(table){
      const discover=new MutationObserver(()=>{
        for(const [id,selector] of targets.slice(7)){
          if(document.getElementById(id) && !document.getElementById(id).dataset.forgeResultObserved){
            document.getElementById(id).dataset.forgeResultObserved='1';
            observe(id,selector);
          }
        }
      });
      discover.observe(table,{childList:true,subtree:true});
      observers.push(discover);
    }
  }
  attachResultArrival();

  const api=Object.freeze({navigate,fromOpen,selected,canTransition,cancel});
  window.ForgeWorkspaceRoute=api;
  // Retain the old extension point for any existing private usage.
  window.ForgeVideoRoute=api;
})();
