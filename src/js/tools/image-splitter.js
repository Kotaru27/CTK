/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
        Split: {
          items: [],
          els: {
            drop: document.getElementById("splitDropZone"),
            input: document.getElementById("splitInput"),
            grid: document.getElementById("splitGrid"),
            splitBtn: document.getElementById("triggerSplitBtn"),
            dlBtn: document.getElementById("downloadSplitBtn"),
            clearBtn: document.getElementById("clearSplitBtn"),
            cols: document.getElementById("splitCols"),
          },
          init() {
            Core.Utils.createDropZone(this.els.drop, (f) =>
              this.handleFiles(f),
            );
            this.els.input.onchange = (e) => {
              this.handleFiles([...e.target.files]);
              this.els.input.value = "";
            };
            this.els.cols.oninput = () => {
              this.updateGridLines();
              // Removed auto process
            };
            this.els.splitBtn.onclick = () => this.process();
            this.els.dlBtn.onclick = () => this.download();
            this.els.clearBtn.onclick = () => {
              const savedFiles = this.items.map((i) => i.file).filter(Boolean);
              UI.confirm({
                title: "Reset splitter?",
                message: "This removes the loaded image and resets split settings. You can undo this action.",
                okLabel: "Reset",
                cancelLabel: "Cancel",
              }).then((ok) => {
                if (!ok) return;
                const items = Array.from(this.els.grid.children).filter(
                  (el) => !el.id.includes("Empty"),
                );
                window.applyThanosSnap(items).then(() => {
                  this.destroy();
                  if (savedFiles.length > 0) {
                    UI.undoToast("Splitter reset", () => {
                      this.handleFiles(savedFiles);
                    });
                  }
                });
              });
            };
          },
          destroy() {
            this.items.forEach((i) => Core.BlobRegistry.release(i.url));
            this.items = [];
            this.render();
          },
          handleFiles(files) {
            const valid = files.filter((f) => f.type.startsWith("image/"));
            if (!valid.length) return;
            valid.forEach((file) =>
              this.items.push({
                file,
                img: null,
                url: Core.BlobRegistry.create(file, "splitter"),
                checked: true,
                splitBlobs: [],
              }),
            );
            this.render();
          },
          updateGridLines() {
            const cols = parseInt(this.els.cols.value) || 1;
            const rows = 1;
            document
              .querySelectorAll(".split-preview-overlay")
              .forEach((el) => {
                el.style.setProperty("--rows", rows);
                el.style.setProperty("--cols", cols);
                el.innerHTML = "";
                for (let i = 0; i < rows * cols; i++) {
                  el.appendChild(document.createElement("div")).className =
                    "split-cell";
                }
              });
          },
          render() {
            this.els.grid.innerHTML = "";
            if (this.items.length === 0) {
              this.els.grid.innerHTML =
                '<div class="empty-state-msg" id="splitEmpty"><span class="material-symbols-rounded" style="color: var(--text-muted);  font-size: 50px;">content_cut</span><p>No images</p></div>';
              this.els.dlBtn.disabled = true;
              this.els.splitBtn.disabled = true;
              /* lucide.createIcons */
              return;
            }
            this.els.splitBtn.disabled = false;
            this.els.dlBtn.disabled = !this.items.some(i => i.splitBlobs && i.splitBlobs.length > 0);
            this.items.forEach((item) => {
              const card = document.createElement("div");
              card.className = "logo-card-item";
              card.innerHTML = `<div class="preview-box"><img src="${item.url}"><div class="split-preview-overlay"></div></div><div class="card-controls" style="padding: 12px; display: flex; align-items: center; gap: 10px; justify-content: space-between;"><div style="font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; flex: 1;">${item.file.name}</div><div style="display: flex; align-items: center; gap: 15px;"><div class="split-status" style="font-size:0.75rem; color:var(--text-muted); font-weight: 500;">${item.splitBlobs.length > 0 ? "Done" : "Ready"}</div><label style="display:flex; gap:8px; align-items:center; font-size:0.75rem; font-weight: bold; cursor: pointer;"><input type="checkbox" class="split-check toggle-switch small" ${item.checked ? "checked" : ""}> Split</label></div></div>`;
              this.els.grid.appendChild(card);
              item.card = card;
              card.querySelector(".split-check").onchange = (e) => {
                item.checked = e.target.checked;
                // Removed automatic process
              };
            });
            this.updateGridLines();
          },
          async process() {
            const cols = parseInt(this.els.cols.value) || 1;
            this.els.splitBtn.innerText = "Splitting...";
            this.els.splitBtn.disabled = true;
            const rows = 1;
            for (const item of this.items) {
              if (!item.checked) continue;
              if (!item.img) {
                item.img = new Image();
                item.img.src = item.url;
                await new Promise((r) => (item.img.onload = r));
              }
              item.splitBlobs = [];
              const pW = item.img.naturalWidth / cols;
              const pH = item.img.naturalHeight / rows;
              for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                  const cvs = document.createElement("canvas");
                  cvs.width = pW;
                  cvs.height = pH;
                  cvs
                    .getContext("2d")
                    .drawImage(item.img, c * pW, r * pH, pW, pH, 0, 0, pW, pH);
                  item.splitBlobs.push({
                    blob: await new Promise((res) =>
                      cvs.toBlob(res, item.file.type),
                    ),
                  });
                }
              }
              item.card.querySelector(".split-status").innerText =
                `Done (${cols})`;
            }
            this.els.splitBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size: 14px;">content_cut</span> Split Images';
            this.els.splitBtn.disabled = false;
            /* lucide.createIcons */
            this.els.dlBtn.disabled = !this.items.some(i => i.splitBlobs && i.splitBlobs.length > 0);
          },
          async download() {
            this.els.dlBtn.innerText = "Zipping...";
            const zip = new JSZip();
            let count = 1;
            this.items.forEach((item) => {
              const ext = item.file.name.split(".").pop();
              if (item.checked && item.splitBlobs.length > 0)
                item.splitBlobs.forEach((b) => {
                  zip.file(`${count}.${ext}`, b.blob);
                  count++;
                });
              else {
                zip.file(`${count}.${ext}`, item.file);
                count++;
              }
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(
              await zip.generateAsync({ type: "blob" }),
            );
            a.download = "split_images.zip";
            a.click();
            this.els.dlBtn.innerText = "Download Zip";
          },
        },

};
