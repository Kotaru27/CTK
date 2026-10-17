/* The Forge / Video Stills route pilot.
   The application still performs the original _openTool/_showHome mutation.
   This tiny presentation wrapper only captures the before/after snapshots. */
(function(){
  'use strict';
  let active=null;
  let serial=0;
  const root=document.documentElement;
  const preference=window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)');

  function canTransition(){
    return typeof document.startViewTransition==='function' &&
      !(preference && preference.matches) &&
      document.visibilityState==='visible';
  }
  function navigate(change){
    if(typeof change!=='function')return;
    // Keep original synchronous navigation in older browsers, background
    // tabs and accessibility modes. Never insert a fixed waiting period.
    if(!canTransition()){
      ++serial;
      if(active) {
        active.skipTransition();
        active=null;
      }
      root.classList.remove('forge-video-route-running');
      change();
      return;
    }
    // Interruption is immediate: no queued animations, no double navigation.
    if(active)active.skipTransition();
    const token=++serial;
    root.classList.add('forge-video-route-running');
    let transition;
    try{
      transition=document.startViewTransition(()=>{
        // Old update callbacks may be scheduled a frame later; never allow
        // a superseded navigation to overwrite the user's newest choice.
        if(token===serial)change();
      });
    }catch(_){
      root.classList.remove('forge-video-route-running');
      change();
      return;
    }
    active=transition;
    transition.finished.catch(()=>{}).then(()=>{
      if(token!==serial)return;
      if(active===transition)active=null;
      root.classList.remove('forge-video-route-running');
    });
  }
  window.ForgeVideoRoute=Object.freeze({navigate,canTransition});
})();