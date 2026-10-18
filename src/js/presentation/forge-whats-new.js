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

  const permanentKey='forge_whatsnew_dismissed_2026_v1';
  let opened=false,preparing=false,previousFocus=null;
  let automaticTimer=0,autoAttempted=false,openSerial=0,fontsReady=null;
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
  // Hide the *entire dialog* while resolving the exact typefaces it
  // uses. Never display fallback glyphs and then replace them in place.
  // If a network request stalls, freeze the appropriate system family
  // for this popup so a late download cannot cause a second layout.
  function readyTypography(){
    if(fontsReady)return fontsReady;
    const specs=[
      ['400 80px "Kola"','forge-fallback-kola'],
      ['600 16px "Plus Jakarta Sans"','forge-fallback-ui'],
      ['italic 400 38px "Instrument Serif"','forge-fallback-serif'],
      ['600 11px "JetBrains Mono"','forge-fallback-mono']
    ];
    const load=spec=>{
      try{return Promise.resolve(document.fonts?.load?.(spec)||[]).catch(()=>[]);}
      catch(_){return Promise.resolve([]);}
    };
    fontsReady=Promise.race([
      Promise.all(specs.map(([spec])=>load(spec))),
      new Promise(resolve=>setTimeout(()=>resolve(null),1850))
    ]).then(results=>{
      specs.forEach(([,className],i)=>{
        if(!results?.[i]?.length||
           (className==='forge-fallback-kola'&&
            document.documentElement.classList.contains('forge-launch-fallback-kola')))
          root.classList.add(className);
      });
    }).catch(()=>{
      specs.forEach(([,className])=>root.classList.add(className));
    });
    return fontsReady;
  }
  function open(automatic=false){
    if(opened||preparing)return;
    // An intentional click cancels the intro and its scheduled auto-open.
    if(!automatic&&document.body.classList.contains('forge-opening'))
      document.getElementById('forgeIntroSkip')?.click();
    if(!homeActive()||(automatic&&safeGet(permanentKey)))return;
    clearTimeout(automaticTimer);
    autoAttempted=true;
    preparing=true;
    const token=++openSerial;
    const restoreFocus=automatic?null:document.activeElement;
    readyTypography().then(()=>{
      if(token!==openSerial)return;
      preparing=false;
      if(!homeActive())return;
      opened=true;
      previousFocus=restoreFocus;
      root.hidden=false;
      trigger?.setAttribute?.('aria-expanded','true');
      enter.focus({preventScroll:true});
    });
  }
  function dismiss(permanent=false){
    if(!opened)return;
    if(permanent)safeSet(permanentKey);
    opened=false;
    root.hidden=true;
    trigger?.setAttribute?.('aria-expanded','false');
    if(previousFocus?.isConnected&&typeof previousFocus.focus==='function')
      previousFocus.focus({preventScroll:true});
    else trigger?.focus?.({preventScroll:true});
    previousFocus=null;
  }
  function queueAutomatic(){
    // Automated browser audits intentionally suppress onboarding, but an
    // ordinary visitor sees it on every fresh page until explicit opt-out.
    let auditSkip=false;
    try{auditSkip=sessionStorage.getItem('forge_whatsnew_suppress')==='1';}catch(_){}
    if(autoAttempted||safeGet(permanentKey)||auditSkip)return;
    autoAttempted=true;
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
