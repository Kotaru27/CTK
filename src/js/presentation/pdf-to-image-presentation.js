
/* PDF-to-image-only UI + missing download access. The existing PDF processing
   and selected-page ZIP implementation are left unchanged. */
(() => {
  if (typeof Tools === 'undefined' || !Tools.Pdf) return;
  const pdf = Tools.Pdf;
  const allBtn = document.getElementById('pdfDownloadAllBtn');
  const docCount = document.getElementById('pdfDocCount');
  const pageCount = document.getElementById('pdfPageCount');
  const exportCount = document.getElementById('pdfExportCount');
  const status = document.getElementById('pdfWorkStatus');
  const stageMeta = document.getElementById('pdfStageMeta');
  const stacks = document.getElementById('pdfStacksContainer');
  if (!allBtn || !stacks) return;
  const contents = () => Object.values(pdf.collection || {}).filter(Boolean);
  const totalPages = (docs) => docs.reduce((n,d)=>n+(d.pages?.length||0),0);
  let exporting=false;
  const update = () => {
    const docs=contents(), pages=totalPages(docs);
    stacks.querySelectorAll('.pdf-stack-wrapper').forEach(card=>{
      if(!card.hasAttribute('role')){
        card.setAttribute('role','button'); card.tabIndex=0;
        card.setAttribute('aria-label','Inspect pages in '+(card.querySelector('.stack-title')?.textContent||'PDF document'));
        card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}});
      }
    });

    const running = document.getElementById('pdfProgress')?.classList.contains('active');
    docCount.textContent = `${docs.length} document${docs.length===1?'':'s'}`;
    pageCount.textContent = `${pages} page${pages===1?'':'s'} converted`;
    exportCount.textContent = String(pages);
    allBtn.disabled=pages===0 || exporting || !!running;
    stageMeta.textContent=docs.length ? `${docs.length} DOCUMENT${docs.length===1?'':'S'}` : 'EMPTY LIBRARY';
    status.textContent=running?'Converting document pages':(pages?'Files ready for export':'Ready for documents');
  };
  new MutationObserver(update).observe(stacks,{childList:true,subtree:true,characterData:true});
  new MutationObserver(update).observe(document.getElementById('pdfProgress'),{attributes:true,attributeFilter:['class']});
  const sanitized = (n) => (n||'document').replace(/\.pdf$/i,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,80)||'document';
  const zipDownload = async (docEntries,name,button) => {
    if (typeof JSZip==='undefined'){ UI.showError('ZIP library unavailable. Check your connection and retry.');return; }
    let count=0;
    const zip=new JSZip();
    for(const [i,d] of docEntries.entries()){
      const pages=d.pages||[];
      const ext=d.format==='image/jpeg'?'jpg':'png';
      const prefix=docEntries.length>1?`${String(i+1).padStart(2,'0')}_${sanitized(d.name)}/`:'';
      for(const p of pages){if(!p.blob)continue;zip.file(`${prefix}${String(p.num).padStart(3,'0')}.${ext}`,p.blob);count++;}
    }
    if(!count){UI.showError('No converted pages are available yet.');return;}
    exporting=true;update();
    const label=button.querySelector('.pdf-download-label');
    const old=label?.textContent;
    if(label)label.textContent='Preparing ZIP…';
    try{
      const blob=await zip.generateAsync({type:'blob'});
      const url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url;a.download=name;a.style.display='none';document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(e){UI.showError('Could not create ZIP: '+(e?.message||e));}
    finally{exporting=false;if(label)label.textContent=old;update();}
  };
  allBtn.addEventListener('click',()=>zipDownload(contents().filter(d=>d.pages?.length),'pdf-images.zip',allBtn));
  // Extend the existing drop target to the visible dashed area, without
  // interfering with the existing #pdfDropZone handler on the upload button.
  const surface = document.querySelector('#section-pdf .pdf-drop-surface');
  if(surface){
    surface.addEventListener('dragover',(e)=>{e.preventDefault();surface.classList.add('pdf-drag-over');});
    surface.addEventListener('dragleave',(e)=>{if(!surface.contains(e.relatedTarget))surface.classList.remove('pdf-drag-over');});
    surface.addEventListener('drop',(e)=>{
      surface.classList.remove('pdf-drag-over');
      if(e.target.closest('#pdfDropZone')) return; // handled by original drop zone
      e.preventDefault();
      if(e.dataTransfer?.files?.length)pdf.handleFiles(Array.from(e.dataTransfer.files));
    });
  }

  // The original PDF stack handler already calls this method; it was missing.
  // Restore only that UI method to expose existing selected-page downloads.
  if(typeof pdf.openDetail!=='function'){
    pdf.openDetail=function(id){
      const data=this.collection[id];if(!data)return;
      this.currentId=id;
      this.els.title.textContent=data.name;
      this.els.count.textContent=`${data.pages.length} pages · Select images to download`;
      this.els.grid.replaceChildren();
      this.els.selectAll.checked=data.pages.length>0&&data.pages.every(p=>p.checked);
      const updateAll=()=>{
        const checked=data.pages.filter(p=>p.checked).length;
        this.els.selectAll.checked=checked===data.pages.length;
        this.els.selectAll.indeterminate=checked>0&&checked<data.pages.length;
      };
      const ext=data.format==='image/jpeg'?'jpg':'png';
      data.pages.forEach(p=>{
        const card=document.createElement('div');card.className='pdf-page-review';
        const preview=document.createElement('div');preview.className='pdf-page-preview';
        const img=document.createElement('img');img.src=p.url;img.alt=`Page ${p.num}`;preview.append(img);
        const foot=document.createElement('div');foot.className='pdf-page-foot';
        const label=document.createElement('label');
        const input=document.createElement('input');input.type='checkbox';input.className='detail-check';input.checked=p.checked;
        input.addEventListener('change',()=>{p.checked=input.checked;updateAll();});
        const name=document.createElement('span');name.className='pdf-page-name';name.textContent=`Page ${String(p.num).padStart(2,'0')}`;
        label.append(input,name);
        const dl=document.createElement('button');dl.type='button';dl.className='pdf-page-download';dl.textContent='Save';dl.setAttribute('aria-label',`Download page ${p.num}`);
        dl.addEventListener('click',()=>this.downloadSingle(p.url,`${sanitized(data.name)}_${String(p.num).padStart(3,'0')}.${ext}`));
        foot.append(label,dl);card.append(preview,foot);this.els.grid.append(card);
      });
      this.els.overlay.classList.add('active');
    };
  }
  update();
})();

  