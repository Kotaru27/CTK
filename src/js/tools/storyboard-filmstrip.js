/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
        Filmstrip: {
          images: [],
          canvas: null,
          els: {},
          init() {
            this.els = {
              title: document.getElementById("filmstripTitleInput"),
              drop: document.getElementById("filmstripDropZone"),
              input: document.getElementById("filmstripInput"),
              list: document.getElementById("filmstripFileList"),
              emptyMsg: document.getElementById("filmstripEmptyMsg"),
              countBadge: document.getElementById("filmstripCountBadge"),
              container: document.getElementById("filmstripCanvasContainer"),
              rows: document.getElementById("filmstripRowsSelect"),
              framesPerRow: document.getElementById("filmstripFramesPerRowSelect"),
              fitMode: document.getElementById("filmstripFitModeSelect"),
              gap: document.getElementById("filmstripGapInput"),
              rowGap: document.getElementById("filmstripRowGapInput"),
              filmColor: document.getElementById("filmstripFilmColorInput"),
              bgColor: document.getElementById("filmstripBgColorInput"),
              numbers: document.getElementById("filmstripNumbersCheckbox"),
              renderBtn: document.getElementById("renderFilmstripBtn"),
              dlJpgBtn: document.getElementById("downloadFilmstripJpgBtn"),
              dlPngBtn: document.getElementById("downloadFilmstripPngBtn"),
              clearBtn: document.getElementById("clearFilmstripBtn"),
              clearListBtn: document.getElementById("filmstripClearListBtn"),
            };

            if (this.els.drop) {
              Core.Utils.createDropZone(this.els.drop, (f) => this.handleFiles(f));
            }
            if (this.els.input) {
              this.els.input.onchange = (e) => {
                this.handleFiles([...e.target.files]);
                this.els.input.value = "";
              };
            }
            if (this.els.renderBtn) {
              this.els.renderBtn.onclick = () => this.draw();
            }
            if (this.els.dlJpgBtn) {
              this.els.dlJpgBtn.onclick = () => this.download("jpeg");
            }
            if (this.els.dlPngBtn) {
              this.els.dlPngBtn.onclick = () => this.download("png");
            }
            if (this.els.clearBtn) {
              this.els.clearBtn.onclick = () => {
                UI.confirm({
                  title: "Clear filmstrip?",
                  message: "This removes all stills from the current filmstrip. This action cannot be undone.",
                  okLabel: "Clear",
                  cancelLabel: "Cancel",
                }).then((ok) => {
                  if (ok) this.destroy();
                });
              };
            }
            if (this.els.clearListBtn) {
              this.els.clearListBtn.onclick = () => this.destroy();
            }

            [
              this.els.rows,
              this.els.framesPerRow,
              this.els.fitMode,
              this.els.gap,
              this.els.rowGap,
              this.els.filmColor,
              this.els.bgColor,
              this.els.numbers,
            ].forEach((el) => {
              if (el) {
                el.addEventListener("change", () => this.draw());
                el.addEventListener("input", () => this.draw());
              }
            });

            if (this.els.filmColor) {
              const lbl = document.getElementById("filmstripFilmColorLabel");
              this.els.filmColor.addEventListener("input", (e) => {
                if (lbl) lbl.textContent = e.target.value.toUpperCase();
              });
            }
            if (this.els.bgColor) {
              const lbl = document.getElementById("filmstripBgColorLabel");
              this.els.bgColor.addEventListener("input", (e) => {
                if (lbl) lbl.textContent = e.target.value.toUpperCase();
              });
            }

            this.draw();
          },
          sortImagesAscending() {
            this.images.sort((a, b) => {
              const nameA = String(a.name || "");
              const nameB = String(b.name || "");
              return nameA.localeCompare(nameB, undefined, {
                numeric: true,
                sensitivity: "base",
              });
            });
          },
          sortAscendingAndRefresh() {
            if (!this.images || !this.images.length) return;
            this.sortImagesAscending();
            this.updateList();
            this.draw();
            UI.toast("Stills sorted in ascending order");
          },
          handleFiles(files) {
            const valid = files.filter(
              (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
            );
            if (!valid.length) return;
            valid.sort((a, b) =>
              String(a.name || "").localeCompare(String(b.name || ""), undefined, {
                numeric: true,
                sensitivity: "base",
              }),
            );
            let loaded = 0;
            valid.forEach((file) => {
              if (file.type.startsWith("video/")) {
                const vid = document.createElement("video");
                vid.src = URL.createObjectURL(file);
                vid.muted = true;
                vid.onloadedmetadata = () => {
                  vid.currentTime = Math.min(1.0, vid.duration / 2);
                };
                vid.onseeked = () => {
                  const c = document.createElement("canvas");
                  c.width = vid.videoWidth;
                  c.height = vid.videoHeight;
                  c.getContext("2d").drawImage(vid, 0, 0);
                  const img = new Image();
                  img.onload = () => {
                    this.images.push({
                      id: `fs-${Date.now()}-${Math.random()}`,
                      name: file.name,
                      img,
                    });
                    loaded++;
                    if (loaded === valid.length) {
                      this.sortImagesAscending();
                      this.updateList();
                      this.draw();
                    }
                  };
                  img.src = c.toDataURL("image/jpeg", 0.95);
                  URL.revokeObjectURL(vid.src);
                };
              } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const img = new Image();
                  img.onload = () => {
                    this.images.push({
                      id: `fs-${Date.now()}-${Math.random()}`,
                      name: file.name,
                      img,
                    });
                    loaded++;
                    if (loaded === valid.length) {
                      this.sortImagesAscending();
                      this.updateList();
                      this.draw();
                    }
                  };
                  img.src = e.target.result;
                };
                reader.readAsDataURL(file);
              }
            });
          },
          addFromStills(stills) {
            if (!stills || !stills.length) return;
            let loaded = 0;
            stills.forEach((still, idx) => {
              const img = new Image();
              img.onload = () => {
                this.images.push({
                  id: `fs-${Date.now()}-${Math.random()}`,
                  name: still.name || `Still_${still.num !== undefined ? still.num : idx + 1}`,
                  img,
                });
                loaded++;
                if (loaded === stills.length) {
                  this.sortImagesAscending();
                  this.updateList();
                  this.draw();
                }
              };
              img.src = still.url;
            });
          },
          removeImage(index) {
            if (index >= 0 && index < this.images.length) {
              this.images.splice(index, 1);
              this.updateList();
              this.draw();
            }
          },
          moveImage(index, dir) {
            const target = index + dir;
            if (target >= 0 && target < this.images.length) {
              const item = this.images.splice(index, 1)[0];
              this.images.splice(target, 0, item);
              this.updateList();
              this.draw();
            }
          },
          updateList() {
            const list = this.els.list;
            const countBadge = this.els.countBadge;
            if (countBadge) countBadge.innerText = this.images.length;
            if (!list) return;
            list.innerHTML = "";
            if (!this.images.length) {
              if (this.els.emptyMsg) list.appendChild(this.els.emptyMsg);
              return;
            }
            this.images.forEach((item, index) => {
              const div = document.createElement("div");
              div.style.cssText =
                "display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:var(--bg-input); border:1px solid var(--border); font-size:0.8rem;";
              div.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                  <img src="${item.img.src}" style="width:28px; height:28px; object-fit:cover; flex-shrink:0; border:1px solid var(--border);">
                  <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">${String(index + 1).padStart(2, '0')}</span>
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:110px;" title="${item.name}">${item.name}</span>
                </div>
                <div style="display:flex; gap:4px; flex-shrink:0;">
                  <button class="liquid-btn" style="padding:0 6px; height:24px; font-size:0.75rem;" title="Move Up" onclick="Tools.Filmstrip.moveImage(${index}, -1)">&uarr;</button>
                  <button class="liquid-btn" style="padding:0 6px; height:24px; font-size:0.75rem;" title="Move Down" onclick="Tools.Filmstrip.moveImage(${index}, 1)">&darr;</button>
                  <button class="liquid-btn danger-btn" style="padding:0 6px; height:24px; font-size:0.75rem;" title="Remove" onclick="Tools.Filmstrip.removeImage(${index})">&times;</button>
                </div>
              `;
              list.appendChild(div);
            });
          },
          draw() {
            if (!this.els.rows) return;
            const s = {
              rows: parseInt(this.els.rows.value, 10) || 3,
              framesPerRow: parseInt(this.els.framesPerRow.value, 10) || 0,
              fitMode: (this.els.fitMode && this.els.fitMode.value) || "cover",
              frameGap: this.els.gap && !isNaN(parseInt(this.els.gap.value, 10)) ? parseInt(this.els.gap.value, 10) : 9,
              rowGap: this.els.rowGap && !isNaN(parseInt(this.els.rowGap.value, 10)) ? parseInt(this.els.rowGap.value, 10) : 19,
              filmColor: (this.els.filmColor && this.els.filmColor.value) || "#CBCBCB",
              bgColor: (this.els.bgColor && this.els.bgColor.value) || "#FFFFFF",
              showNumbers: this.els.numbers ? this.els.numbers.checked : false,
              width: 1920,
            };

            const canvas = Core.AdaptiveRenderer.renderFilmstrip(this.images, s);
            if (!canvas) return;

            this.canvas = canvas;
            if (this.els.container) {
              this.els.container.innerHTML = "";
              canvas.style.maxWidth = "100%";
              canvas.style.height = "auto";
              canvas.style.boxShadow = "0 8px 30px rgba(0,0,0,0.25)";
              canvas.style.border = "1px solid var(--border)";
              canvas.onclick = () => UI.openLightbox(canvas.toDataURL("image/jpeg", 0.95));
              this.els.container.appendChild(canvas);
            }

            if (this.els.dlJpgBtn) this.els.dlJpgBtn.disabled = false;
            if (this.els.dlPngBtn) this.els.dlPngBtn.disabled = false;
          },
          download(format = "jpeg") {
            if (!this.canvas) return;
            const ext = format === "png" ? "png" : "jpg";
            const mime = format === "png" ? "image/png" : "image/jpeg";
            const title = (this.els.title && this.els.title.value.trim()) || "Filmstrip";
            const a = document.createElement("a");
            a.href = this.canvas.toDataURL(mime, 0.95);
            a.download = `${title}.${ext}`;
            a.click();
          },
          destroy() {
            this.images = [];
            this.updateList();
            this.draw();
          },
        },

};
