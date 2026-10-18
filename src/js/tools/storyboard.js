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
            // One existing Add Assets surface; users choose files or a directory
            // in its compact menu. No standalone folder button in the sidebar.
            const trigger = this.els.input.closest?.("label");
            if (trigger && !document.getElementById("storyFolderInput")) {
              const folderInput = document.createElement("input");
              folderInput.type = "file";
              folderInput.id = "storyFolderInput";
              folderInput.multiple = true;
              folderInput.hidden = true;
              folderInput.setAttribute("webkitdirectory", "");
              folderInput.addEventListener("change", event => {
                const files = [...(event.target.files || [])];
                event.target.value = "";
                if (files.length) this.importFolder(files);
              });
              this.els.drop.appendChild(folderInput);
              const menu = document.createElement("div");
              menu.id = "storyImportMenu";
              menu.className = "story-import-menu";
              menu.setAttribute("role", "menu");
              menu.hidden = true;
              const option = (label,onClick) => {
                const button = document.createElement("button");
                button.type = "button";
                button.setAttribute("role", "menuitem");
                button.textContent = label;
                button.onclick = () => {menu.hidden = true;trigger.setAttribute("aria-expanded","false");onClick();};
                menu.appendChild(button);
              };
              option("Choose stills folder / campaign folder",()=>folderInput.click());
              option("Choose individual image or video files",()=>this.els.input.click());
              this.els.drop.appendChild(menu);
              trigger.tabIndex = 0;
              trigger.setAttribute("role","button");
              trigger.setAttribute("aria-haspopup","menu");
              trigger.setAttribute("aria-expanded","false");
              trigger.onclick = event => {
                if (event.target === this.els.input) return;
                event.preventDefault();
                menu.hidden = !menu.hidden;
                trigger.setAttribute("aria-expanded",String(!menu.hidden));
              };
              trigger.onkeydown = event => {
                if (event.key==="Enter" || event.key===" ") {event.preventDefault();trigger.click();}
                if (event.key==="Escape") {menu.hidden=true;trigger.setAttribute("aria-expanded","false");}
              };
              document.addEventListener("pointerdown",event=>{
                if (!this.els.drop.contains(event.target)) {
                  menu.hidden=true;trigger.setAttribute("aria-expanded","false");
                }
              });
            }
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
            // Keep Storyboard's established borderless presentation. The last
            // capability pass introduced a separate fit recommendation control;
            // restore the original controls without losing validation logic.
            for (const id of ["storyPreview", "storyBoardPreviewArea"]) {
              const area = document.getElementById(id);
              if (area) {
                area.style.setProperty("border", "0", "important");
                area.style.setProperty("box-shadow", "none", "important");
              }
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
          createProject(name) {
            let id = Date.now();
            while (this.projects.some(project=>project.id===id)) id++;
            const project={
              id,name:name||`Board_${this.projects.length+1}`,images:[],
              settings:{gap:0,width:1920,autoWidth:true,cols:0,bgColor:"#ffffff",fitMode:"cover"}
            };
            this.projects.push(project);
            return project;
          },
          addNewProject() {
            const project=this.createProject();
            this.switchProject(project.id);
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
            const tabs = this.els.tabs;
            tabs.replaceChildren();
            this.projects.forEach((project) => {
              const active = project.id === this.active?.id;
              const tab = document.createElement("div");
              tab.className = "story-project-pill";
              tab.dataset.active = active ? "true" : "false";

              const open = document.createElement("button");
              open.type = "button";
              open.className = "story-project-switch";
              open.textContent = project.name;
              open.title = project.name;
              open.setAttribute("aria-current", active ? "true" : "false");
              open.setAttribute("aria-label", "Open board " + project.name);
              open.onclick = () => this.switchProject(project.id);

              const remove = document.createElement("button");
              remove.type = "button";
              remove.className = "story-project-delete";
              remove.textContent = "\u00d7";
              remove.title = "Delete board " + project.name;
              remove.setAttribute("aria-label", "Delete board " + project.name);
              remove.onclick = (event) => {
                event.stopPropagation();
                this.deleteProject(project.id);
              };
              tab.append(open, remove);
              tabs.appendChild(tab);
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
          folderGroups(files) {
            const paths = files.map(file=>String(file?.webkitRelativePath||"").split("/"));
            if (!paths.length || paths.some(parts=>parts.length<2)) return [];
            const root=paths[0][0];
            if (!root || paths.some(parts=>parts[0]!==root)) return [];
            const natural=new Intl.Collator(undefined,{numeric:true,sensitivity:"base"});
            const hasChildren=paths.some(parts=>parts.length>=3);
            const groups=new Map();
            files.forEach((file,index)=>{
              const parts=paths[index];
              if (!file || !(file.type.startsWith("image/")||file.type.startsWith("video/"))) return;
              if (hasChildren && parts.length<3) return;
              const name=hasChildren ? parts[1] : root;
              if (!name) return;
              if (!groups.has(name))groups.set(name,[]);
              groups.get(name).push(file);
            });
            return [...groups].sort((a,b)=>natural.compare(a[0],b[0]))
              .map(([name,items])=>({
                name:Core.Utils.sanitize(name).trim().slice(0,80)||"Storyboard",
                items:items.sort((a,b)=>natural.compare(a.name,b.name))
              }));
          },
          async importFolder(files) {
            if (this._folderImportBusy) {UI.showError("Finish the current folder import first.");return;}
            const groups=this.folderGroups(files);
            if (!groups.length) {UI.showError("Choose a directory containing image or video stills.");return;}
            const total=groups.reduce((sum,g)=>sum+g.items.length,0);
            if (groups.length>100 || total>2000) {
              UI.showError("Import limit: 100 boards or 2,000 stills per batch. Split the folder into smaller batches.");
              return;
            }
            this._folderImportBusy=true;
            const previous=this.active;
            const reusable=previous?.images.length===0 ? previous : null;
            let first=null,imported=0,skipped=0;
            try {
              for (const group of groups) {
                const project=first===null && reusable ? reusable : this.createProject(group.name);
                const generated=project!==reusable;
                const before=project.images.length;
                await this.handleFiles(group.items,project,group.name);
                const count=project.images.length-before;
                if (count===0) {
                  if (generated) this.projects.splice(this.projects.indexOf(project),1);
                  skipped+=group.items.length;
                  continue;
                }
                imported++;
                if (!first)first=project;
                await new Promise(resolve=>setTimeout(resolve,0));
              }
              if (first) this.switchProject(first.id);
              else if(previous) this.switchProject(previous.id);
              if (imported) UI.toast?.(`Imported ${imported} storyboard${imported===1?"":"s"} from folders`);
              if(skipped)UI.showError?.(`${skipped} stills could not be added.`);
            } catch(error) {
              if(first) this.switchProject(first.id);
              UI.showError?.("Folder import stopped: "+error.message);
            } finally {this._folderImportBusy=false;}
          },
          folderNameFromFiles(files) {
            const paths = Array.from(files || [], file => String(file?.webkitRelativePath || ""));
            if (!paths.length || !paths[0].includes("/")) return "";
            const root = paths[0].split("/")[0];
            if (!root || paths.some(path => !path.includes("/") || path.split("/")[0] !== root)) return "";
            return Core.Utils.sanitize(root).trim().slice(0, 80);
          },
          async handleFiles(files, destination=this.active, preferredFolderName="") {
            const project = destination;
            if (!project) return;
            const initialName = project.name;
            const wasEmpty = project.images.length === 0;
            const folderName = preferredFolderName || this.folderNameFromFiles(files);
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
            // Rename only a previously empty board that actually received files.
            // Respect edited names and prevent duplicate board names.
            if (wasEmpty && project.images.length && folderName && project.name === initialName) {
              let candidate = folderName;
              for (let n = 2; this.projects.some(other =>
                other !== project && other.name.toLowerCase() === candidate.toLowerCase()); n++) {
                candidate = folderName + " " + n;
              }
              project.name = candidate;
              if (this.active === project) this.els.name.value = candidate;
              this.renderTabs();
            }
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
            const list = this.els.list;
            list.replaceChildren();
            this.active.images.forEach((item, index) => {
              const row = document.createElement("div");
              row.className = "story-asset-row";

              const identity = document.createElement("div");
              identity.className = "story-asset-identity";
              const thumbnail = document.createElement("img");
              thumbnail.className = "story-asset-thumb";
              thumbnail.src = item.img.src;
              thumbnail.alt = "";
              const details = document.createElement("div");
              details.className = "story-asset-details";
              const number = document.createElement("span");
              number.className = "story-asset-number";
              number.textContent = String(index + 1).padStart(2, "0");
              const name = document.createElement("span");
              name.className = "story-asset-filename";
              const filename = item.file?.name || item.label || "Frame " + (index + 1);
              name.textContent = filename;
              name.title = filename;
              details.append(number, name);
              identity.append(thumbnail, details);

              const actions = document.createElement("div");
              actions.className = "story-asset-actions";
              for (const action of [
                {name:"Move up",glyph:"\u2191",direction:-1},
                {name:"Move down",glyph:"\u2193",direction:1},
                {name:"Remove",glyph:"\u00d7",direction:0}
              ]) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "liquid-btn story-asset-action" +
                  (action.direction === 0 ? " danger-btn" : "");
                button.textContent = action.glyph;
                button.title = action.name + " " + filename;
                button.setAttribute("aria-label",action.name + " " + filename);
                if (action.direction !== 0) {
                  button.disabled = index + action.direction < 0 ||
                    index + action.direction >= this.active.images.length;
                  button.onclick = () => this.moveImage(index, action.direction);
                } else {
                  button.onclick = () => this.removeImage(index);
                }
                actions.appendChild(button);
              }
              row.append(identity, actions);
              list.appendChild(row);
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
            c.style.setProperty("border", "0", "important");
            c.style.setProperty("box-shadow", "none", "important");
            c.onclick = () => UI.openLightbox(c.toDataURL("image/jpeg", 0.95));
            this.canvas = c;
            this.els.preview.innerHTML = "";
            this.els.preview.appendChild(c);
            const badge = document.createElement("div");
            badge.innerHTML = `<span style="opacity:0.7">SIZE:</span> ${Math.round(c.width)} <span style="opacity:0.7">x</span> ${Math.round(c.height)}`;
            badge.style.cssText =
              "position:absolute; top:20px; right:20px; background:var(--bg-panel); color:var(--text-main); padding:6px 10px; border-radius:0; font-size:1.2rem; font-family:var(--font); font-weight:600; border:0; pointer-events:none; letter-spacing:1px; z-index:10; box-shadow: none;";
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
