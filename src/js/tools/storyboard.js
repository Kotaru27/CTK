/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
        Story: {
          projects: [],
          active: null,
          canvas: null,
          els: {
            tabs: document.getElementById("storyProjectTabs"),
            list: document.getElementById("storyFileList"),
            preview: document.getElementById("storyPreview"),
            name: document.getElementById("storyNameInput"),
            drop: document.getElementById("storyDropZone"),
            input: document.getElementById("storyInput"),
          },
          init() {
            Core.Utils.createDropZone(this.els.drop, (f) =>
              this.handleFiles(f),
            );
            this.els.input.onchange = (e) => {
              this.handleFiles([...e.target.files]);
              this.els.input.value = "";
            };
            this.els.name.oninput = () => {
              this.els.name.value = Core.Utils.sanitize(this.els.name.value);
              this.saveSettings();
              this.renderTabs();
            };
            [
              "storyGap",
              "storyWidth",
              "storyAutoWidth",
              "storyCols",
              "storyFitMode",
              "storyBgColor",
            ].forEach((id) => {
              document.getElementById(id).addEventListener(
                "change",
                Core.Utils.debounce(() => {
                  if (id === "storyAutoWidth") {
                    document.getElementById(
                      "storyWidthContainer",
                    ).style.display = document.getElementById("storyAutoWidth")
                      .checked
                      ? "none"
                      : "block";
                  }
                  this.saveSettings();
                  this.draw();
                }, 150),
              );
            });
            document.getElementById("generateStoryBtn").onclick = () => this.draw();
            // Optional recommendation only; existing fit mode is unchanged until clicked.
            const fit = document.getElementById("storyFitMode");
            if (fit && !document.getElementById("storySmartFit")) {
              const advice = document.createElement("button");
              advice.type="button"; advice.id="storySmartFit"; advice.className="liquid-btn";
              advice.textContent="Preserve full frames";
              advice.title="Use Contain mode so mixed aspect-ratio images are never cropped";
              advice.style.cssText="margin-top:7px; font-size:11px; padding:5px 9px;";
              advice.onclick=()=> {fit.value="contain";this.saveSettings();this.draw();};
              fit.insertAdjacentElement("afterend",advice);
            }
            document.getElementById("downloadStoryBtn").onclick = async () => {
              if (!this.canvas || !this.active?.images.length) return;
              try {
                const blob = await this.encodeBoard(this.canvas);
                this.saveBoardBlob(blob,`${this.safeExportName(this.active.name)}.jpg`);
              } catch (e) { UI.showError(`Storyboard export failed: ${e.message}`); }
            };
            document.getElementById("downloadAllStoryBtn").onclick = () =>
              this.downloadAll();
            document.getElementById("clearStoryBtn").onclick = () => {
              UI.confirm({
                title: "Clear storyboard?",
                message: "This removes every frame from the current board. This action cannot be undone.",
                okLabel: "Clear",
                cancelLabel: "Cancel",
              }).then((ok) => {
                if (!ok) return;
                const items = Array.from(this.els.list.children).filter(
                  (el) => !el.id.includes("Empty"),
                );
                if (this.canvas) items.push(this.canvas);
                window.applyThanosSnap(items).then(() => this.destroy());
              });
            };
            this.addNewProject();
          },
          destroy() {
            this.active.images.forEach((i) => Core.BlobRegistry.release(i.img.src));
            this.active.images = [];
            this.canvas = null;
            this.updateList();
            this.els.preview.innerHTML =
              '<span class="text-muted">Preview</span>';
          },
          addNewProject() {
            const id = Date.now();
            this.projects.push({
              id,
              name: `Board_${this.projects.length + 1}`,
              images: [],
              settings: {
                gap: 0,
                width: 1920,
                autoWidth: true,
                cols: 0,
                bgColor: "#ffffff",
                fitMode: "cover",
              },
            });
            this.switchProject(id);
          },
          switchProject(id) {
            if (this.active) this.saveSettings();
            this.active = this.projects.find((p) => p.id === id);
            this.loadSettings();
            this.renderTabs();
            this.updateList();
            if (this.active.images.length > 0) {
              this.draw();
            } else {
              this.els.preview.innerHTML =
                '<span class="text-muted">Preview</span>';
            }
          },
          saveSettings() {
            if (!this.active) return;
            const s = this.active.settings;
            s.gap = parseInt(document.getElementById("storyGap").value) || 0;
            s.width =
              parseInt(document.getElementById("storyWidth").value) || 1920;
            s.autoWidth = document.getElementById("storyAutoWidth").checked;
            s.cols = parseInt(document.getElementById("storyCols").value) || 0;
            s.bgColor = document.getElementById("storyBgColor").value;
            s.fitMode = document.getElementById("storyFitMode").value;
            this.active.name = this.els.name.value;
          },
          loadSettings() {
            if (!this.active) return;
            const s = this.active.settings;
            document.getElementById("storyGap").value = s.gap;
            document.getElementById("storyWidth").value = s.width;
            document.getElementById("storyCols").value = s.cols || 0;
            document.getElementById("storyAutoWidth").checked = s.autoWidth;
            document.getElementById("storyBgColor").value =
              s.bgColor || "#ffffff";
            document.getElementById("storyFitMode").value =
              s.fitMode || "cover";
            this.els.name.value = this.active.name;
            document.getElementById("storyWidthContainer").style.display =
              s.autoWidth ? "none" : "block";
          },
          renderTabs() {
            this.els.tabs.innerHTML = "";
            this.projects.forEach((p) => {
              const tab = document.createElement("div");
              tab.style.cssText = `padding:6px 12px; background:${p.id === this.active.id ? "var(--text-main)" : "var(--bg-panel)"}; color:${p.id === this.active.id ? "var(--bg-main)" : "var(--text-main)"}; border: 1px solid var(--border); font-size:0.75rem; cursor:pointer; display:flex; gap:6px; align-items:center; `;
              tab.innerHTML = `<span>${p.name}</span><span style="opacity:0.5;" title="Delete">&times;</span>`;
              tab.querySelector("span:last-child").onclick = (e) => {
                e.stopPropagation();
                this.deleteProject(p.id);
              };
              tab.onclick = () => this.switchProject(p.id);
              this.els.tabs.appendChild(tab);
            });
          },
          deleteProject(id) {
            UI.confirm({
              title: "Delete this board?",
              message: "This board and all of its frames will be permanently removed.",
              okLabel: "Delete",
              cancelLabel: "Cancel",
            }).then((ok) => {
              if (!ok) return;
              const idx = this.projects.findIndex((p) => p.id === id);
              if (idx < 0) return;
              // Release only assets belonging to the deleted board.
              this.projects[idx].images.forEach((item) => Core.BlobRegistry.release(item.img.src));
              this.projects.splice(idx, 1);
              if (this.projects.length === 0) this.addNewProject();
              else this.switchProject(this.projects[Math.max(0, idx - 1)].id);
            });
          },
          safeExportName(name) {
            return String(name || "Board").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,100) || "Board";
          },
          validateImage(img) {
            return !!img && Number.isFinite(img.naturalWidth || img.width) &&
              Number.isFinite(img.naturalHeight || img.height) &&
              (img.naturalWidth || img.width)>0 && (img.naturalHeight || img.height)>0;
          },
          async encodeBoard(canvas) {
            if (!canvas || canvas.width < 1 || canvas.height < 1) throw Error("No rendered board available");
            const blob=await new Promise((resolve,reject)=> {
              try {canvas.toBlob(resolve,"image/jpeg",0.95);} catch(e) {reject(e);}
            });
            if (!blob?.size) throw Error("Canvas returned no image data");
            return blob;
          },
          saveBoardBlob(blob, name) {
            const url=URL.createObjectURL(blob);
            const a=document.createElement("a");a.href=url;a.download=name;
            document.body.appendChild(a);a.click();a.remove();
            setTimeout(()=>URL.revokeObjectURL(url),60000);
          },
          async handleFiles(files) {
            const project = this.active;
            if (!project) return;
            let rejected=0;
            for (const file of files) {
              if (project.images.length >= 200) {rejected++;continue;}
              if (!file || file.size > 100*1024*1024) {rejected++;continue;}
              let img=null;
              if (file.type.startsWith("video/")) {
                img=await this.getVideoFrame(file);
              } else if (file.type.startsWith("image/")) {
                const url=Core.BlobRegistry.create(file,"story");
                img=new Image();
                try {
                  await new Promise((resolve,reject)=> {
                    img.onload=resolve; img.onerror=()=>reject(Error("Invalid image"));img.src=url;
                  });
                } catch { Core.BlobRegistry.release(url);img=null; }
              } else { rejected++;continue; }
              if (!this.validateImage(img)) {rejected++;continue; }
              project.images.push({file,img});
            }
            if (rejected) UI.showError(`${rejected} unsupported, damaged or oversized storyboard files skipped.`);
            // An upload may have finished after the user switched boards.
            if (this.active===project) {this.saveSettings();this.updateList();this.draw();}
          },
          getVideoFrame(file) {
            return new Promise(resolve=> {
              const video=document.createElement("video");
              const url=URL.createObjectURL(file);
              video.muted=true;
              let done=false;
              const timeout=setTimeout(()=>finish(null),15000);
              const finish=(img)=> {
                if(done)return;done=true;clearTimeout(timeout);
                video.pause();video.removeAttribute("src");video.load();URL.revokeObjectURL(url);
                resolve(img);
              };
              video.onerror=()=>finish(null);
              video.onloadedmetadata=()=> {
                if(!Number.isFinite(video.duration) || !video.videoWidth || !video.videoHeight) return finish(null);
                try {video.currentTime=Math.min(1,Math.max(0,video.duration/2));}catch{return finish(null);}
              };
              video.onseeked=()=> {
                try {
                  const c=document.createElement("canvas");c.width=video.videoWidth;c.height=video.videoHeight;
                  c.getContext("2d").drawImage(video,0,0);
                  const img=new Image();img.onload=()=>finish(img);img.onerror=()=>finish(null);
                  img.src=c.toDataURL("image/jpeg");
                }catch {finish(null);}
              };
              video.src=url;
            });
          },
          updateList() {
            this.els.list.innerHTML = "";
            this.active.images.forEach((item, index) => {
              const div = document.createElement("div");
              div.style.cssText =
                "display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg-panel); border:1px solid var(--border); font-size:0.85rem; border-radius:0; margin-bottom:6px; transition: none;";
              div.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><img src="${item.img.src}" title="${item.label || ""}" style="width:30px; height:30px; object-fit:cover; border-radius:0;"><span>${index + 1}</span></div><div style="display:flex; gap:5px;"><button class="liquid-btn" style="padding:0 8px; height:28px;" onclick="Tools.Story.moveImage(${index},-1)">&uarr;</button><button class="liquid-btn" style="padding:0 8px; height:28px;" onclick="Tools.Story.moveImage(${index},1)">&darr;</button><button class="liquid-btn danger-btn" style="padding:0 8px; height:28px;" onclick="Tools.Story.removeImage(${index})">&times;</button></div>`;
              this.els.list.appendChild(div);
            });
          },
          moveImage(idx, dir) {
            const t = idx + dir;
            if (t < 0 || t >= this.active.images.length) return;
            [this.active.images[idx], this.active.images[t]] = [
              this.active.images[t],
              this.active.images[idx],
            ];
            this.updateList();
            this.draw();
          },
          removeImage(idx) {
            const row = this.els.list.children[idx];
            const items = [];
            if (row) items.push(row);
            if (this.canvas) items.push(this.canvas);
            const performRemove = () => {
              Core.BlobRegistry.release(this.active.images[idx].img.src);
              this.active.images.splice(idx, 1);
              this.saveSettings();
              this.updateList();
              this.draw();
            };
            if (items.length) {
              window.applyThanosSnap(items).then(performRemove);
            } else {
              performRemove();
            }
          },
          draw() {
            if (!this.active || !this.active.images.length) {
              if (this.canvas) {
                this.els.preview.innerHTML =
                  '<span class="text-muted">Preview</span>';
                this.canvas = null;
              }
              return;
            }
            const imgs = this.active.images;
            if (imgs.some(item=>!this.validateImage(item.img) || item.img.complete===false)) {
              UI.showError("A storyboard source is still loading or invalid. Remove it before exporting.");
              return;
            }
            const s = this.active.settings;
            const cols = Number(s.cols) || 0;
            const gap = Number(s.gap) || 0;
            const width = Number(s.width) || 1920;
            if (cols < 0 || cols > 100 || gap < 0 || gap > 1000 ||
                (!s.autoWidth && (width < 64 || width > 8192 || cols > 0 && width <= gap*(cols-1)+cols))) {
              UI.showError("Invalid storyboard dimensions. Reduce columns/gaps or choose a width between 64 and 8192.");
              return;
            }
            const ratios=imgs.map(item=>(item.img.naturalWidth||item.img.width)/(item.img.naturalHeight||item.img.height));
            const ratioSpread=Math.max(...ratios)/Math.min(...ratios);
            const recommend=document.getElementById("storySmartFit");
            if (recommend) {
              const mixed=ratioSpread > 1.35 && s.fitMode === "cover";
              recommend.textContent=mixed ? "Mixed ratios · preserve full frames" : "Preserve full frames";
              recommend.title=mixed ? "Your sources have different shapes. Contain prevents cropping. Click to apply." : "Use Contain to preserve each full frame";
            }
            let c;
            try {c = Core.AdaptiveRenderer.renderBoard(imgs, {
              cols: cols,
              rows: 0,
              autoWidth: s.autoWidth,
              targetWidth: width,
              gap: gap,
              bgColor: s.bgColor,
              fitMode: s.fitMode,
            });} catch(e) {UI.showError(`Storyboard could not render: ${e.message}`);return;}
            if (!c || !c.width || !c.height) {UI.showError("Storyboard renderer returned an empty canvas");return;}
            c.onclick = () => UI.openLightbox(c.toDataURL("image/jpeg", 0.95));
            this.canvas = c;
            this.els.preview.innerHTML = "";
            this.els.preview.appendChild(c);
            const badge = document.createElement("div");
            badge.innerHTML = `<span style="opacity:0.7">SIZE:</span> ${Math.round(c.width)} <span style="opacity:0.7">x</span> ${Math.round(c.height)}`;
            badge.style.cssText =
              "position:absolute; top:20px; right:20px; background:var(--bg-panel); color:var(--text-main); padding:6px 10px; border-radius:0; font-size:1.2rem; font-family:var(--font); font-weight:600; border:1px solid var(--border); pointer-events:none; letter-spacing:1px; z-index:10; box-shadow: none;";
            this.els.preview.appendChild(badge);
          },
          async downloadAll() {
            if (!this.projects.some(p=>p.images.length)) return;
            const btn=document.getElementById("downloadAllStoryBtn");
            if (btn.disabled) return;
            const oldLabel=btn.innerText;
            const origId=this.active.id;
            btn.disabled=true;btn.innerText="Preparing ZIP...";
            const zip=new JSZip();
            let succeeded=0,failed=0;
            const usedNames=new Set();
            try {
              for (const p of this.projects) {
                if (!p.images.length) continue;
                this.active=p;
                const previous=this.canvas;
                this.canvas=null;
                this.draw();
                try {
                  if (!this.canvas || this.canvas===previous) throw Error("Board did not render");
                  const blob=await this.encodeBoard(this.canvas);
                  const base=this.safeExportName(p.name);
                  let name=base,counter=2;
                  while(usedNames.has(name.toLowerCase()))name=`${base}_${counter++}`;
                  usedNames.add(name.toLowerCase());
                  zip.file(`${name}.jpg`,blob);
                  succeeded++;
                } catch(e) { failed++; console.warn("Skipped invalid storyboard:",p.name,e); }
              }
              if (!succeeded) throw Error("No boards could be exported");
              const content=await zip.generateAsync({type:"blob"});
              if (!content.size) throw Error("Empty ZIP");
              this.saveBoardBlob(content,"boards.zip");
              if(failed)UI.showError(`${failed} invalid board(s) skipped; ${succeeded} exported.`);
            } catch(e) {UI.showError(`Storyboard ZIP failed: ${e.message}`);}
            finally {
              // Do not use switchProject here: it would save the previous board's
              // controls into whichever project was last rendered for the ZIP.
              this.active=this.projects.find(p=>p.id===origId)||this.projects[0];
              if(this.active){this.loadSettings();this.renderTabs();this.updateList();this.draw();}
              btn.disabled=false;btn.innerText=oldLabel;
            }
          },
        },

};
