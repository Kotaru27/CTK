/* The Forge: non-blocking, once-per-session brand reveal.
   Does not change tool logic, saved theme, navigation or existing cards. */
(function () {
  'use strict';
  var intro = document.getElementById('forgeIntro');
  if (!intro) return;
  var seen = false;
  var activeTool = null;
  try {
    seen = sessionStorage.getItem('forge_intro_seen_v1') === '1';
    activeTool = localStorage.getItem('cts_activeTool');
  } catch (_) { /* Storage can be unavailable in privacy modes. */ }
  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (seen || reducedMotion || (activeTool && activeTool !== 'home')) {
    intro.remove();
    return;
  }
  try { sessionStorage.setItem('forge_intro_seen_v1', '1'); } catch (_) {}
  var dismissed = false;
  var timeout;
  function finish() {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(timeout);
    document.removeEventListener('keydown', onKey);
    intro.classList.add('forge-intro--leaving');
    window.setTimeout(function () { intro.remove(); }, 450);
  }
  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
  }
  intro.addEventListener('click', finish, {once:true});
  document.addEventListener('keydown', onKey);
  timeout = window.setTimeout(finish, 1850);
})();
