/* Ad Downloader V2: progressive presentation enhancement only.
 * Does not touch download, renaming, spreadsheet parsing, selection, or export handlers. */
(() => {
  "use strict";
  function boot() {
    const root=document.getElementById("adlinksTabContentDownloader");
    const rows=document.getElementById("adDlTableBody");
    if (!root || !rows || root.dataset.ctkExperience==="2") return;
    root.dataset.ctkExperience="2";
    const head=root.querySelector(".ad-download-heading");
    if (head) {
      const kicker=head.querySelector(".edition-kicker");
      const title=head.querySelector("h2");
      const intro=head.querySelector("p");
      if (kicker) kicker.textContent="CAMPAIGN STUDIO  /  ASSET DESK";
      if (title) title.textContent="Assets, in order.";
      if (intro) intro.textContent="Organize every campaign file. Copy clean names, track downloads, and keep the workspace moving.";
    }
    const empty=root.querySelector("#adDlEmptyState p");
    if (empty) empty.textContent="Import an Excel workbook to prepare neatly named assets and a clean download queue.";
    const opened=()=>rows.querySelectorAll(".ctk-row-menu[open]");
    const closeMenus=(except)=>{
      for (const details of opened()) if (details!==except) details.open=false;
    };
    function enhance() {
      for (const row of rows.querySelectorAll("tr:not([data-ctk-row-v2])")) {
        const actions=row.cells && row.cells[2];
        if (!actions) continue;
        const buttons=Array.from(actions.children).filter(el=>el.tagName==="BUTTON");
        const copy=buttons.find(el=>el.textContent.trim()==="Copy");
        const download=buttons.find(el=>/^Download/.test(el.textContent.trim()));
        const fix=buttons.find(el=>el.textContent.trim()==="Fix downloaded name");
        const save=buttons.find(el=>el.textContent.trim()==="Save named copy");
        if (!copy || !download) continue;
        row.dataset.ctkRowV2="1";
        // Primary action comes first, recovery actions stay callable as originals.
        actions.insertBefore(download,copy);
        if (fix && save) {
          const menu=document.createElement("details");
          menu.className="ctk-row-menu";
          const summary=document.createElement("summary");
          summary.textContent="More";
          summary.setAttribute("aria-label","More actions for "+(row.cells[1]?.textContent||"this asset"));
          const body=document.createElement("div");
          body.className="ctk-row-popover";
          menu.append(summary,body);
          body.append(fix,save);
          actions.append(menu);
          menu.addEventListener("toggle",()=>{
            if (!menu.open) return;
            closeMenus(menu);
            // Detect clipping against the scrolling table, not just the last
            // three rows (which might be off screen). Keep rare actions usable
            // in every visible row without changing their original handlers.
            const viewport=root.querySelector("#adDlTableContainer")?.getBoundingClientRect();
            const popover=body.getBoundingClientRect();
            if (viewport) {
              const downSpace=viewport.bottom-summary.getBoundingClientRect().bottom;
              const upSpace=summary.getBoundingClientRect().top-viewport.top;
              const preferred=downSpace>=popover.height+13 || downSpace>=upSpace ? "down":"up";
              menu.dataset.side=preferred;
            }
          });
          body.addEventListener("click",e=>{
            if (e.target.closest("button")) menu.open=false;
          });
        }
      }
    }
    enhance();
    // Only watch direct row additions (loading a new workbook); avoid reacting to
    // internal action rearrangement or causing an observer feedback loop.
    const observer=new MutationObserver(enhance);
    observer.observe(rows,{childList:true});
    document.addEventListener("pointerdown",e=>{
      if (!root.contains(e.target) || !e.target.closest(".ctk-row-menu")) closeMenus();
    });
    document.addEventListener("keydown",e=>{
      if(e.key==="Escape")closeMenus();
    });
    root.querySelector("#adDlTableContainer")?.addEventListener("scroll",()=>{
      closeMenus();
    },{passive:true});
  }
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();