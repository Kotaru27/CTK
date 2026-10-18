/* The Forge launch notes / independent from tool engines.
   Wait for the existing wordmark handoff, not an arbitrary timeout.
   No modal is opened over a restored active tool. */
(function(){
  'use strict';
  const root=document.getElementById('forgeWhatsNew');
  if(!root)return;
  const dialog=root.querySelector('.forge-whatsnew-dialog');
  const enter=root.querySelector('#forgeWhatsNewEnter');
  const never=root.querySelector('#forgeWhatsNewNever');
  const close=root.querySelector('#forgeWhatsNewClose');
  if(!dialog||!enter||!never||!close)return;
  const permanentKey='forge_whatsnew_dismissed_2026_v1';
  const sessionKey='forge_whatsnew_seen_session_2026_v1';
  let opened=false,finished=false,previousFocus=null;
  const safeGet=(store,key)=>{
    try{return store.getItem(key)==='1';}catch(_){return false;}
  };
  const safeSet=(store,key)=>{
    try{store.setItem(key,'1');}catch(_){}
  };
  function eligible(){
    if(opened||finished)return false;
    if(safeGet(localStorage,permanentKey)||safeGet(sessionStorage,sessionKey))return false;
    // A restoring workspace takes precedence over promotional content.
    const home=document.getElementById('view-home');
    const app=document.getElementById('view-app');
    return !!home && !home.classList.contains('hidden') &&
      !app?.classList.contains('active') &&
      !document.body.classList.contains('forge-opening');
  }
  function open(){
    if(!eligible())return;
    opened=true;
    safeSet(sessionStorage,sessionKey);
    previousFocus=document.activeElement;
    root.hidden=false;
    enter.focus({preventScroll:true});
  }
  function settled(){
    // Two paint frames give the Kola-to-home handoff time to settle, without
    // a fixed delay and without a transition coupled to a tool operation.
    requestAnimationFrame(()=>requestAnimationFrame(open));
  }
  function dismiss(permanent=false){
    if(!opened)return;
    if(permanent)safeSet(localStorage,permanentKey);
    opened=false;finished=true;root.hidden=true;
    if(previousFocus && previousFocus.isConnected &&
       typeof previousFocus.focus==='function')
      previousFocus.focus({preventScroll:true});
    else document.getElementById('homeContent')?.focus?.({preventScroll:true});
  }
  function focusables(){
    return [...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden');
  }
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();dismiss();return;}
    if(event.key!=='Tab')return;
    const items=focusables();
    if(!items.length)return;
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey && document.activeElement===first){
      event.preventDefault();last.focus();
    }else if(!event.shiftKey && document.activeElement===last){
      event.preventDefault();first.focus();
    }
  });
  enter.addEventListener('click',()=>dismiss());
  never.addEventListener('click',()=>dismiss(true));
  close.addEventListener('click',()=>dismiss());
  root.addEventListener('pointerdown',event=>{
    if(event.target===root)dismiss();
  });
  function ready(){
    if(document.documentElement.dataset.forgeIntroFinished==='1')settled();
    else document.addEventListener('forge:intro-complete',settled,{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
