/* The Forge / V2: stroke-to-solid letter construction, then one shared
   wordmark moving into the actual home heading. No card/tool mutations. */
(function () {
  'use strict';
  var intro = document.getElementById('forgeIntro');
  var mark = document.getElementById('forgeIntroType');
  var destination = document.getElementById('forgeHeroName');
  if (!intro || !mark || !destination) return;
  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false, activeTool = null;
  try {
    seen = sessionStorage.getItem('forge_intro_seen_v2') === '1';
    activeTool = localStorage.getItem('cts_activeTool');
  } catch (_) {}
  if (reduced || seen || (activeTool && activeTool !== 'home')) {
    intro.remove();
    return;
  }
  try { sessionStorage.setItem('forge_intro_seen_v2', '1'); } catch (_) {}
  document.body.classList.add('forge-opening');

  var finished = false, startTimer, handoffTimer, watchdog;
  var flight = null;
  var skip = document.getElementById('forgeIntroSkip');
  function cleanup() {
    if (finished) return;
    finished = true;
    window.clearTimeout(startTimer);
    window.clearTimeout(handoffTimer);
    window.clearTimeout(watchdog);
    document.removeEventListener('keydown', keydown);
    document.body.classList.remove('forge-opening','forge-home-arriving');
    if (flight && flight.cancel) flight.cancel();
    intro.remove();
  }
  function keydown(event) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      cleanup();
    }
  }
  if (skip) skip.addEventListener('click', cleanup, {once:true});
  document.addEventListener('keydown', keydown);
  watchdog = window.setTimeout(cleanup, 3500);

  function handoff() {
    if (finished) return;
    if (destination.getClientRects().length === 0 ||
        !mark.animate || typeof mark.getBoundingClientRect !== 'function') {
      intro.classList.add('forge-intro--ending');
      window.setTimeout(cleanup, 300);
      return;
    }
    var from = mark.getBoundingClientRect();
    var to = destination.getBoundingClientRect();
    if (!from.width || !to.width) { cleanup(); return; }
    var scale = to.width / from.width;
    var dx = to.left - from.left;
    var dy = to.top + to.height/2 - (from.top + from.height/2);
    // Strip outlines after the fill, giving the letters a solid home state.
    intro.classList.add('forge-intro--handoff');
    document.body.classList.add('forge-home-arriving');
    flight = mark.animate([
      {transform:'translate3d(0,0,0) scale(1)'},
      {transform:'translate3d('+dx+'px,'+dy+'px,0) scale('+scale+')'}
    ],{duration:670,easing:'cubic-bezier(.19,.86,.21,1)',fill:'forwards'});
    flight.onfinish = cleanup;
    // Fallback if animation completion is not delivered after backgrounding.
    handoffTimer = window.setTimeout(cleanup, 900);
  }

  function start() {
    if (finished) return;
    intro.classList.add('is-playing');
    handoffTimer = window.setTimeout(handoff, 1450);
  }
  // Avoid a branding font swap mid-reveal. Never stall the workspace for fonts.
  var fonts = document.fonts;
  var ready = fonts && fonts.load ?
    fonts.load('400 120px "Kola"').catch(function(){}) : Promise.resolve();
  Promise.race([
    ready,
    new Promise(function(resolve){ startTimer=window.setTimeout(resolve, 750); })
  ]).then(start, start);
})();
