/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
        FitToPlatform: {
          BASE_WIDTH: 1033,
          BASE_HEIGHT: 195,
          CIRCLES: [
            { imageX: 90, y: 91, textX: 272, textY: 91 },
            { imageX: 548, y: 96, textX: 630, textY: 96 },
            { imageX: 883, y: 103, textX: 942, textY: 103 },
          ],
          image: null,
          sourceUrl: null,
          sourceKind: null,
          initialized: false,
          canvas: null,
          els: {},
          init() {
            if (this.initialized) return;
            this.els = {
              input: document.getElementById("fitUploadInput"),
              useBoard: document.getElementById("fitUseBoardBtn"),
              source: document.getElementById("fitSourceStatus"),
              clear: document.getElementById("fitClearSourceBtn"),
              statement: document.getElementById("fitStatement"),
              imageFit: document.getElementById("fitImageFit"),
              imageSize: document.getElementById("fitImageSize"),
              fontSize: document.getElementById("fitFontSize"),
              resolution: document.getElementById("fitResolution"),
              imageSizeValue: document.getElementById("fitImageSizeValue"),
              fontSizeValue: document.getElementById("fitFontSizeValue"),
              dimensions: document.getElementById("fitDimensions"),
              status: document.getElementById("fitRenderStatus"),
              png: document.getElementById("fitExportPngBtn"),
              jpg: document.getElementById("fitExportJpgBtn"),
              reset: document.getElementById("fitResetBtn"),
              surface: document.getElementById("fitCanvasSurface"),
            };
            this.canvas = document.getElementById("fitCanvas");
            this.els.input.addEventListener("change", (e) => {
              this.handleFile(e.target.files && e.target.files[0]);
              e.target.value = "";
            });
            Core.Utils.createDropZone(this.els.surface, (files) => this.handleFile(files[0]));
            this.els.useBoard.addEventListener("click", () => this.useCurrentBoard());
            this.els.clear.addEventListener("click", () => this.clearSource());
            this.els.png.addEventListener("click", () => this.download("png"));
            this.els.jpg.addEventListener("click", () => this.download("jpeg"));
            this.els.reset.addEventListener("click", () => {
              this.els.statement.value = "le uniche cose a cui dovrai rinunciare sono i problemi di stomaco.";
              this.els.imageFit.value = "contain";
              this.els.imageSize.value = "86";
              this.els.fontSize.value = "20";
              this.els.resolution.value = "3";
              this.render();
            });
            [this.els.statement, this.els.imageFit, this.els.imageSize,
              this.els.fontSize, this.els.resolution].forEach((el) => {
              el.addEventListener("input", () => this.render());
              el.addEventListener("change", () => this.render());
            });
            this.initialized = true;
            this.render();
          },
          onActivate() {
            if (!this.initialized) this.init();
            // When the currently selected input is a board, refresh only the
            // read-only canvas snapshot. Uploaded images are never replaced.
            if (this.sourceKind === "board") this.useCurrentBoard(true);
            else if (!this.image && Tools.Story && Tools.Story.active &&
              Tools.Story.active.images.length) this.useCurrentBoard(true);
            else this.render();
          },
          setStatus(message, error = false) {
            this.els.status.textContent = message;
            this.els.status.style.color = error ? "var(--danger)" : "var(--text-muted)";
          },
          clearSource() {
            if (this.sourceUrl) URL.revokeObjectURL(this.sourceUrl);
            this.sourceUrl = null;
            this.sourceKind = null;
            this.image = null;
            this.els.source.textContent = "No storyboard selected. Upload an image or use the current Grid Board.";
            this.render();
          },
          async handleFile(file) {
            if (!file) return;
            if (!file.type.startsWith("image/")) {
              this.setStatus("Please upload an image (PNG, JPG, or WebP).", true);
              return;
            }
            const url = URL.createObjectURL(file);
            const img = new Image();
            try {
              img.src = url;
              if (img.decode) await img.decode();
              else await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
              });
              if (!img.naturalWidth || !img.naturalHeight) throw new Error("Empty image");
              if (this.sourceUrl) URL.revokeObjectURL(this.sourceUrl);
              this.sourceUrl = url;
              this.sourceKind = "upload";
              this.image = img;
              this.els.source.textContent = `Uploaded: ${file.name} (${img.naturalWidth} × ${img.naturalHeight})`;
              this.render();
            } catch (err) {
              URL.revokeObjectURL(url);
              this.setStatus("That image could not be opened. Choose another image.", true);
            }
          },
          useCurrentBoard(silent = false) {
            const story = Tools.Story;
            if (!story || !story.active || !story.active.images.length) {
              if (!silent) this.setStatus("Add images to the Grid Board first, or upload an existing storyboard image.", true);
              return;
            }
            story.draw();
            if (!story.canvas || !story.canvas.width || !story.canvas.height) {
              if (!silent) this.setStatus("The current Grid Board is not ready yet. Try again once the images have loaded.", true);
              return;
            }
            if (this.sourceUrl) URL.revokeObjectURL(this.sourceUrl);
            this.sourceUrl = null;
            this.sourceKind = "board";
            this.image = story.canvas; // Canvas is read-only here; the board stays intact.
            this.els.source.textContent = `Current Board: ${story.active.name} (${story.canvas.width} × ${story.canvas.height})`;
            this.render();
          },
          wrapLines(ctx, statement, width) {
            const words = statement.replace(/\r/g, "").trim().split(/\s+/).filter(Boolean);
            const lines = [];
            let line = "";
            for (const word of words) {
              const test = line ? line + " " + word : word;
              if (ctx.measureText(test).width <= width) {
                line = test;
                continue;
              }
              if (line) { lines.push(line); line = ""; }
              // Split exceptionally long unbroken words to avoid overflow.
              let part = "";
              for (const char of word) {
                const next = part + char;
                if (part && ctx.measureText(next).width > width) {
                  lines.push(part);
                  part = char;
                } else part = next;
              }
              line = part;
            }
            if (line) lines.push(line);
            return lines;
          },
          textLayout(ctx, statement, preferredSize) {
            const circleR = 90;
            const maxWidth = 132;
            let backup = null;
            for (let size = preferredSize; size >= 7.5; size -= 0.5) {
              ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
              const lines = this.wrapLines(ctx, statement, maxWidth);
              const step = size * 1.01;
              const blockHeight = lines.length * step;
              const boundsFit = blockHeight <= 147;
              // Check every line's bounding rectangle against the circle.
              const leftX = -52;
              const top = -(blockHeight / 2);
              const circleFit = lines.every((line, i) => {
                const y = top + (i + 0.5) * step;
                const envelope = Math.min(circleR - 5, Math.abs(y) + size * 0.36);
                const halfChord = Math.sqrt(Math.max(0, (circleR - 4) ** 2 - envelope ** 2));
                return leftX >= -halfChord - 3 &&
                  (leftX + ctx.measureText(line).width) <= halfChord + 3;
              });
              backup = { lines, size, step, blockHeight };
              if (boundsFit && circleFit) return { ...backup, fits: true };
            }
            // Never export a clipped statement. Ask for shorter copy instead.
            return { ...backup, fits: false };
          },
          imageDimensions() {
            if (!this.image) return null;
            const width = this.image.naturalWidth || this.image.width;
            const height = this.image.naturalHeight || this.image.height;
            return width > 0 && height > 0 ? { width, height } : null;
          },
          drawImageCircle(ctx, pair) {
            const { imageX: x, y } = pair;
            const r = 90;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            const dims = this.imageDimensions();
            if (dims) {
              const fit = this.els.imageFit.value;
              const boxSize = 180 * (Number(this.els.imageSize.value) / 100);
              let drawW, drawH;
              if (fit === "cover") {
                const factor = boxSize / Math.min(dims.width, dims.height);
                drawW = dims.width * factor;
                drawH = dims.height * factor;
              } else {
                const factor = boxSize / Math.max(dims.width, dims.height);
                drawW = dims.width * factor;
                drawH = dims.height * factor;
              }
              ctx.save();
              ctx.beginPath(); ctx.arc(x, y, r - 2, 0, Math.PI * 2); ctx.clip();
              if (fit === "cover") {
                ctx.beginPath(); ctx.rect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize); ctx.clip();
              }
              ctx.drawImage(this.image, x - drawW / 2, y - drawH / 2, drawW, drawH);
              ctx.restore();
            } else {
              ctx.fillStyle = "#d4d4d4";
              ctx.font = "700 12px Arial, sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("STORYBOARD", x, y + 4);
            }
            ctx.strokeStyle = "#cccccc";
            ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
          },
          drawTextCircle(ctx, pair, layout) {
            const x = pair.textX;
            const y = pair.textY;
            const r = 90;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
            ctx.strokeStyle = "#006cde";
            ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke();
            if (!layout || !layout.lines.length) return;
            ctx.save();
            ctx.beginPath(); ctx.arc(x, y, r - 3, 0, Math.PI * 2); ctx.clip();
            ctx.font = `700 ${layout.size}px Arial, Helvetica, sans-serif`;
            ctx.fillStyle = "#111111";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            const start = y - layout.blockHeight / 2;
            layout.lines.forEach((line, i) => {
              ctx.fillText(line, x - 52, start + (i + 0.5) * layout.step);
            });
            ctx.restore();
          },
          render() {
            if (!this.initialized) return;
            const scale = Math.max(1, Math.min(3, Number(this.els.resolution.value) || 3));
            const width = this.BASE_WIDTH * scale;
            const height = this.BASE_HEIGHT * scale;
            if (this.canvas.width !== width) this.canvas.width = width;
            if (this.canvas.height !== height) this.canvas.height = height;
            const ctx = this.canvas.getContext("2d");
            if (!ctx) return;
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            ctx.clearRect(0, 0, this.BASE_WIDTH, this.BASE_HEIGHT);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, this.BASE_WIDTH, this.BASE_HEIGHT);
            const statement = this.els.statement.value.trim();
            const layout = statement ? this.textLayout(ctx, statement, Number(this.els.fontSize.value)) : null;
            this.CIRCLES.forEach((pair) => this.drawImageCircle(ctx, pair));
            this.CIRCLES.forEach((pair) => this.drawTextCircle(ctx, pair, layout));
            this.els.imageSizeValue.textContent = this.els.imageSize.value + "%";
            this.els.fontSizeValue.textContent = this.els.fontSize.value + " px";
            this.els.dimensions.textContent = `${width} × ${height}`;
            const ready = !!this.imageDimensions() && !!statement && !!layout && layout.fits;
            this.els.png.disabled = this.els.jpg.disabled = !ready;
            if (!this.imageDimensions()) this.setStatus("Upload a storyboard image or use the current Grid Board to enable export.");
            else if (!statement) this.setStatus("Enter a statement to enable export.");
            else if (layout && !layout.fits) this.setStatus("The statement cannot fit inside the circles. Shorten it to export without clipping.", true);
            else if (layout && layout.size < 12) this.setStatus(`Preview ready (${width} × ${height}). Long statement: auto-fitted to ${layout.size}px; shorten it for better readability.`);
            else this.setStatus(`Ready to export (${width} × ${height}) · statement repeated 3 times · image source ${this.sourceKind === "board" ? "Grid Board" : "upload"}.`);
          },
          download(format) {
            if (!this.imageDimensions() || !this.els.statement.value.trim()) return;
            this.render();
            if (this.els.png.disabled) return;
            const mime = format === "png" ? "image/png" : "image/jpeg";
            this.canvas.toBlob((blob) => {
              if (!blob) { this.setStatus("Export failed. Try lowering the output resolution.", true); return; }
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `fit_to_platform_${this.BASE_WIDTH * Number(this.els.resolution.value)}x${this.BASE_HEIGHT * Number(this.els.resolution.value)}.${format === "png" ? "png" : "jpg"}`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 15000);
            }, mime, 0.95);
          },
        },

};
