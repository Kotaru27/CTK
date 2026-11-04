/* Presentation-only logo geometry: no image processing or export modifications. */
(() => {
  const grid = document.getElementById('logoGrid');
  const widthInput = document.getElementById('exportWidth');
  const heightInput = document.getElementById('exportHeight');
  if (!grid || !widthInput || !heightInput) return;

  // Reuse the original Home action from the hidden legacy header. This adds
  // no navigation route or tool behavior; the compact title exposes it again.
  const title = document.querySelector('#section-logo .tool-header > h2');
  const homeControl = document.querySelector('body > .header .brand-title');
  if (title && homeControl && !title.parentElement.querySelector('.forge-logo-home')) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'forge-logo-home';
    back.textContent = 'The Forge';
    back.setAttribute('aria-label','Return to The Forge home');
    back.addEventListener('click',()=>homeControl.click());
    title.before(back);
  }

  let queued = false;
  const valid = n => Number.isFinite(n) && n > 0 && n <= 32768;
  function fitCard(card) {
    const canvas = card.querySelector('.card-preview-area canvas');
    if (!canvas) return;
    // The original renderer sets backing dimensions on this very canvas.
    const w = valid(canvas.width) ? canvas.width : Number(widthInput.value);
    const h = valid(canvas.height) ? canvas.height : Number(heightInput.value);
    if (!valid(w) || !valid(h)) return;
    const longest = Math.max(w,h);
    const edge = Math.max(200,Math.min(292,200+(longest-200)*.115));
    const scale = edge / longest;
    const cw = Math.max(12,Math.round(w*scale));
    const ch = Math.max(12,Math.round(h*scale));
    card.style.setProperty('--lr-card-width', Math.max(230,cw+22)+'px');
    card.style.setProperty('--lr-canvas-width',cw+'px');
    card.style.setProperty('--lr-canvas-height',ch+'px');
    card.style.setProperty('--lr-stage-height',Math.max(79,ch+20)+'px');
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      grid.querySelectorAll(':scope > .logo-card-item').forEach(fitCard);
    });
  }
  // Import, extraction, per-file edits and global dimension changes all reuse
  // the actual original canvas, including native per-file aspect ratios.
  const observer = new MutationObserver(schedule);
  observer.observe(grid,{subtree:true,childList:true,attributes:true,attributeFilter:['width','height']});
  for (const input of [widthInput,heightInput]) input.addEventListener('input',schedule);
  schedule();
})();
