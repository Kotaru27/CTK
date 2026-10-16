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
            document.getElementById("generateStoryBtn").onclick = () =>
              this.draw();
            document.getElementById("downloadStoryBtn").onclick = () => {
              if (this.canvas) {
                const a = document.createElement("a");
                a.href = this.canvas.toDataURL("image/jpeg", 0.95);
                a.download = `${this.active.name}.jpg`;
                a.click();
              }
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
          async handleFiles(files) {
            for (const file of files) {
              let img;
              if (file.type.startsWith("video/")) {
                try {
                  img = await this.getVideoFrame(file);
                } catch (e) {
                  continue;
                }
              } else if (file.type.startsWith("image/")) {
                img = new Image();
                img.src = Core.BlobRegistry.create(file, "story");
                await new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              } else {
                continue;
              }
              if (!img) continue;
              this.active.images.push({ file, img });
            }
            this.saveSettings();
            this.updateList();
            this.draw();
          },
          getVideoFrame(file) {
            return new Promise((resolve) => {
              const video = document.createElement("video");
              const sourceUrl = URL.createObjectURL(file);
              video.muted = true;
              video.onloadedmetadata = () => {
                video.currentTime = Math.min(1.0, Math.max(0, video.duration / 2));
              };
              video.src = sourceUrl;
              video.onseeked = () => {
                const c = document.createElement("canvas");
                c.width = video.videoWidth;
                c.height = video.videoHeight;
                c.getContext("2d").drawImage(video, 0, 0);
                const img = new Image();
                img.src = c.toDataURL("image/jpeg");
                img.onload = () => {
                  URL.revokeObjectURL(sourceUrl);
                  video.removeAttribute("src");
                  video.load();
                  resolve(img);
                };
                img.onerror = () => {
                  URL.revokeObjectURL(sourceUrl);
                  video.removeAttribute("src");
                  video.load();
                  resolve(null);
                };
              };
              video.onerror = () => {
                URL.revokeObjectURL(sourceUrl);
                resolve(null);
              };
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
            if (!imgs[0].img.complete) return;
            const s = this.active.settings;

            const c = Core.AdaptiveRenderer.renderBoard(imgs, {
              cols: s.cols ? parseInt(s.cols) : 0,
              rows: 0,
              autoWidth: s.autoWidth,
              targetWidth: parseFloat(s.width) || 1920,
              gap: s.gap ? parseInt(s.gap) : 0,
              bgColor: s.bgColor,
              fitMode: s.fitMode,
            });

            if (!c) return;
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
            if (!this.projects.some((p) => p.images.length > 0)) return;
            const btn = document.getElementById("downloadAllStoryBtn");
            btn.innerText = "Processing...";
            const zip = new JSZip();
            const origId = this.active.id;
            for (let i = 0; i < this.projects.length; i++) {
              const p = this.projects[i];
              if (p.images.length === 0) continue;
              this.active = p;
              this.draw();
              if (this.canvas) {
                const blob = await new Promise((r) =>
                  this.canvas.toBlob(r, "image/jpeg", 0.95),
                );
                zip.file(`${p.name}.jpg`, blob);
              }
            }
            this.switchProject(origId);
            const content = await zip.generateAsync({ type: "blob" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(content);
            a.download = "boards.zip";
            a.click();
            btn.innerText = "Download All (Zip)";
          },
        },

};
