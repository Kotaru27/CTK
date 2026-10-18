/* The Forge first-paint coordinator.
   Runs inside HEAD before all network scripts; always fails open.
   No storage or font request may block the actual tool workspace. */
(function(){
  'use strict';
  const root=document.documentElement;
  root.classList.add('forge-preflight');
  let permanent=false,suppressed=false,guardTimer=0;
  try{permanent=localStorage.getItem('forge_whatsnew_dismissed_2026_v3')==='1';}catch(_){}
  try{suppressed=sessionStorage.getItem('forge_whatsnew_suppress')==='1';}catch(_){}
  root.classList.toggle('forge-welcome-expected',!permanent&&!suppressed);
  const gate={
    expired:false,
    release(){
      root.classList.remove('forge-preflight');
    },
    beginWelcome(){
      if(this.expired||!root.classList.contains('forge-welcome-expected'))return;
      root.classList.add('forge-welcome-pending');
      clearTimeout(guardTimer);
      // Even if the welcome bundle is blocked, the homepage recovers.
      guardTimer=setTimeout(()=>this.endWelcome(),2800);
    },
    endWelcome(){
      clearTimeout(guardTimer);
      root.classList.remove('forge-welcome-pending');
    }
  };
  window.__forgePaintGate=gate;
  // External libraries above the body can stall document parsing.
  // Release the shield and bypass the intro rather than leave a blank app.
  setTimeout(()=>{
    if(!root.classList.contains('forge-preflight'))return;
    gate.expired=true;
    gate.release();
    gate.endWelcome();
  },6500);
})();
