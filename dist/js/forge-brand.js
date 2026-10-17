/* The Forge: light, interruptible, compositor-first shared wordmark.
   One kerned text node flies to an equal-font-metrics home heading.
   Never touches tool cards, processing, navigation, or saved preferences. */
(function () {
  'use strict';
  var intro = document.getElementById('forgeIntro');
  var mark = document.getElementById('forgeIntroWordmark');
  var glyphLayer = document.getElementById('forgeIntroGlyphs');
  var destination = document.getElementById('forgeHeroName');
  if (!intro || !mark || !glyphLayer || !destination) return;

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false, activeTool = null;
  try {
    seen = sessionStorage.getItem('forge_intro_seen_v4') === '1';
    activeTool = localStorage.getItem('cts_activeTool');
  } catch (_) {}
  if (reduced || seen || (activeTool && activeTool !== 'home')) {
    intro.remove();
    return;
  }
  try { sessionStorage.setItem('forge_intro_seen_v3', '1'); } catch (_) {}
  document.body.classList.add('forge-opening');

  var finished = false, flight = null, timers = [];
  var skip = document.getElementById('forgeIntroSkip');
  function after(ms, fn) {
    var id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function cleanup() {
    if (finished) return;
    finished = true;
    timers.forEach(window.clearTimeout);
    document.removeEventListener('keydown', onKey);
    if (flight) {
      flight.onfinish = null;
      flight.cancel();
    }
    // The fully transformed wordmark and the hero exchange visibility
    // in the same frame. This avoids the large-to-small snap.
    mark.style.visibility = 'hidden';
    document.body.classList.remove('forge-opening','forge-home-arriving');
    intro.remove();
  }
  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cleanup();
    }
  }
  if (skip) skip.addEventListener('click',cleanup,{once:true});
  document.addEventListener('keydown',onKey);
  // Failsafe for background tabs / disconnected animations.
  after(3200,cleanup);

  function layoutGlyphs() {
    // A single Kola text run has kerning that separate characters do not.
    // Measure each character in that *real* wordmark with a DOM Range so
    // every outline/ink overlay begins at the same advance position.
    var node = mark.firstChild;
    if (!node || node.nodeType !== 3) return false;
    var base = mark.getBoundingClientRect();
    if (!base.width || !base.height) return false;
    var children = glyphLayer.children;
    if (children.length !== node.length) return false;
    var range = document.createRange();
    for (var i=0; i<node.length; i++) {
      range.setStart(node,i);
      range.setEnd(node,i+1);
      var glyph = children[i];
      if (glyph.classList.contains('forge-intro-gap')) continue;
      var rect = range.getBoundingClientRect();
      glyph.style.left = (rect.left-base.left)+'px';
      glyph.style.top = (rect.top-base.top)+'px';
    }
    range.detach && range.detach();
    return true;
  }
  function moveToHome() {
    if (finished) return;
    var from=mark.getBoundingClientRect();
    var to=destination.getBoundingClientRect();
    if (!from.width || !to.width || !mark.animate ||
        destination.getClientRects().length === 0) { cleanup(); return; }
    // Shared-element FLIP: same text run, matching font/line height,
    // measured once after font load, then only translate+uniform scale.
    var dx=to.left-from.left;
    var dy=to.top-from.top;
    var scale=to.width/from.width;
    if (!isFinite(scale) || scale<=0) { cleanup(); return; }
    intro.classList.add('forge-intro--handoff');
    document.body.classList.add('forge-home-arriving');
    flight=mark.animate([
      {transform:'translate3d(0,0,0) scale(1)'},
      {transform:'translate3d('+dx+'px,'+dy+'px,0) scale('+scale+')'}
    ],{
      duration:760,
      easing:'cubic-bezier(.24,.86,.30,1)',
      fill:'forwards'
    });
    flight.onfinish=cleanup;
  }
  function settle() {
    if (finished) return;
    intro.classList.add('is-settled');
    after(115,function(){
      if (!finished) requestAnimationFrame(moveToHome);
    });
  }
  function play() {
    if (finished) return;
    if (!layoutGlyphs()) { cleanup(); return; }
    intro.classList.add('is-playing');
    // The last letter settles near 1.07s. The wordmark crossfades
    // immediately, then flies without a long static hold.
    after(1100,settle);
  }
  // Start only with Kola ready. If the external font is unavailable,
  // show the usable homepage instead of animating fallback and snapping.
  var fonts=document.fonts;
  if (!fonts || !fonts.load) {
    cleanup();
    return;
  }
  var timeout;
  Promise.race([
    fonts.load('400 120px "Kola"').then(function(faces){return !!(faces && faces.length);},function(){return false;}),
    new Promise(function(resolve){timeout=window.setTimeout(function(){resolve(false);},780);})
  ]).then(function(ready){
    window.clearTimeout(timeout);
    if (finished) return;
    if (!ready) { cleanup(); return; }
    requestAnimationFrame(play);
  },cleanup);
})();
