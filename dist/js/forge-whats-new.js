/* The Forge welcome / purposeful, dismissible onboarding.
   Continue closes this visit; Don't show again persists across visits.
   Font preparation remains bounded to avoid an unstyled popup. */
(function(){
  'use strict';
  const root=document.getElementById('forgeWhatsNew');
  if(!root)return;
  const dialog=root.querySelector('.forge-whatsnew-dialog');
  const trigger=document.getElementById('forgeWhatsNewTrigger');
  const never=root.querySelector('#forgeWhatsNewNever');
  const continueBtn=root.querySelector('#forgeWhatsNewContinue');
  if(!dialog||!never||!continueBtn)return;

  // Permanent opt-out is distinct from dismissing once this session.
  const permanentKey='forge_whatsnew_dismissed_2026_v3';
  const sessionKey='forge_whatsnew_seen_2026_v3';
  let opened=false,preparing=false,previousFocus=null;
  let autoAttempted=false,openSerial=0,fontsReady=null;
  const paintGate=typeof window!=='undefined'?window.__forgePaintGate:null;
  function safeGet(key){
    try{if(localStorage.getItem(key)==='1')return true;}catch(_){}
    try{return sessionStorage.getItem(key)==='1';}catch(_){return false;}
  }
  function safeSet(key){
    try{localStorage.setItem(key,'1');return;}catch(_){}
    try{sessionStorage.setItem(key,'1');}catch(_){}
  }
  function markSeen(){try{sessionStorage.setItem(sessionKey,'1');}catch(_){}}
  function sessionSeen(){try{return sessionStorage.getItem(sessionKey)==='1';}catch(_){return false;}}
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
    // A single hung font must not discard the faces that did load:
    // capture readiness independently before the bounded deadline.
    const available=specs.map(()=>false);
    const requests=specs.map(([spec],i)=>
      load(spec).then(faces=>{available[i]=!!faces?.length;})
    );
    fontsReady=Promise.race([
      Promise.all(requests),
      new Promise(resolve=>setTimeout(resolve,1850))
    ]).then(()=>{
      specs.forEach(([,className],i)=>{
        if(!available[i]||
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
    if(!homeActive()||(automatic&&(safeGet(permanentKey)||sessionSeen())))return;
    autoAttempted=true;
    preparing=true;
    const token=++openSerial;
    const restoreFocus=automatic?null:document.activeElement;
    readyTypography().then(()=>{
      if(token!==openSerial)return;
      preparing=false;
      if(!homeActive()){paintGate?.endWelcome?.();return;}
      opened=true;
      previousFocus=restoreFocus;
      root.hidden=false;
      paintGate?.endWelcome?.();
      trigger?.setAttribute?.('aria-expanded','true');
      continueBtn.focus({preventScroll:true});
    });
  }
  function dismiss(permanent=false){
    if(!opened)return;
    markSeen();
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
    // Automated audits may suppress onboarding. Normal visitors see it once
    // per session, while explicit opt-out also covers future sessions.
    let auditSkip=false;
    try{auditSkip=sessionStorage.getItem('forge_whatsnew_suppress')==='1';}catch(_){}
    if(autoAttempted||safeGet(permanentKey)||sessionSeen()||auditSkip||
       paintGate?.expired){
      paintGate?.endWelcome?.();
      return;
    }
    autoAttempted=true;
    // Fonts were requested during the intro, not after it. Open in the
    // completion turn; the first-paint curtain bridges any slow font.
    open(true);
  }
  function focusables(){
    return [...dialog.querySelectorAll(
      'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )].filter(el=>el.getClientRects().length&&
      getComputedStyle(el).visibility!=='hidden');
  }
  root.addEventListener('keydown',event=>{
    // Standard dialog dismissal behaves like Continue, never opt-out.
    if(event.key==='Escape'){event.preventDefault();dismiss(false);return;}
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
  never.addEventListener('click',()=>dismiss(true));
  continueBtn.addEventListener('click',()=>dismiss(false));
  root.addEventListener('pointerdown',event=>{
    if(event.target===root)dismiss(false);
  });
  if(trigger){
    trigger.hidden=false;
    trigger.setAttribute?.('aria-expanded','false');
    trigger.addEventListener('click',()=>open(false));
  }
  // Start preparing presentation fonts while the logo is still typing.
  // This avoids the previous 420ms dead time plus network delay.
  readyTypography();
  document.addEventListener('forge:intro-complete',queueAutomatic,{once:true});
  if(document.documentElement.dataset.forgeIntroFinished==='1'||
     (!document.body.classList.contains('forge-opening')&&
       document.getElementById('forgeIntro')?.hidden))
    queueAutomatic();
})();
