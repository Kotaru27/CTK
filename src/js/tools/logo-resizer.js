/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
        Logo: {
          picaRunner: window.pica ? window.pica() : null,
          cards: [],
          activeDetailIndex: null,
          els: {},
          init() {
            this.els = {
              input: document.getElementById("logoInput"),
              dropZone: document.getElementById("dropZone"),
              grid: document.getElementById("logoGrid"),
              empty: document.getElementById("logoEmpty"),
              fontSize: document.getElementById("fontSizeInput"),
              bold: document.getElementById("boldToggle"),
              syncFilename: document.getElementById("syncFilenameToggle"),
              color: document.getElementById("fontColorPicker"),
              width: document.getElementById("exportWidth"),
              height: document.getElementById("exportHeight"),
              pos: document.getElementById("globalImgPos"),
              padding: document.getElementById("globalPadding"),
              fontFamily: document.getElementById("globalFontFamily"),
              exportBtn: document.getElementById("exportAllBtn"),
              clearBtn: document.getElementById("clearLogoBtn"),
              format: document.getElementById("exportFormat"),
              mOverlay: document.getElementById("logoDetailOverlay"),
              mCanvas: document.getElementById("logoDetailCanvas"),
              mClose: document.getElementById("logoDetailClose"),
              mDown: document.getElementById("logoDetailDownload"),
              mTitle: document.getElementById("logoDetailTitle"),
              mIndex: document.getElementById("logoDetailIndex"),
              mFname: document.getElementById("logoDetailFname"),
              mText: document.getElementById("logoDetailText"),
              mFontSize: document.getElementById("logoDetailFontSize"),
              mImgSlider: document.getElementById("logoDetailImgSlider"),
              mTxtSlider: document.getElementById("logoDetailTxtSlider"),
              mPaddingSlider: document.getElementById(
                "logoDetailPaddingSlider",
              ),
              mResetPadding: document.getElementById("logoDetailResetPadding"),
              mDelete: document.getElementById("logoDetailDelete"),
            };
            Core.Utils.createDropZone(this.els.dropZone, (f) =>
              this.handleFiles(f),
            );
            this.els.input.onchange = (e) => {
              this.handleFiles([...e.target.files]);
              this.els.input.value = "";
            };
            const redrawAll = () => this.cards.forEach((c) => this.draw(c));
            const redrawAllDebounced = Core.Utils.debounce(redrawAll, 50);
            this.els.fontSize.oninput = redrawAllDebounced;
            this.els.bold.addEventListener("change", redrawAll);
            this.els.color.oninput = redrawAllDebounced;
            this.els.pos.oninput = redrawAllDebounced;
            this.els.padding.oninput = redrawAllDebounced;
            this.els.fontFamily.onchange = redrawAll;
            this.els.width.oninput = Core.Utils.debounce(redrawAll, 200);
            this.els.height.oninput = Core.Utils.debounce(redrawAll, 200);
            this.els.exportBtn.onclick = () => this.exportAll();
            this.els.clearBtn.onclick = () => {
              const savedFiles = this.cards
                .map((c) => c.file)
                .filter((f) => f && typeof f === "object");
              UI.confirm({
                title: "Clear logo workspace?",
                message: "This removes every uploaded image and resets the workspace. You can undo this action.",
                okLabel: "Clear",
                cancelLabel: "Cancel",
              }).then((ok) => {
                if (!ok) return;
                const cards = Array.from(this.els.grid.children).filter(
                  (el) => !el.id.includes("Empty"),
                );
                window.applyThanosSnap(cards).then(() => {
                  this.destroy();
                  if (savedFiles.length > 0) {
                    UI.undoToast("Logo workspace cleared", () => {
                      this.handleFiles(savedFiles);
                    });
                  }
                });
              });
            };
            this.els.mClose.onclick = () => this.closeDetail();
            this.els.mDown.onclick = () => this.downloadActiveDetail();
            this.els.mDelete.onclick = () => {
              const obj = this.cards[this.activeDetailIndex];
              if (obj) {
                this.removeCard(obj);
              }
            };
            const redrawModal = () => {
              const obj = this.cards[this.activeDetailIndex];
              if (obj) this.draw(obj);
            };
            const dRedrawModal = Core.Utils.debounce(redrawModal, 20);
            this.els.mFname.oninput = () => {
              const obj = this.cards[this.activeDetailIndex];
              if (obj) {
                obj.fname = Core.Utils.sanitize(this.els.mFname.value.trim());
                obj.els.fname.value = obj.fname || "Untitled";
              }
            };
            this.els.mFname.onblur = () => {
              const obj = this.cards[this.activeDetailIndex];
              if (obj) {
                this.els.mFname.value = obj.fname || "Untitled";
              }
            };
            this.els.mText.oninput = () => {
              const obj = this.cards[this.activeDetailIndex];
              if (obj) {
                obj.text = this.els.mText.value;
                obj.els.textInput.value = obj.text;
                if (this.els.syncFilename.checked && obj.text.trim()) {
                  obj.fname = Core.Utils.sanitize(
                    obj.text.trim().substring(0, 30),
                  );
                  this.els.mFname.value = obj.fname;
                  obj.els.fname.value = obj.fname;
                }
                dRedrawModal();
              }
            };
            this.els.mFontSize.oninput = () => {
              const obj = this.cards[this.activeDetailIndex];
              if (obj) {
                const val = parseInt(this.els.mFontSize.value, 10);
                obj.fontValOverride = isNaN(val) ? null : val;
                obj.els.localFontInp.value = obj.fontValOverride || "";
                dRedrawModal();
              }
            };
            this.els.mImgSlider.oninput = () => {
              const obj = this.cards[this.activeDetailIndex];
              if (obj) {
                obj.imgSlider = parseInt(this.els.mImgSlider.value, 10);
                dRedrawModal();
              }
            };
            this.els.mTxtSlider.oninput = () => {
              const obj = this.cards[this.activeDetailIndex];
              if (obj) {
                obj.txtSlider = parseInt(this.els.mTxtSlider.value, 10);
                dRedrawModal();
              }
            };
            this.els.mPaddingSlider.oninput = () => {
              const obj = this.cards[this.activeDetailIndex];
              if (obj) {
                obj.padding = parseInt(this.els.mPaddingSlider.value, 10);
                this.els.mResetPadding.style.display = "block";
                dRedrawModal();
              }
            };
            this.els.mResetPadding.onclick = () => {
              const obj = this.cards[this.activeDetailIndex];
              if (obj) {
                window.applyThanosSnap(this.els.mCanvas, 0.4).then(() => {
                  obj.padding = null;
                  this.els.mPaddingSlider.value = this.els.padding.value;
                  this.els.mResetPadding.style.display = "none";
                  dRedrawModal();
                });
              }
            };
            window.addEventListener("keydown", (e) => {
              if (
                this.activeDetailIndex !== null &&
                this.els.mOverlay.classList.contains("active")
              ) {
                if (e.key === "ArrowLeft") this.goDetail(-1);
                if (e.key === "ArrowRight") this.goDetail(1);
                if (e.key === "Escape") this.closeDetail();
              }
            });
          },
          destroy() {
            this.cards.forEach((c) => Core.BlobRegistry.release(c.img.src));
            this.cards = [];
            this.els.grid.innerHTML = "";
            this.els.grid.appendChild(this.els.empty);
            UI.toggleEmptyState(this.els.grid, true);
            this.els.exportBtn.disabled = true;
            this.closeDetail();
          },
          async handleFiles(files) {
            if (!files || files.length === 0) return;
            
            const dims = await new Promise((resolve) => {
              const overlay = document.getElementById("logoDimensionOverlay");
              const wInp = document.getElementById("logoDimWidth");
              const hInp = document.getElementById("logoDimHeight");
              const okBtn = document.getElementById("logoDimOkBtn");
              const cancelBtn = document.getElementById("logoDimCancelBtn");
              
              wInp.value = "";
              hInp.value = "";
              
              const cleanup = () => {
                okBtn.removeEventListener("click", onOk);
                cancelBtn.removeEventListener("click", onCancel);
                wInp.removeEventListener("keydown", onKey);
                hInp.removeEventListener("keydown", onKey);
                overlay.hidden = true;
              };
              
              const onOk = () => {
                const w = parseInt(wInp.value, 10);
                const h = parseInt(hInp.value, 10);
                if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
                  UI.showError("Please enter valid width and height.");
                  return;
                }
                cleanup();
                resolve({ w, h });
              };
              
              const onCancel = () => {
                cleanup();
                resolve(null);
              };

              const onKey = (e) => {
                if (e.key === "Enter") onOk();
              };
              
              okBtn.addEventListener("click", onOk);
              cancelBtn.addEventListener("click", onCancel);
              wInp.addEventListener("keydown", onKey);
              hInp.addEventListener("keydown", onKey);
              overlay.hidden = false;
              wInp.focus();
            });
            
            if (!dims) return;
            
            this.els.width.value = dims.w;
            this.els.height.value = dims.h;

            UI.toggleEmptyState(this.els.grid, false);
            this.els.exportBtn.disabled = false;
            
            for (const f of files) {
              const nameLower = f.name.toLowerCase();
              if (f.type.startsWith("image/")) {
                this.createCard(f);
              } else if (nameLower.endsWith(".pptx") || nameLower.endsWith(".xlsx") || nameLower.endsWith(".xlsm")) {
                await this.extractMediaFromFile(f);
              }
            }
          },
          async extractMediaFromFile(file) {
            const JSZip = window.JSZip;
            if (!JSZip) return alert("JSZip library not found.");
            
            const progress = document.getElementById("logoProgress");
            const statusText = document.getElementById("logoStatusText");
            if (progress) progress.classList.add("active");
            if (statusText) statusText.innerText = "Extracting images from " + file.name + "...";
            
            try {
              const zip = await JSZip.loadAsync(file);
              const ctx = { hashes: new Set(), dupes: 0 };
              const nameLower = file.name.toLowerCase();
              if (nameLower.endsWith(".pptx")) {
                await this.extractPptx(zip, ctx, file.name);
              } else if (nameLower.endsWith(".xlsx") || nameLower.endsWith(".xlsm")) {
                await this.extractXlsx(zip, ctx, file.name);
              }
            } catch (err) {
              console.error(err);
              alert("Failed to extract images from " + file.name);
            } finally {
              if (progress) progress.classList.remove("active");
            }
          },
          async processExtractedBlob(blob, filename, ctx) {
            try {
              const buf = await blob.arrayBuffer();
              const dig = await crypto.subtle.digest('SHA-256', buf);
              const hex = [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2, '0')).join('');
              if (ctx.hashes.has(hex)) {
                ctx.dupes++;
                return;
              }
              ctx.hashes.add(hex);
            } catch(e) {}
            
            const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
            const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
            const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                         ext === 'svg' ? 'image/svg+xml' : 'image/png';
            
            const newFile = new File([blob], filename, { type: type });
            this.createCard(newFile);
          },
          resolveZipPath(base, target) {
            if(!target) return '';
            if(target.startsWith('/')) return target.replace(/^\/+/, '');
            const parts = (base + '/' + target).split('/'); 
            const out = [];
            for (const p of parts) { 
              if (p === '..') out.pop(); 
              else if (p !== '.' && p !== '') out.push(p); 
            }
            return out.join('/');
          },
          async extractPptx(zip, ctx, sourceFileName) {
            const parser = new DOMParser();
            const slideFiles = Object.keys(zip.files)
              .filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p))
              .sort((a,b) => parseInt(a.match(/\d+/g).pop()) - parseInt(b.match(/\d+/g).pop()));
            
            let imgCount = 1;
            for (let si = 0; si < slideFiles.length; si++) {
              const slidePath = slideFiles[si];
              const slideNum = parseInt(slidePath.match(/slide(\d+)\.xml/)[1], 10);
              const xmlText = await zip.file(slidePath).async('string');
              const xml = parser.parseFromString(xmlText, 'application/xml');
              
              const relPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
              const rels = {};
              if (zip.file(relPath)) {
                const rx = parser.parseFromString(await zip.file(relPath).async('string'), 'application/xml');
                for (const r of rx.getElementsByTagName('Relationship')) rels[r.getAttribute('Id')] = r.getAttribute('Target');
              }
              
              const blips = xml.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'blip');
              for (let i = 0; i < blips.length; i++) {
                const b = blips[i];
                let rid = null;
                
                // Prioritize high-resolution SVGs over PNG fallbacks
                const svgBlip = b.getElementsByTagNameNS('*', 'svgBlip')[0] || b.getElementsByTagName('asvg:svgBlip')[0];
                if (svgBlip) {
                  rid = svgBlip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') || svgBlip.getAttribute('r:embed');
                }
                
                // Fallback to standard raster image
                if (!rid) {
                  rid = b.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') || b.getAttribute('r:embed');
                }
                
                if (!rid) continue;
                const target = this.resolveZipPath('ppt/slides', rels[rid] || '');
                if (!target || !zip.file(target)) continue;
                const blob = await zip.file(target).async('blob');
                const ext = (target.split('.').pop() || 'png').toLowerCase();
                const filename = `Slide${slideNum}_IMG${imgCount++}.${ext}`;
                await this.processExtractedBlob(blob, filename, ctx);
              }
            }
          },
          async extractXlsx(zip, ctx, sourceFileName) {
            const parser = new DOMParser();
            
            const wbXmlText = await zip.file('xl/workbook.xml').async('string');
            const wb = parser.parseFromString(wbXmlText, 'application/xml');
            const wbrXmlText = await zip.file('xl/_rels/workbook.xml.rels').async('string');
            const wbr = parser.parseFromString(wbrXmlText, 'application/xml');
            
            const wrel = {};
            for (const r of wbr.getElementsByTagName('Relationship')) wrel[r.getAttribute('Id')] = r.getAttribute('Target');
            
            const sheets = [];
            for (const s of wb.getElementsByTagName('sheet')) {
              const rid = s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || s.getAttribute('r:id');
              let t = (wrel[rid] || '').replace(/^\//, '');
              if (t && !t.startsWith('xl/')) t = 'xl/' + t;
              if (t && zip.file(t)) sheets.push({name: s.getAttribute('name') || t, path: t});
            }
            
            const extractedMedia = new Set();
            let imgCount = 1;
            
            for (const sh of sheets) {
              const base = sh.path.substring(0, sh.path.lastIndexOf('/'));
              const relPath = base + '/_rels/' + sh.path.split('/').pop() + '.rels';
              if (!zip.file(relPath)) continue;
              
              const srels = parser.parseFromString(await zip.file(relPath).async('string'), 'application/xml');
              let drawTarget = null;
              for (const r of srels.getElementsByTagName('Relationship')) {
                if ((r.getAttribute('Type') || '').endsWith('/drawing')) drawTarget = r.getAttribute('Target');
              }
              if (!drawTarget) continue;
              
              const drawPath = this.resolveZipPath(base, drawTarget);
              if (!zip.file(drawPath)) continue;
              
              const dbase = drawPath.substring(0, drawPath.lastIndexOf('/'));
              const drp = dbase + '/_rels/' + drawPath.split('/').pop() + '.rels';
              const drel = {};
              if (zip.file(drp)) {
                const dx = parser.parseFromString(await zip.file(drp).async('string'), 'application/xml');
                for (const r of dx.getElementsByTagName('Relationship')) drel[r.getAttribute('Id')] = r.getAttribute('Target');
              }
              
              const dxml = parser.parseFromString(await zip.file(drawPath).async('string'), 'application/xml');
              const blips = dxml.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'blip');
              for (let i = 0; i < blips.length; i++) {
                const b = blips[i];
                let rid = null;
                
                // Prioritize high-resolution SVGs over PNG fallbacks
                const svgBlip = b.getElementsByTagNameNS('*', 'svgBlip')[0] || b.getElementsByTagName('asvg:svgBlip')[0];
                if (svgBlip) {
                  rid = svgBlip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') || svgBlip.getAttribute('r:embed');
                }
                
                // Fallback to standard raster image
                if (!rid) {
                  rid = b.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') || b.getAttribute('r:embed');
                }
                
                if (!rid || !drel[rid]) continue;
                const mediaPath = this.resolveZipPath(dbase, drel[rid]);
                const mf = zip.file(mediaPath);
                if (!mf) continue;
                
                const blob = await mf.async('blob');
                extractedMedia.add(mediaPath);
                
                const ext = (mediaPath.split('.').pop() || 'png').toLowerCase();
                const safeSheet = (sh.name || 'Sheet').replace(/[^a-zA-Z0-9]/g, '');
                const filename = `${safeSheet}_IMG${imgCount++}.${ext}`;
                await this.processExtractedBlob(blob, filename, ctx);
              }
            }
            
            if (zip.file('xl/richData/richValueRel.xml')) {
              try {
                const rvb = [];
                if (zip.file('xl/metadata.xml')) {
                  const md = await zip.file('xl/metadata.xml').async('string');
                  const re1 = /<xlrd:rvb i="(\d+)"\/>/g; let m;
                  while((m = re1.exec(md))) rvb.push(parseInt(m[1],10));
                }
                const rvLocalId = [];
                if (zip.file('xl/richData/rdrichvalue.xml')) {
                  const rv = await zip.file('xl/richData/rdrichvalue.xml').async('string');
                  const re2 = /<rv\b[^>]*>\s*<v>(\d+)<\/v>/g; let m;
                  while((m = re2.exec(rv))) rvLocalId.push(parseInt(m[1],10));
                }
                const relIds = [];
                const rvr = await zip.file('xl/richData/richValueRel.xml').async('string');
                const re3 = /<rel\s+r:id="(rId\d+)"/g; let m3;
                while((m3 = re3.exec(rvr))) relIds.push(m3[1]);
                const relMap = {};
                if (zip.file('xl/richData/_rels/richValueRel.xml.rels')) {
                  const rr = parser.parseFromString(await zip.file('xl/richData/_rels/richValueRel.xml.rels').async('string'), 'application/xml');
                  for (const r of rr.getElementsByTagName('Relationship')) relMap[r.getAttribute('Id')] = r.getAttribute('Target');
                }
                
                for (let i = 0; i < sheets.length; i++) {
                  const sh = sheets[i];
                  const sxml = parser.parseFromString(await zip.file(sh.path).async('string'), 'application/xml');
                  for (const c of sxml.getElementsByTagName('c')) {
                    const vm = c.getAttribute('vm');
                    if (!vm) continue;
                    const vmIdx = parseInt(vm, 10);
                    if (vmIdx < 1 || vmIdx > rvb.length) continue;
                    
                    const rvIdx = rvb[vmIdx - 1];
                    const localId = rvLocalId[rvIdx];
                    if (localId == null) continue;
                    
                    const rid = relIds[localId];
                    const target = relMap[rid];
                    if (!target) continue;
                    
                    const mediaPath = this.resolveZipPath('xl/richData', target);
                    if (!mediaPath || !zip.file(mediaPath)) continue;
                    
                    const blob = await zip.file(mediaPath).async('blob');
                    extractedMedia.add(mediaPath);
                    const ext = (mediaPath.split('.').pop() || 'png').toLowerCase();
                    const safeSheet = (sh.name || 'Sheet').replace(/[^a-zA-Z0-9]/g, '');
                    const filename = `${safeSheet}_CellIMG${imgCount++}.${ext}`;
                    await this.processExtractedBlob(blob, filename, ctx);
                  }
                }
              } catch(e) { console.error("Rich media extraction failed", e); }
            }
            
            const leftovers = Object.keys(zip.files).filter(p => /^xl\/media\//.test(p) && !extractedMedia.has(p));
            for (const p of leftovers) {
              const blob = await zip.file(p).async('blob');
              const ext = (p.split('.').pop() || 'png').toLowerCase();
              const filename = `Unanchored_IMG${imgCount++}.${ext}`;
              await this.processExtractedBlob(blob, filename, ctx);
            }
          },
          getGlobalFont() {
            const v = parseInt(this.els.fontSize.value, 10);
            return isNaN(v) ? 28 : Math.max(8, Math.min(v, 200));
          },
          createCard(file) {
            const card = document.createElement("div");
            card.className = "logo-card-item";
            card.style.cssText =
              "display:flex; flex-direction:column; border-radius:0; overflow:hidden; transition:none; position:relative;";
            let baseName = Core.Utils.sanitize(file.name.replace(/\.[^/.]+$/, "").substring(0, 30));
            card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border);"><input data-guide="Edit the exported filename for this individual logo." class="card-fname-lbl liquid-input" style="font-size:0.75rem; color:var(--text-muted); font-weight:600; padding:2px 6px; height:24px; max-width:150px; background:transparent; outline:none;" value="${baseName}" /><button data-guide="Remove this logo from the workspace." class="liquid-btn icon-only danger-btn card-rm" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center;"><span class="material-symbols-rounded" style="font-size: 14px;">delete</span></button></div><div data-guide="Click to open Focus Mode to inspect or copy this logo in full detail." class="card-preview-area" style="background-image:radial-gradient(var(--border) 1px, transparent 1px); background-size:15px 15px; position:relative; display:flex; justify-content:center; align-items:center; padding:3px; cursor:pointer; min-height:220px; flex:1; border-bottom:1px solid var(--border);"><canvas style="max-width:100%; max-height:100%; object-fit:contain; border:1px solid var(--border); background:#fff;"></canvas><div class="hover-overlay" style="position:absolute; inset:0; background:var(--m3-scrim); opacity:0; display:flex; align-items:center; justify-content:center; transition:opacity 0.2s;"><span style="background:var(--bg-panel); border:1px solid var(--border); padding:6px 12px; border-radius:0; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; font-weight:bold;">Focus Mode</span></div></div><div style="padding:16px; display:flex; flex-direction:column; gap:12px;"><div style="display:flex; flex-direction:column; gap:6px;"><span style="font-size:0.8rem; font-weight:bold; color:var(--text-muted);">Overlay Label</span><textarea data-guide="Type a custom label or notation to overlay on this logo." class="liquid-input card-text" rows="1" placeholder="Type design label..." style="resize:none; padding:8px; font-size:0.75rem; height:34px;"></textarea></div><div style="display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="display:flex; align-items:center; gap:8px;"><span style="font-size:0.8rem; font-weight:bold; color:var(--text-muted);">Size Override:</span><input data-guide="Set a specific font size for this logo. Overrides global settings." type="number" class="liquid-input card-local-font-inp" placeholder="Auto" style="width:60px; height:26px; font-size:0.7rem; text-align:center; padding:4px;" /></div><button data-guide="Download this individual resized logo." class="liquid-btn icon-only active-mode card-dl" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center;"><span class="material-symbols-rounded" style="font-size: 14px;">download</span></button></div></div>`;
            const canvas = card.querySelector("canvas");
            const hoverOverlay = card.querySelector(".hover-overlay");
            const textInput = card.querySelector(".card-text");
            const localFontInp = card.querySelector(".card-local-font-inp");
            const dlBtn = card.querySelector(".card-dl");
            const rmBtn = card.querySelector(".card-rm");
            const fnameLbl = card.querySelector(".card-fname-lbl");
            /* lucide.createIcons */
            const img = new Image();
            img.src = Core.BlobRegistry.create(file, "logo");
            const obj = {
              file,
              img,
              canvas,
              fname: baseName,
              text: "",
              fontValOverride: null,
              padding: null,
              imgSlider: 0,
              txtSlider: 90,
              card,
              els: { fname: fnameLbl, textInput, localFontInp },
            };
            this.cards.unshift(obj);
            img.onload = () => {
              this.draw(obj);
              if (this.activeDetailIndex !== null)
                this.draw(this.cards[this.activeDetailIndex]);
            };
            fnameLbl.oninput = () => {
              obj.fname = Core.Utils.sanitize(fnameLbl.value);
              if (this.activeDetailIndex === this.cards.indexOf(obj)) {
                this.els.mFname.value = obj.fname;
              }
            };
            fnameLbl.onblur = () => {
              fnameLbl.value = obj.fname || "Untitled";
            };
            textInput.oninput = Core.Utils.debounce(() => {
              obj.text = textInput.value;
              if (this.els.syncFilename.checked && obj.text.trim()) {
                obj.fname = Core.Utils.sanitize(
                  obj.text.trim().substring(0, 30),
                );
                obj.els.fname.value = obj.fname;
                if (this.activeDetailIndex === this.cards.indexOf(obj)) {
                  this.els.mFname.value = obj.fname;
                }
              }
              if (this.activeDetailIndex === this.cards.indexOf(obj)) {
                this.els.mText.value = obj.text;
              }
              this.draw(obj);
            }, 50);
            localFontInp.oninput = () => {
              const val = parseInt(localFontInp.value, 10);
              obj.fontValOverride = isNaN(val) ? null : val;
              if (this.activeDetailIndex === this.cards.indexOf(obj)) {
                this.els.mFontSize.value = obj.fontValOverride || "";
              }
              this.draw(obj);
            };
            dlBtn.onclick = () => this.downloadSingle(obj);
            rmBtn.onclick = () => {
              window.applyThanosSnap(obj.card).then(() => this.removeCard(obj));
            };
            const previewArea = card.querySelector(".card-preview-area");
            previewArea.tabIndex = 0;
            previewArea.setAttribute("role", "button");
            previewArea.setAttribute("aria-label", "Open Focus Mode for " + file.name);
            previewArea.onkeydown = (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                previewArea.click();
              }
            };
            previewArea.onmouseenter = () => (hoverOverlay.style.opacity = "1");
            previewArea.onmouseleave = () => (hoverOverlay.style.opacity = "0");
            previewArea.onclick = () =>
              this.openDetail(this.cards.indexOf(obj));
            const animId = setTimeout(() => {
              this.els.grid.prepend(card);
            }, 0);
          },
          removeCard(obj) {
            const idx = this.cards.indexOf(obj);
            if (idx > -1) {
              obj.card.remove();
              Core.BlobRegistry.release(obj.img.src);
              this.cards.splice(idx, 1);
              if (!this.cards.length) {
                UI.toggleEmptyState(this.els.grid, true);
                this.els.exportBtn.disabled = true;
                this.closeDetail();
              } else if (this.activeDetailIndex === idx) {
                if (idx >= this.cards.length) this.goDetail(-1);
                else this.openDetail(idx);
              } else if (this.activeDetailIndex > idx) {
                this.activeDetailIndex--;
                this.els.mIndex.innerText = `${this.activeDetailIndex + 1} of ${this.cards.length}`;
              }
            }
          },
          draw(c) {
            if (!c.img.complete || c._drawQueued) return;
            // Collapse repeated input events into a single render per card and frame.
            c._drawQueued = true;
            requestAnimationFrame(() => {
              c._drawQueued = false;
              if (!this.cards.includes(c)) return;
              let tW = parseInt(this.els.width.value, 10);
              let tH = parseInt(this.els.height.value, 10);
              
              if (isNaN(tW) || tW <= 0) tW = c.img.naturalWidth || 300;
              if (isNaN(tH) || tH <= 0) tH = c.img.naturalHeight || 400;
              
              const globFont = this.getGlobalFont();
              c.els.localFontInp.placeholder = `Auto (${globFont}px)`;
              c.canvas.width = tW;
              c.canvas.height = tH;
              this.performDraw(c.canvas, c, tW, tH);
              if (
                this.activeDetailIndex === this.cards.indexOf(c) &&
                this.els.mOverlay.classList.contains("active")
              ) {
                this.els.mFontSize.placeholder = `Auto (${globFont}px)`;
                this.els.mCanvas.width = tW;
                this.els.mCanvas.height = tH;
                this.performDraw(this.els.mCanvas, c, tW, tH);
              }
            });
          },
          performDraw(canvas, c, tW, tH) {
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, tW, tH);
            const pad =
              c.padding !== null
                ? c.padding
                : parseInt(this.els.padding.value, 10) || 0;
            const aW = Math.max(1, tW - pad * 2),
              aH = Math.max(1, tH - pad * 2);
            const rawScale = Math.min(
              aW / c.img.naturalWidth,
              aH / c.img.naturalHeight,
            );
            const isVector = c.file && c.file.type === "image/svg+xml";
            const scale = isVector ? rawScale : Math.min(rawScale, 1);
            const rW = c.img.naturalWidth * scale,
              rH = c.img.naturalHeight * scale;
            const gPos =
              c.imgSlider !== 0
                ? c.imgSlider
                : parseInt(this.els.pos.value, 10) || 0;
            const x = (tW - rW) / 2,
              y = (tH - rH) / 2 + (gPos / 100) * tH;

            let sourceImg = c.img;
            let sW = c.img.naturalWidth;
            let sH = c.img.naturalHeight;
            if (sW > 0 && sH > 0) {
              if (!isVector && scale < 0.5) {
                let curWidth = sW;
                let curHeight = sH;
                let tmpCanvas = document.createElement("canvas");
                tmpCanvas.width = curWidth;
                tmpCanvas.height = curHeight;
                tmpCanvas.getContext("2d").drawImage(c.img, 0, 0);
                while (curWidth * 0.5 > rW && curHeight * 0.5 > rH) {
                  let nextWidth = Math.max(1, Math.floor(curWidth * 0.5));
                  let nextHeight = Math.max(1, Math.floor(curHeight * 0.5));
                  if (nextWidth >= curWidth && nextHeight >= curHeight) break;
                  let nextCanvas = document.createElement("canvas");
                  nextCanvas.width = nextWidth;
                  nextCanvas.height = nextHeight;
                  let nextCtx = nextCanvas.getContext("2d");
                  nextCtx.imageSmoothingEnabled = true;
                  nextCtx.imageSmoothingQuality = "high";
                  nextCtx.drawImage(tmpCanvas, 0, 0, nextWidth, nextHeight);
                  tmpCanvas = nextCanvas;
                  curWidth = nextWidth;
                  curHeight = nextHeight;
                }
                sourceImg = tmpCanvas;
                sW = curWidth;
                sH = curHeight;
              }
              ctx.drawImage(sourceImg, 0, 0, sW, sH, x, y, rW, rH);
            }

            if (c.text) {
              ctx.fillStyle = this.els.color.value;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              const fontFam = this.els.fontFamily.value || "Arial";
              const fontSize =
                c.fontValOverride !== null
                  ? c.fontValOverride
                  : this.getGlobalFont();
              ctx.font = `${this.els.bold.checked ? "700" : "400"} ${fontSize}px "${fontFam}"`;
              const lines = c.text.split("\n"),
                lh = fontSize * 1.25;
              const yS =
                (tH * (c.txtSlider || 90)) / 100 -
                (lh * lines.length) / 2 +
                lh / 2;
              lines.forEach((l, i) => ctx.fillText(l, tW / 2, yS + i * lh));
            }
            return !isVector && rawScale > 1;
          },
          async performHighQualityDraw(canvas, c, tW, tH) {
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, tW, tH);
            const pad =
              c.padding !== null
                ? c.padding
                : parseInt(this.els.padding.value, 10) || 0;
            const aW = Math.max(1, tW - pad * 2),
              aH = Math.max(1, tH - pad * 2);
            const rawScale = Math.min(
              aW / c.img.naturalWidth,
              aH / c.img.naturalHeight,
            );
            const isVector = c.file && c.file.type === "image/svg+xml";
            const scale = isVector ? rawScale : Math.min(rawScale, 1);
            const rW = c.img.naturalWidth * scale,
              rH = c.img.naturalHeight * scale;
            const gPos =
              c.imgSlider !== 0
                ? c.imgSlider
                : parseInt(this.els.pos.value, 10) || 0;
            const x = (tW - rW) / 2,
              y = (tH - rH) / 2 + (gPos / 100) * tH;

            if (
              rW > 0 &&
              rH > 0 &&
              c.img.naturalWidth > 0 &&
              c.img.naturalHeight > 0
            ) {
              const offscreenCanvas = document.createElement("canvas");
              offscreenCanvas.width = rW;
              offscreenCanvas.height = rH;

              if (this.picaRunner && !isVector) {
                await this.picaRunner.resize(c.img, offscreenCanvas, {
                  unsharpAmount: 80,
                  unsharpRadius: 0.6,
                  unsharpThreshold: 2,
                });
              } else {
                offscreenCanvas.getContext("2d").drawImage(c.img, 0, 0, rW, rH);
              }

              ctx.drawImage(offscreenCanvas, x, y, rW, rH);
            }

            if (c.text) {
              ctx.fillStyle = this.els.color.value;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              const fontFam = this.els.fontFamily.value || "Arial";
              const fontSize =
                c.fontValOverride !== null
                  ? c.fontValOverride
                  : this.getGlobalFont();
              ctx.font = `${this.els.bold.checked ? "700" : "400"} ${fontSize}px "${fontFam}"`;
              const lines = c.text.split("\n"),
                lh = fontSize * 1.25;
              const yS =
                (tH * (c.txtSlider || 90)) / 100 -
                (lh * lines.length) / 2 +
                lh / 2;
              lines.forEach((l, i) => ctx.fillText(l, tW / 2, yS + i * lh));
            }
          },
          openDetail(index) {
            if (index < 0 || index >= this.cards.length) return;
            this.activeDetailIndex = index;
            const obj = this.cards[index];
            this.els.mOverlay.classList.add("active");
            this.els.mIndex.innerText = `${index + 1} of ${this.cards.length}`;
            this.els.mFname.value = obj.fname;
            this.els.mText.value = obj.text;
            this.els.mFontSize.value = obj.fontValOverride || "";
            this.els.mImgSlider.value = obj.imgSlider;
            this.els.mTxtSlider.value = obj.txtSlider;
            if (obj.padding !== null) {
              this.els.mPaddingSlider.value = obj.padding;
              this.els.mResetPadding.style.display = "block";
            } else {
              this.els.mPaddingSlider.value =
                parseInt(this.els.padding.value, 10) || 0;
              this.els.mResetPadding.style.display = "none";
            }
            this.draw(obj);
          },
          closeDetail() {
            this.activeDetailIndex = null;
            this.els.mOverlay.classList.remove("active");
          },
          goDetail(dir) {
            if (this.activeDetailIndex === null || !this.cards.length) return;
            let next = this.activeDetailIndex + dir;
            if (next < 0) next = this.cards.length - 1;
            if (next >= this.cards.length) next = 0;
            this.openDetail(next);
          },
          async downloadSingle(c) {
            const canvas = document.createElement("canvas");
            let tW = parseInt(this.els.width.value, 10);
            let tH = parseInt(this.els.height.value, 10);
            
            if (isNaN(tW) || tW <= 0) tW = c.img.naturalWidth || 300;
            if (isNaN(tH) || tH <= 0) tH = c.img.naturalHeight || 400;
            
            canvas.width = tW;
            canvas.height = tH;
            await this.performHighQualityDraw(canvas, c, tW, tH);
            const format = this.els.format ? this.els.format.value : "png";
            const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
            const ext = format === "jpeg" ? "jpg" : "png";
            const blob = await new Promise((r) =>
              canvas.toBlob(r, mimeType, 0.95),
            );
            const name = Core.Utils.sanitize(c.fname || "logo") || "logo";
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${name}.${ext}`;
            a.click();
          },
          async downloadActiveDetail() {
            if (
              this.activeDetailIndex !== null &&
              this.cards[this.activeDetailIndex]
            ) {
              await this.downloadSingle(this.cards[this.activeDetailIndex]);
            }
          },
          openLinkGen() {
            document
              .getElementById("logoLinkGenOverlay")
              .classList.add("active");
            document.getElementById("logoLinkBrands").value = "";
            document.getElementById("logoLinkOutput").value = "";
            document.getElementById("logoLinkStatus").innerText =
              `${this.cards.length} logos loaded.`;
          },
          closeLinkGen() {
            document
              .getElementById("logoLinkGenOverlay")
              .classList.remove("active");
          },
          generateLinks() {
            const brandsText = document.getElementById("logoLinkBrands").value;
            const brands = brandsText
              .split("\n")
              .map((b) => b.trim())
              .filter((b) => b);
            const logos = this.cards;

            if (brands.length === 0) {
              return UI.showError("Please provide at least one brand name.");
            }

            if (logos.length === 0) {
              document
                .getElementById("logoLinkWarningOverlay")
                .classList.add("active");
              return;
            }

            this.executeGenerateLinks(false);
          },
          executeGenerateLinks(forceNoLogos) {
            const server = document.querySelector(
              'input[name="logoLinkServer"]:checked',
            ).value;
            const folder = (
              document.getElementById("logoLinkFolder").value || ""
            ).trim();
            const brandsText = document.getElementById("logoLinkBrands").value;

            const baseUrl =
              server === "s3"
                ? "https://s3media-ml-eu.surveycenter.com/"
                : "https://aldimediaeu.blob.core.windows.net/aldimediaeu/";

            const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
            const folderPath = cleanFolder ? `${cleanFolder}/` : "";

            const brands = brandsText
              .split("\n")
              .map((b) => b.trim())
              .filter((b) => b);
            const logos = [...this.cards];

            const norm = (s) =>
              s
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
            const levenshtein = (a, b) => {
              const matrix = Array(a.length + 1)
                .fill()
                .map(() => Array(b.length + 1).fill(0));
              for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
              for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
              for (let i = 1; i <= a.length; i++) {
                for (let j = 1; j <= b.length; j++) {
                  if (a[i - 1] === b[j - 1])
                    matrix[i][j] = matrix[i - 1][j - 1];
                  else
                    matrix[i][j] =
                      Math.min(
                        matrix[i - 1][j - 1],
                        matrix[i][j - 1],
                        matrix[i - 1][j],
                      ) + 1;
                }
              }
              return matrix[a.length][b.length];
            };

            let pairs = [];
            for (let i = 0; i < brands.length; i++) {
              for (let j = 0; j < logos.length; j++) {
                const bNorm = norm(brands[i]);
                const lNorm = norm(logos[j].fname || "");
                let score = 0;
                if (bNorm === lNorm) {
                  score = 1;
                } else if (lNorm.includes(bNorm) || bNorm.includes(lNorm)) {
                  score =
                    0.8 +
                    (Math.min(lNorm.length, bNorm.length) /
                      Math.max(lNorm.length, bNorm.length)) *
                      0.1;
                } else {
                  const dist = levenshtein(bNorm, lNorm);
                  const maxLen = Math.max(bNorm.length, lNorm.length);
                  score = maxLen === 0 ? 0 : 1 - dist / maxLen;
                }
                pairs.push({ brandIdx: i, logoIdx: j, score });
              }
            }

            pairs.sort((a, b) => b.score - a.score);

            let usedBrands = new Set();
            let usedLogos = new Set();
            let brandToLogo = {};

            for (const pair of pairs) {
              if (
                !usedBrands.has(pair.brandIdx) &&
                !usedLogos.has(pair.logoIdx)
              ) {
                brandToLogo[pair.brandIdx] = logos[pair.logoIdx];
                usedBrands.add(pair.brandIdx);
                usedLogos.add(pair.logoIdx);
              }
            }

            for (let i = 0; i < brands.length; i++) {
              if (!usedBrands.has(i)) {
                let fallback = null;
                for (let j = 0; j < logos.length; j++) {
                  if (!usedLogos.has(j)) {
                    fallback = logos[j];
                    usedLogos.add(j);
                    break;
                  }
                }
                brandToLogo[i] = fallback;
              }
            }

            let output = "";
            const format = this.els.format ? this.els.format.value : "png";
            const ext = format === "jpeg" ? "jpg" : "png";

            for (let i = 0; i < brands.length; i++) {
              const brand = brands[i];
              const logo = brandToLogo[i];
              let logoName = "";

              if (logo) {
                logoName = (logo.fname || `logo_${i + 1}`) + "." + ext;
              } else {
                logoName =
                  Core.Utils.sanitize(
                    brand.substring(0, 30).replace(/-/g, "_"),
                  ) +
                  "." +
                  ext;
              }

              const url = `${baseUrl}${folderPath}${logoName}`;
              const link = `<center><img src="${url}" style="max-width:100%" align ="center"></center><span style="display:none;">${brand}</span>`;
              output += link + "\n";
            }

            document.getElementById("logoLinkOutput").value = output.trim();
            document.getElementById("logoLinkStatus").innerText =
              `Generated ${brands.length} links.`;
          },
          copyLinks() {
            const text = document.getElementById("logoLinkOutput").value;
            if (!text) return UI.showError("Nothing to copy!");
            navigator.clipboard
              .writeText(text)
              .then(() => {
                UI.showSuccess(
                  document.getElementById("logoLinkCopyBtn"),
                  "Copied HTML",
                );
              })
              .catch(() => UI.showError("Failed to copy text."));
          },
          async exportAll() {
            if (!this.cards.length) return;
            this.els.exportBtn.innerText = "Processing...";
            this.els.exportBtn.disabled = true;
            const toast = document.getElementById("errorToast");
            toast.innerText = "Generating high-fidelity ZIP archive...";
            toast.style.borderColor = "var(--accent)";
            toast.classList.add("visible");
            const zip = new JSZip();
            const format = this.els.format ? this.els.format.value : "png";
            const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
            const ext = format === "jpeg" ? "jpg" : "png";
            for (let i = 0; i < this.cards.length; i++) {
              const c = this.cards[i];
              const canvas = document.createElement("canvas");
              let tW = parseInt(this.els.width.value, 10);
              let tH = parseInt(this.els.height.value, 10);
              
              if (isNaN(tW) || tW <= 0) tW = c.img.naturalWidth || 300;
              if (isNaN(tH) || tH <= 0) tH = c.img.naturalHeight || 400;
              canvas.width = tW;
              canvas.height = tH;
              await this.performHighQualityDraw(canvas, c, tW, tH);
              const b = await new Promise((r) =>
                canvas.toBlob(r, mimeType, 0.95),
              );
              const name = Core.Utils.sanitize(c.fname || `logo_${i + 1}`);
              zip.file(`${name}.${ext}`, b);
            }
            zip
              .generateAsync({ type: "blob" })
              .then((c) => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(c);
                a.download = "batch_logos.zip";
                a.click();
                this.els.exportBtn.innerText = "Download Zip";
                this.els.exportBtn.disabled = false;
                UI.showSuccess(this.els.exportBtn);
                toast.classList.remove("visible");
                toast.style.borderColor = "";
              })
              .catch((err) => {
                toast.classList.remove("visible");
                toast.style.borderColor = "";
                UI.showError("Export failed: " + err);
                this.els.exportBtn.innerText = "Download Zip";
                this.els.exportBtn.disabled = false;
              });
          },
        },

};
