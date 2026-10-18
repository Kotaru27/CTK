/* The Forge welcome / first-launch announcement and manual replay.
   Intro completion controls timing; no fonts, images or network requests.
   Every close path is usable and preserves keyboard focus. */
(function(){
  'use strict';
  const root=document.getElementById('forgeWhatsNew');
  if(!root)return;
  const dialog=root.querySelector('.forge-whatsnew-dialog');
  const trigger=document.getElementById('forgeWhatsNewTrigger');
  const enter=root.querySelector('#forgeWhatsNewEnter');
  const never=root.querySelector('#forgeWhatsNewNever');
  const close=root.querySelector('#forgeWhatsNewClose');
  if(!dialog||!enter||!never||!close)return;

  const seenKey='forge_whatsnew_seen_launch_2026_v2';
  const permanentKey='forge_whatsnew_dismissed_2026_v1';
  let opened=false,previousFocus=null,automaticTimer=0,autoAttempted=false;
  function safeGet(key){
    try{if(localStorage.getItem(key)==='1')return true;}catch(_){}
    try{return sessionStorage.getItem(key)==='1';}catch(_){return false;}
  }
  function safeSet(key){
    try{localStorage.setItem(key,'1');return;}catch(_){}
    try{sessionStorage.setItem(key,'1');}catch(_){}
  }
  function homeActive(){
    const home=document.getElementById('view-home');
    const app=document.getElementById('view-app');
    return !!home&&!home.classList.contains('hidden')&&
      !app?.classList.contains('active')&&
      !document.body.classList.contains('forge-opening')&&
      document.visibilityState!=='hidden';
  }
  function open(automatic=false){
    if(opened)return;
    // A requested popup is never lost behind the optional intro.
    if(!automatic&&document.body.classList.contains('forge-opening'))
      document.getElementById('forgeIntroSkip')?.click();
    if(!homeActive())return;
    if(automatic&&safeGet(seenKey))return;
    clearTimeout(automaticTimer);
    opened=true;
    previousFocus=automatic?null:document.activeElement;
    root.hidden=false;
    trigger?.setAttribute?.('aria-expanded','true');
    safeSet(seenKey);
    enter.focus({preventScroll:true});
  }
  function dismiss(permanent=false){
    if(!opened)return;
    if(permanent)safeSet(permanentKey);
    safeSet(seenKey);
    opened=false;
    root.hidden=true;
    trigger?.setAttribute?.('aria-expanded','false');
    if(previousFocus?.isConnected&&typeof previousFocus.focus==='function')
      previousFocus.focus({preventScroll:true});
    else trigger?.focus?.({preventScroll:true});
    previousFocus=null;
  }
  function queueAutomatic(){
    if(autoAttempted)return;
    autoAttempted=true;
    if(safeGet(seenKey))return;
    automaticTimer=setTimeout(()=>open(true),420);
  }
  function focusables(){
    return [...dialog.querySelectorAll(
      'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )].filter(el=>el.getClientRects().length&&
      getComputedStyle(el).visibility!=='hidden');
  }
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();dismiss();return;}
    if(event.key!=='Tab')return;
    const items=focusables();
    if(!items.length)return;
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();last.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();first.focus();
    }
  });
  enter.addEventListener('click',()=>dismiss());
  never.addEventListener('click',()=>dismiss(true));
  close.addEventListener('click',()=>dismiss());
  root.addEventListener('pointerdown',event=>{
    if(event.target===root)dismiss();
  });
  if(trigger){
    trigger.hidden=false;
    trigger.setAttribute?.('aria-expanded','false');
    trigger.addEventListener('click',()=>open(false));
  }
  // The actual introduction is the source of truth; never run a
  // competing timeout that appears over a partially animated home.
  document.addEventListener('forge:intro-complete',queueAutomatic,{once:true});
  if(document.documentElement.dataset.forgeIntroFinished==='1'||
     (!document.body.classList.contains('forge-opening')&&
       document.getElementById('forgeIntro')?.hidden))
    queueAutomatic();
})();
