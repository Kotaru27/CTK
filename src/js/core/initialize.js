
/* Name the existing controls without altering their handlers or values. */
(function(){
  const labels={
    globalFontFamily:'Font family', fontSizeInput:'Font size in pixels',
    globalPadding:'Image padding in pixels', globalImgPos:'Vertical image offset',
    exportWidth:'Export width in pixels', exportHeight:'Export height in pixels',
    exportFormat:'Export format', clearLogoBtn:'Clear all logos and reset settings'
  };
  for(const [id,label] of Object.entries(labels)){
    const element=document.getElementById(id);
    if(element&&!element.hasAttribute('aria-label'))element.setAttribute('aria-label',label);
  }
  const width=document.getElementById('exportWidth');
  const height=document.getElementById('exportHeight');
  if(width)width.placeholder='Width';
  if(height)height.placeholder='Height';
})();

/* Show tool names on wide screens; the existing toggle remains available. */
(function(){
  if(window.matchMedia?.('(min-width: 1280px)').matches){
    document.getElementById('mainSidebar')?.classList.remove('collapsed');
  }
})();
