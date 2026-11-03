/* THE FORGE / WORKBENCH V2
   Progressive enhancement only. All eight original home-card onclick handlers,
   tool route logic, imports, processing, exports and keyboard flows are untouched. */
(function () {
  'use strict';

  function setup() {
    const home = document.getElementById('view-home');
    const grid = document.getElementById('homeContent');
    const search = document.getElementById('forgeToolSearch');
    const status = document.getElementById('forgeSearchCount');
    const featured = document.getElementById('forgeFeaturedLabel');
    const sidebar = document.getElementById('mainSidebar');
    if (!home || !grid || !search || !status || !featured || !sidebar) return;
    if (grid.dataset.forgeWorkbenchReady === '1') return;
    grid.dataset.forgeWorkbenchReady = '1';

    const cards = Array.from(grid.querySelectorAll(':scope > button.home-card'));
    if (cards.length !== 8) return;
    const normalize = value => String(value || '').normalize('NFKD')
      .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
    const names = cards.map(card => (
      card.querySelector('.home-card-title')?.textContent || ''
    ).trim());
    const descriptions = cards.map(card => (
      card.querySelector('.home-card-desc')?.textContent || ''
    ).trim());
    const empty = document.createElement('div');
    empty.id = 'forgeNoResults';
    empty.hidden = true;
    empty.setAttribute('role','status');
    const head = document.createElement('strong');
    head.textContent = 'No matching tools';
    const help = document.createElement('p');
    help.textContent = 'Try a different search, or press Escape to see all eight.';
    empty.append(head,help);
    grid.append(empty);

    function updateFilter() {
      const query = normalize(search.value);
      let visible = 0;
      let first = null;
      cards.forEach((card,index)=>{
        const matched = !query || normalize(names[index]+' '+descriptions[index]).includes(query);
        card.classList.toggle('forge-filtered-out',!matched);
        if(matched) {
          visible++;
          if(!first) first=card;
        }
      });
      status.textContent = String(visible).padStart(2,'0')+' / 08';
      status.setAttribute('aria-label',visible+' of 8 tools shown');
      empty.hidden = visible!==0;
      grid.classList.toggle('forge-search-active',query.length>0);
      return first;
    }

    search.addEventListener('input',updateFilter);
    search.addEventListener('keydown',event=>{
      if(event.key === 'Escape') {
        if(search.value) {search.value='';updateFilter();}
        search.blur();
        event.preventDefault();
      } else if(event.key === 'Enter') {
        const first=cards.find(card=>!card.classList.contains('forge-filtered-out'));
        if(first) {
          event.preventDefault();
          first.click();
        }
      }
    });

    function homeAvailable() {
      if(home.classList.contains('hidden')) return false;
      if(document.body.classList.contains('forge-opening')) return false;
      const intro=document.getElementById('forgeIntro');
      const welcome=document.getElementById('forgeWhatsNew');
      if(intro && !intro.hidden && intro.classList.contains('forge-intro-ready')) return false;
      if(welcome && !welcome.hidden) return false;
      return true;
    }
    document.addEventListener('keydown',event=>{
      if(event.key!=='/'||event.ctrlKey||event.metaKey||event.altKey||event.repeat) return;
      const target=event.target;
      if(target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
      if(!homeAvailable())return;
      event.preventDefault();
      search.focus();
    });

    cards.forEach((card,index)=>{
      const select=()=>{featured.textContent=names[index];};
      const reset=()=>{if(!cards.some(c=>c.matches(':hover,:focus-visible')))featured.textContent='Select a workspace';};
      card.addEventListener('pointerenter',select);
      card.addEventListener('focus',select);
      card.addEventListener('pointerleave',reset);
      card.addEventListener('blur',reset);
    });

    // Group the original tool buttons in the expanded rail without reparenting
    // them or changing their IDs, click handlers, active states or order.
    for(const [before,label] of [
      ['nav-logo','CREATE'],
      ['nav-stills-video','FRAME & COMPOSE'],
      ['nav-adlinks-gen','DELIVER']
    ]) {
      const target=document.getElementById(before);
      if(!target || target.parentElement!==sidebar)continue;
      const marker=document.createElement('div');
      marker.className='forge-rail-group';
      marker.textContent=label;
      marker.setAttribute('aria-hidden','true');
      sidebar.insertBefore(marker,target);
    }
    search.setAttribute('aria-keyshortcuts','/');
    updateFilter();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
