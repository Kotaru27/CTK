/* The Forge / same-origin compressor surface fitting.
   A five-file batch grows vertically, not into a second scrolling window.
   This touches the iframe element only, never the video engine or its queue. */
(function(){
  'use strict';
  const frame=document.querySelector('#section-yt-helper .forge-compressor-frame');
  if(!frame)return;
  let teardown=null;
  const attach=()=>{
    if(teardown){teardown();teardown=null;}
    let doc,win;
    try{win=frame.contentWindow;doc=frame.contentDocument;}catch{return;}
    if(!doc || !win || !doc.querySelector('.layout'))return;
    const layout=doc.querySelector('.layout');
    let queued=false,disposed=false;
    const measure=()=>{
      queued=false;
      if(disposed||!frame.isConnected)return;
      const bounds=layout.getBoundingClientRect();
      // Layout bottom includes the codec footer and padding. No use of
      // iframe viewport height, preventing a height-feedback loop.
      const desired=Math.max(610,Math.ceil(bounds.bottom+2));
      const actual=parseFloat(frame.style.height)||0;
      if(Math.abs(actual-desired)>2)frame.style.height=desired+'px';
    };
    const request=()=>{
      if(queued||disposed)return;
      queued=true;
      win.requestAnimationFrame(measure);
    };
    const observer=typeof win.ResizeObserver==='function'
      ?new win.ResizeObserver(request):null;
    if(observer)observer.observe(layout);
    win.addEventListener('resize',request);
    request();
    teardown=()=>{
      disposed=true;
      observer?.disconnect();
      win.removeEventListener('resize',request);
    };
  };
  frame.addEventListener('load',attach);
  if(frame.contentDocument?.readyState==='complete')attach();
})();
