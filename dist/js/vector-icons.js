
/* Self-contained vector icon layer: preserves the icon class and DOM contracts,
   but does not require Google's Material Symbols font to draw the interface. */
(() => {
  const I = {
    deployed_code: '<path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m8.5 10-2 2 2 2m7-4 2 2-2 2m-2-6-3 8"/>',
    dark_mode: '<path d="M20.5 14a8.5 8.5 0 0 1-10.5-10.5A8.5 8.5 0 1 0 20.5 14Z"/>',
    light_mode: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    left_panel_close: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m7-12-3 3 3 3"/>',
    left_panel_open: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m4-12 3 3-3 3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 16-5.5-5.5L5 21"/>',
    picture_as_pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 16l2-2 2 2 4-4"/>',
    content_cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.12 8.12 21 21M14 10 21 3M8.12 15.88l3.46-3.46"/>',
    movie: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 8V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3M7 3l3 5m2-5 3 5m2-5 3 5"/>',
    view_timeline: '<path d="M3 5h18M3 12h18M3 19h18"/><rect x="5" y="3" width="7" height="4" rx="1"/><rect x="12" y="10" width="8" height="4" rx="1"/><rect x="7" y="17" width="6" height="4" rx="1"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 1 0 7 7l1.7-1.7"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    video_library: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M7 3h10M10 11l6 3.5-6 3.5Z"/>',
    arrow_outward: '<path d="M6 18 18 6M8 6h10v10"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    delete: '<path d="M3 6h18m-2 0-.8 14a2 2 0 0 1-2 2H7.8a2 2 0 0 1-2-2L5 6m4 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M10 10v8m4-8v8"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    grid_view: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    theaters: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16m10-16v16M3 9h4m-4 6h4m10-6h4m-4 6h4m-11-7 6 4-6 4Z"/>',
    description: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>',
    table_view: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18m-12 0v12m6-12v12"/>',
    smart_display: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m10 8 6 4-6 4Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>',
    tune: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    adjust: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    videocam: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-4v12l-5-4"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 14h4"/>',
    sort_by_alpha: '<path d="m3 16 4-10 4 10M4 13h6M15 6h6l-6 10h6"/>',
    content_copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
    check_circle: '<circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/>',
    warning: '<path d="m12 3 10 18H2L12 3Zm0 7v4m0 3h.01"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1.5-2 3m0 3h.01"/>',
    add: '<path d="M12 4v16M4 12h16"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    schedule: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    music_note: '<path d="M9 18V5l12-2v13M9 7l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'
  };
  const render=(node)=> {
    if (node.nodeType === Node.TEXT_NODE) { if (node.parentElement?.matches('span.material-symbols-rounded')) render(node.parentElement); return; }
    if (!(node instanceof Element)) return;
    const nodes=[];
    if (node.matches('span.material-symbols-rounded')) nodes.push(node);
    node.querySelectorAll('span.material-symbols-rounded').forEach(x=>nodes.push(x));
    nodes.forEach(el=>{
      if (el.dataset.vectorIcon && el.querySelector('svg')) return;
      const name=el.textContent.trim();
      if (!I[name]) return;
      el.dataset.vectorIcon=name;
      el.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">'+I[name]+'</svg>';
    });
  };
  render(document.body);
  const observer=new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(render)));
  observer.observe(document.body,{childList:true,subtree:true});
})();

    