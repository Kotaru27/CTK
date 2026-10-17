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
  const api=Object.freeze({navigate,fromOpen,selected,canTransition,cancel});
  window.ForgeWorkspaceRoute=api;
  // Retain the old extension point for any existing private usage.
  window.ForgeVideoRoute=api;
})();
