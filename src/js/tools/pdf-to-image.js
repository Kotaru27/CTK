/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
        Pdf: {
          collection: {},
          currentId: null,
          abortCtrl: null,
          els: {
            dropZone: document.getElementById("pdfDropZone"),
            input: document.getElementById("pdfInput"),
            stacks: document.getElementById("pdfStacksContainer"),
            empty: document.getElementById("pdfEmptyState"),
            format: document.getElementById("pdfFormat"),
            clearBtn: document.getElementById("clearPdfBtn"),
            cancelBtn: document.getElementById("cancelPdfBtn"),
            progress: document.getElementById("pdfProgress"),
            status: document.getElementById("pdfStatusText"),
            percent: document.getElementById("pdfStatusPercent"),
            bar: document.getElementById("pdfProgressBar"),
            overlay: document.getElementById("pdfDetailOverlay"),
            title: document.getElementById("pdfOverlayTitle"),
            count: document.getElementById("pdfOverlayCount"),
            grid: document.getElementById("pdfOverlayGrid"),
            selectAll: document.getElementById("pdfSelectAll"),
            dlSelected: document.getElementById("pdfDownloadSelected"),
          },
          init() {
            Core.Utils.createDropZone(this.els.dropZone, (f) =>
              this.handleFiles(f),
            );
            this.els.input.onchange = (e) => {
              this.handleFiles([...e.target.files]);
              this.els.input.value = "";
            };
            this.els.clearBtn.onclick = () => {
              const savedFiles = this._sourceFiles || [];
              UI.confirm({
                title: "Clear all PDFs?",
                message: "This removes every loaded PDF and its converted pages. You can undo this action.",
                okLabel: "Clear",
                cancelLabel: "Cancel",
              }).then((ok) => {
                if (!ok) return;
                const items = Array.from(this.els.stacks.children).filter(
                  (el) => !el.id.includes("Empty"),
                );
                window.applyThanosSnap(items).then(() => {
                  this.destroy();
                  if (savedFiles.length > 0) {
                    UI.undoToast("PDFs cleared", () => {
                      this._sourceFiles = savedFiles;
                      this.handleFiles(savedFiles);
                    });
                  }
                });
              });
            };
            this.els.cancelBtn.onclick = () => {
              if (this.abortCtrl) this.abortCtrl.abort();
            };
            this.els.selectAll.onchange = (e) =>
              this.toggleAll(e.target.checked);
            this.els.dlSelected.onclick = () => this.downloadSelected();
            document.addEventListener("keydown", (e) => {
              if (
                !this.currentId ||
                !this.els.overlay.classList.contains("active")
              )
                return;
              if (e.ctrlKey && e.key === "a") {
                e.preventDefault();
                this.els.selectAll.click();
              }
              if (e.ctrlKey && e.key === "s") {
                e.preventDefault();
                this.downloadSelected();
              }
            });
          },
          destroy() {
            this.collection = {};
            this.els.stacks.innerHTML = "";
            this.els.stacks.appendChild(this.els.empty);
            UI.toggleEmptyState(this.els.stacks, true);
            Core.BlobRegistry.revokeAll();
          },
          async handleFiles(files) {
            const pdfFiles = files.filter((f) => f.type === "application/pdf");
            this._sourceFiles = pdfFiles.slice();
            if (pdfFiles.length === 0)
              return UI.showError("Please upload valid PDF files.");
            UI.toggleEmptyState(this.els.stacks, false);
            this.els.progress.classList.add("active");
            this.els.cancelBtn.style.display = "inline-flex";
            this.abortCtrl = new AbortController();
            const signal = this.abortCtrl.signal;
            try {
              for (const file of pdfFiles) {
                if (signal.aborted) break;
                await this.processSinglePdf(
                  file,
                  this.els.format.value,
                  signal,
                );
              }
            } catch (e) {
              if (e.name !== "AbortError") UI.showError(e.message);
            } finally {
              this.els.progress.classList.remove("active");
              this.els.cancelBtn.style.display = "none";
              this.abortCtrl = null;
            }
          },
          async processSinglePdf(file, format, signal) {
            const pdfId = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.els.status.innerText = `Loading ${file.name}...`;
            this.els.bar.style.width = "0%";
            try {
              const arrayBuffer = await file.arrayBuffer();
              const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
              const stack = document.createElement("div");
              stack.className = "pdf-stack-wrapper";
              stack.innerHTML = `<div class="processing-pulse" style="width:100%; height:200px; background:var(--bg-input); display:flex; align-items:center; justify-content:center; color:var(--text-muted);">Processing...</div><div class="stack-meta"><div class="stack-title">${file.name}</div><div class="stack-count">0/${pdf.numPages}</div></div>`;
              stack.onclick = () => this.openDetail(pdfId);
              this.els.stacks.prepend(stack);
              this.collection[pdfId] = {
                name: file.name,
                total: pdf.numPages,
                pages: [],
                format: format,
              };
              for (let i = 1; i <= pdf.numPages; i++) {
                if (signal.aborted)
                  throw new DOMException("Aborted", "AbortError");
                await new Promise((resolve) => setTimeout(resolve, 0));
                this.els.status.innerText = `Rendering ${file.name} (Page ${i}/${pdf.numPages})`;
                const pct = Math.round((i / pdf.numPages) * 100) + "%";
                this.els.percent.innerText = pct;
                this.els.bar.style.width = pct;
                stack.querySelector(".stack-count").innerText =
                  `${i}/${pdf.numPages}`;
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({
                  canvasContext: canvas.getContext("2d"),
                  viewport,
                }).promise;
                if (i === 1) {
                  stack.querySelector("div").replaceWith(
                    Object.assign(new Image(), {
                      src: canvas.toDataURL(format, 0.5),
                    }),
                  );
                }
                const blob = await new Promise((r) =>
                  canvas.toBlob(r, format, 0.9),
                );
                const url = Core.BlobRegistry.create(blob);
                this.collection[pdfId].pages.push({
                  num: i,
                  blob,
                  url,
                  checked: true,
                });
              }
              stack.querySelector(".stack-count").innerText =
                `${pdf.numPages} Pages`;
            } catch (err) {
              if (err.name !== "AbortError") {
                console.error(err);
                UI.showError(`Failed to process ${file.name}: ${err.message}`);
              }
            }
          },
          closeDetail() {
            this.els.overlay.classList.remove("active");
            this.currentId = null;
          },
          toggleAll(val) {
            if (!this.currentId) return;
            this.collection[this.currentId].pages.forEach(
              (p) => (p.checked = val),
            );
            this.els.grid
              .querySelectorAll(".detail-check")
              .forEach((c) => (c.checked = val));
          },
          downloadSingle(url, name) {
            const a = document.createElement("a");
            a.href = url;
            a.download = name;
            a.click();
          },
          async downloadSelected() {
            if (!this.currentId) return;
            const data = this.collection[this.currentId];
            const selected = data.pages.filter((p) => p.checked);
            if (selected.length === 0)
              return UI.showError("No pages selected.");
            this.els.dlSelected.innerText = "Zipping...";
            const zip = new JSZip();
            const ext = data.format.split("/")[1] === "jpeg" ? "jpg" : "png";
            selected.forEach((p) => zip.file(`${p.num}.${ext}`, p.blob));
            const content = await zip.generateAsync({ type: "blob" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(content);
            a.download = `${data.name}_images.zip`;
            a.click();
            this.els.dlSelected.innerText = "Download Selected (Ctrl+S)";
          },
        },

};
