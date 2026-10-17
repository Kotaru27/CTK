
      const GuideEngine = {
        active: false,
        tooltip: null,
        targetEl: null,
        banner: null,
        init() {
          const tooltip = document.createElement("div");
          tooltip.className = "guide-tooltip";
          tooltip.id = "guideTooltipReal";
          tooltip.style.cssText =
            "position:fixed; background:var(--bg-panel); color:var(--text-main); border:1px solid var(--border); padding:12px 18px; border-radius:0; font-size:0.9rem; z-index:10000; pointer-events:none; opacity:0; transition:opacity 0.2s, transform 0.2s; transform:translateY(10px); box-shadow: none; max-width:280px; line-height:1.4;";
          document.body.appendChild(tooltip);
          this.tooltip = tooltip;

          const banner = document.createElement("div");
          banner.id = "guideBanner";
          banner.style.cssText =
            "position:fixed; top:0; left:0; width:100%; height:40px; background:var(--bg-panel); color:var(--text-main); border-bottom:1px solid var(--border); z-index:9999; display:none; align-items:center; justify-content:center; gap:20px; box-shadow: none; font-size:0.85rem; font-weight:500;";
          banner.innerHTML = `
                    <span style="color:var(--accent); display:flex; align-items:center; gap:8px;">
                        <span class="material-symbols-rounded" style="font-size: 16px;">help</span> Interactive Guide Mode
                    </span>
                    <span style="color:var(--text-muted); font-weight:normal;">Hover over any highlighted element below to read instructions.</span>
                    <button class="liquid-btn active-mode" style="height:26px; border-radius:0; font-size:0.75rem; padding:0 12px; margin-left:20px;" onclick="GuideEngine.close()">Exit Guide</button>
                `;
          document.body.appendChild(banner);
          this.banner = banner;

          const injectLucide = () => {
            if (window.lucide) {
              /* window.lucide.createIcons */
            } else {
              setTimeout(injectLucide, 100);
            }
          };
          injectLucide();

          document.addEventListener("mousemove", (e) => {
            if (!this.active) return;

            this.tooltip.style.left = e.clientX + 15 + "px";
            const tooltipRect = this.tooltip.getBoundingClientRect();
            const topPos = e.clientY + 15;
            if (topPos + tooltipRect.height > window.innerHeight) {
              this.tooltip.style.top =
                e.clientY - tooltipRect.height - 15 + "px";
            } else {
              this.tooltip.style.top = topPos + "px";
            }

            if (e.clientY < 40) {
              if (this.targetEl) {
                this.targetEl.classList.remove("guide-highlight");
                this.targetEl = null;
              }
              this.tooltip.style.opacity = "0";
              this.tooltip.style.transform = "translateY(10px)";
              return;
            }

            const el = document.elementFromPoint(e.clientX, e.clientY);
            const guideEl = el ? el.closest("[data-guide]") : null;
            if (guideEl !== this.targetEl) {
              if (this.targetEl)
                this.targetEl.classList.remove("guide-highlight");
              this.targetEl = guideEl;
              if (this.targetEl) {
                this.targetEl.classList.add("guide-highlight");
                this.tooltip.textContent =
                  this.targetEl.getAttribute("data-guide");
                this.tooltip.style.opacity = "1";
                this.tooltip.style.transform = "translateY(0)";
              } else {
                this.tooltip.style.opacity = "0";
                this.tooltip.style.transform = "translateY(10px)";
              }
            }
          });

          const blockEvent = (e) => {
            if (this.active) {
              if (e.target.closest("#guideBanner")) return;
              if (e.target.closest(".guide-modal-overlay")) return;

              if (e.type === "keydown" && e.key === "Escape") {
                this.close();
                e.preventDefault();
                e.stopPropagation();
                return;
              }

              const isInteractive = e.target.closest(
                "button, input, textarea, select, label, canvas, [onclick]",
              );

              if (
                e.type === "click" ||
                e.type === "keydown" ||
                e.type === "keypress" ||
                ((e.type === "mousedown" ||
                  e.type === "pointerdown" ||
                  e.type === "touchstart") &&
                  isInteractive)
              ) {
                e.preventDefault();
                e.stopPropagation();
              }
            }
          };
          [
            "click",
            "mousedown",
            "pointerdown",
            "touchstart",
            "keydown",
            "keypress",
          ].forEach((evt) => {
            document.addEventListener(evt, blockEvent, true);
          });
        },
        open(triggerBtn) {
          if (!this.tooltip) this.init();
          this.active = true;
          this.banner.style.display = "flex";

          const section = triggerBtn.closest(".tool-section");
          if (section) {
            const guided = section.querySelectorAll("[data-guide]");
            guided.forEach((el) => el.classList.add("guide-available"));
          }
        },
        openOverlayGuide(overlayEl) {
          if (!this.tooltip) this.init();
          this.active = true;
          this.banner.style.display = "flex";

          if (overlayEl) {
            const guided = overlayEl.querySelectorAll("[data-guide]");
            guided.forEach((el) => el.classList.add("guide-available"));
          }
        },
        close() {
          this.active = false;
          this.banner.style.display = "none";
          if (this.targetEl) {
            this.targetEl.classList.remove("guide-highlight");
            this.targetEl = null;
          }
          this.tooltip.style.opacity = "0";
          this.tooltip.style.transform = "translateY(10px)";

          document.querySelectorAll(".guide-available").forEach((el) => {
            el.classList.remove("guide-available");
          });
        },
      };

      const Core = {
        AdaptiveRenderer: {
          getResampledImage(source, targetW, targetH, fitMode) {
            const srcW =
              source.naturalWidth || source.videoWidth || source.width;
            const srcH =
              source.naturalHeight || source.videoHeight || source.height;
            let dx = 0,
              dy = 0,
              dw = targetW,
              dh = targetH;
            let sx = 0,
              sy = 0,
              sw = srcW,
              sh = srcH;
            const iR = srcW / srcH,
              cR = targetW / targetH;
            if (fitMode === "contain") {
              if (iR > cR) {
                dw = targetW;
                dh = dw / iR;
                dy = (targetH - dh) / 2;
              } else {
                dh = targetH;
                dw = dh * iR;
                dx = (targetW - dw) / 2;
              }
            } else {
              if (iR > cR) {
                sh = srcH;
                sw = sh * cR;
                sx = (srcW - sw) / 2;
              } else {
                sw = srcW;
                sh = sw / cR;
                sy = (srcH - sh) / 2;
              }
            }
            const c = document.createElement("canvas");
            c.width = targetW;
            c.height = targetH;
            const ctx = c.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            if (sw > dw * 2 || sh > dh * 2) {
              let curW = sw,
                curH = sh;
              let curC = document.createElement("canvas");
              curC.width = curW;
              curC.height = curH;
              let curCtx = curC.getContext("2d");
              curCtx.imageSmoothingEnabled = true;
              curCtx.imageSmoothingQuality = "high";
              curCtx.drawImage(source, sx, sy, sw, sh, 0, 0, curW, curH);
              while (curW > dw * 2 && curH > dh * 2) {
                const nextW = Math.floor(curW / 2),
                  nextH = Math.floor(curH / 2);
                const nextC = document.createElement("canvas");
                nextC.width = nextW;
                nextC.height = nextH;
                const nextCtx = nextC.getContext("2d");
                nextCtx.imageSmoothingEnabled = true;
                nextCtx.imageSmoothingQuality = "high";
                nextCtx.drawImage(curC, 0, 0, nextW, nextH);
                curC = nextC;
                curW = nextW;
                curH = nextH;
              }
              ctx.drawImage(curC, 0, 0, curW, curH, dx, dy, dw, dh);
            } else {
              ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
            }
            return c;
          },
          renderBoard(images, options) {
            const count = images.length;
            if (count === 0) return null;
            let cols = options.cols || 0,
              rows = options.rows || 0;
            if (cols <= 0) {
              if (count === 4) {
                cols = 2;
                rows = 2;
              } else if (count === 9) {
                cols = 3;
                rows = 3;
              } else if (count === 16) {
                cols = 4;
                rows = 4;
              } else {
                cols = Math.ceil(Math.sqrt(count));
                rows = Math.ceil(count / cols);
              }
            } else if (rows <= 0) {
              rows = Math.ceil(count / cols);
            }
            
            let maxSrcW = 0,
              maxSrcH = 0,
              aspectRatios = [];
              
            let orientation = "square";
            images.forEach((item) => {
              const source = item.img || item;
              const w =
                source.naturalWidth || source.videoWidth || source.width;
              const h =
                source.naturalHeight || source.videoHeight || source.height;
              if (w > maxSrcW) maxSrcW = w;
              if (h > maxSrcH) maxSrcH = h;
              if (h > 0) aspectRatios.push(w / h);
            });
            aspectRatios.sort((a, b) => a - b);
            const medianAspect =
              aspectRatios[Math.floor(aspectRatios.length / 2)] || 1;
              
            if (medianAspect > 1.1) orientation = "landscape";
            else if (medianAspect < 0.9) orientation = "portrait";
            
            const gap = options.gap || 0;
            const outerMargin = 0;
            
            // 1. Create an Adaptive Resolution Planner.
            const planner = {
              exportWidth: 0,
              exportHeight: 0,
              tileWidth: 0,
              tileHeight: 0
            };
            
            if (options.autoWidth) {
              // Viewport-constrained layout model (Document Layout Engine)
              const maxLongEdge = 1800; // Configurable maximum long edge
              const minReadableTileW = 280; // Absolute minimum width for text readability
              
              // Calculate tile dimensions assuming we fit the entire storyboard inside maxLongEdge
              let tileW_widthConstrained = cols > 0 ? (maxLongEdge - outerMargin * 2 - gap * (cols - 1)) / cols : maxLongEdge;
              let tileW_heightConstrained = rows > 0 ? (maxLongEdge - outerMargin * 2 - gap * (rows - 1)) / (rows / medianAspect) : maxLongEdge;
              
              // Scale the entire storyboard to fit inside this bounding box while preserving aspect ratio
              let tileW = Math.min(tileW_widthConstrained, tileW_heightConstrained);
              
              // When multiple resolutions satisfy readability, always choose the smallest one.
              // This prevents unnecessarily upscaling low-resolution source images to fill the max viewport.
              if (maxSrcW > 0 && maxSrcW < tileW) {
                tileW = maxSrcW;
              }
              
              // Only exceed the maximum long edge if the planner can prove that readability would otherwise fail.
              if (tileW < minReadableTileW) {
                console.warn(`Adaptive Planner: Layout density too high. Bypassing max viewport to maintain minimum readability of ${minReadableTileW}px.`);
                tileW = minReadableTileW;
              }
              
              planner.tileWidth = tileW;
              planner.tileHeight = planner.tileWidth / medianAspect;
              
              planner.exportWidth = planner.tileWidth * cols + gap * (cols - 1) + outerMargin * 2;
              planner.exportHeight = planner.tileHeight * rows + gap * (rows - 1) + outerMargin * 2;
            } else {
              planner.exportWidth = options.targetWidth || 1920;
              planner.tileWidth = (planner.exportWidth - outerMargin * 2 - gap * (cols - 1)) / cols;
              planner.tileHeight = planner.tileWidth / medianAspect;
              planner.exportHeight = planner.tileHeight * rows + gap * (rows - 1) + outerMargin * 2;
            }
            
            const MAX_DIM = 8192;
            if (planner.exportWidth > MAX_DIM || planner.exportHeight > MAX_DIM) {
              const scale = Math.min(MAX_DIM / planner.exportWidth, MAX_DIM / planner.exportHeight);
              planner.exportWidth *= scale;
              planner.exportHeight *= scale;
              planner.tileWidth *= scale;
              planner.tileHeight *= scale;
            }
            
            planner.exportWidth = Math.round(planner.exportWidth);
            planner.exportHeight = Math.round(planner.exportHeight);
            planner.tileWidth = Math.round(planner.tileWidth);
            planner.tileHeight = Math.round(planner.tileHeight);
            
            console.log(
              `Adaptive Planner\nRows: ${rows}\nColumns: ${cols}\nImages: ${count}\nMedian Resolution: ${Math.round(maxSrcW)}x${Math.round(maxSrcH)}\nTile Size: ${planner.tileWidth}x${planner.tileHeight}\nExport Width: ${planner.exportWidth}\nExport Height: ${planner.exportHeight}\nFinal JPEG Size: ${planner.exportWidth}x${planner.exportHeight}`
            );
            
            const compCanvas = document.createElement("canvas");
            compCanvas.width = planner.exportWidth;
            compCanvas.height = planner.exportHeight;
            const ctx = compCanvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.fillStyle = options.bgColor || "#ffffff";
            ctx.fillRect(0, 0, planner.exportWidth, planner.exportHeight);
            
            for (let r = 0; r < rows; r++) {
              const rem = count - r * cols;
              const countInRow = Math.min(cols, rem);
              if (countInRow <= 0) break;
              const shiftX = ((cols - countInRow) * (planner.tileWidth + gap)) / 2;
              for (let c = 0; c < countInRow; c++) {
                const item = images[r * cols + c];
                const source = item.img || item;
                const x = Math.round(
                  outerMargin + c * (planner.tileWidth + gap) + shiftX,
                );
                const y = Math.round(outerMargin + r * (planner.tileHeight + gap));
                const tileCanvas = this.getResampledImage(
                  source,
                  planner.tileWidth,
                  planner.tileHeight,
                  options.fitMode || "cover",
                );
                ctx.drawImage(tileCanvas, x, y);
              }
            }
            return compCanvas;
          },
          renderFilmstrip(images, options = {}) {
            const width = options.width || 1920;
            const numRows = options.rows ? Math.max(1, parseInt(options.rows, 10)) : 3;
            const height = options.height || Math.round(width * (numRows === 1 ? 0.35 : numRows === 2 ? 0.55 : 0.74));

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            const bgColor = options.bgColor || "#FFFFFF";
            const filmColor = options.filmColor || "#CBCBCB";
            const holeColor = bgColor;

            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);

            const marginV = Math.round(height * 0.025);
            const marginH = Math.round(width * 0.02);
            const gapBetweenStrips = options.rowGap !== undefined && !isNaN(parseInt(options.rowGap, 10))
              ? Math.max(0, parseInt(options.rowGap, 10))
              : 19;
            const availableH = height - (2 * marginV) - ((numRows - 1) * gapBetweenStrips);
            const stripH = Math.floor(availableH / numRows);
            const stripW = width - (2 * marginH);

            const rowImages = [];
            const totalImgs = images ? images.length : 0;
            const fpr = options.framesPerRow ? parseInt(options.framesPerRow, 10) : 0;
            if (fpr > 0) {
              for (let r = 0; r < numRows; r++) {
                rowImages.push(images ? images.slice(r * fpr, (r + 1) * fpr) : []);
              }
            } else {
              const baseCount = Math.floor(totalImgs / numRows);
              const remainder = totalImgs % numRows;
              let currIdx = 0;
              for (let r = 0; r < numRows; r++) {
                const take = baseCount + (r < remainder ? 1 : 0);
                rowImages.push(images ? images.slice(currIdx, currIdx + take) : []);
                currIdx += take;
              }
            }

            const drawRoundRect = (x, y, w, h, r) => {
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(x, y, w, h, r);
              } else {
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                ctx.lineTo(x + w, y + h - r);
                ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                ctx.lineTo(x + r, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
              }
              ctx.fill();
            };

            for (let r = 0; r < numRows; r++) {
              const stripY = marginV + r * (stripH + gapBetweenStrips);
              const stripX = marginH;

              const trackH = Math.max(16, Math.round(stripH * 0.082));
              const frameAreaH = stripH - (2 * trackH);
              const frameAreaY = stripY + trackH;
              const notchIndent = Math.round(stripW * 0.016);

              ctx.fillStyle = filmColor;
              ctx.fillRect(stripX, stripY, stripW, trackH);
              ctx.fillRect(stripX, stripY + stripH - trackH, stripW, trackH);
              ctx.fillRect(stripX + notchIndent, frameAreaY, stripW - (2 * notchIndent), frameAreaH);

              const holeW = Math.max(8, Math.round(trackH * 0.44));
              const holeH = Math.max(12, Math.round(trackH * 0.64));
              const holeR = Math.max(2, Math.round(holeW * 0.3));
              const holePitch = Math.round(holeW * 1.95);
              const topHoleY = stripY + (trackH - holeH) / 2;
              const botHoleY = stripY + stripH - trackH + (trackH - holeH) / 2;

              ctx.fillStyle = holeColor;
              const startX = stripX + Math.round(holePitch * 0.75);
              const endX = stripX + stripW - Math.round(holePitch * 0.75);

              for (let hx = startX; hx + holeW <= endX; hx += holePitch) {
                drawRoundRect(hx, topHoleY, holeW, holeH, holeR);
                drawRoundRect(hx, botHoleY, holeW, holeH, holeR);
              }

              const stills = rowImages[r] || [];
              const k = stills.length;
              if (k > 0) {
                const frameAreaX = stripX + notchIndent;
                const frameAreaW = stripW - (2 * notchIndent);
                const padY = Math.round(frameAreaH * 0.035);
                const padX = Math.round(frameAreaW * 0.012);
                const innerW = frameAreaW - (2 * padX);
                const innerH = frameAreaH - (2 * padY);
                const innerY = frameAreaY + padY;

                const gap = options.frameGap !== undefined && !isNaN(parseInt(options.frameGap, 10))
                  ? parseInt(options.frameGap, 10)
                  : 9;
                const cellW = (innerW - ((k - 1) * gap)) / k;

                for (let j = 0; j < k; j++) {
                  const item = stills[j];
                  const img = item.img || item;
                  const cellX = frameAreaX + padX + j * (cellW + gap);

                  const fitMode = options.fitMode || "cover";
                  const resampled = this.getResampledImage(img, Math.round(cellW), Math.round(innerH), fitMode);
                  ctx.drawImage(resampled, Math.round(cellX), Math.round(innerY));

                  if (options.showNumbers) {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
                    ctx.font = `bold ${Math.max(10, Math.round(trackH * 0.42))}px monospace`;
                    ctx.textAlign = "left";
                    const numStr = String((r * (fpr || k)) + j + 1).padStart(2, "0") + "A";
                    ctx.fillText(numStr, Math.round(cellX + 4), Math.round(frameAreaY - 4));
                  }
                }
              }
            }

            return canvas;
          },
        },
        BlobRegistry: {
          // Keep the public urls array for legacy beforeunload handling.
          urls: [],
          owners: new Map(),
          create(blob, owner = "shared") {
            const url = URL.createObjectURL(blob);
            this.urls.push(url);
            this.owners.set(url, owner);
            return url;
          },
          release(url) {
            if (!this.owners.has(url)) return;
            URL.revokeObjectURL(url);
            this.owners.delete(url);
            const index = this.urls.indexOf(url);
            if (index !== -1) this.urls.splice(index, 1);
          },
          revokeOwner(owner) {
            for (const [url, value] of this.owners) {
              if (value === owner) this.release(url);
            }
          },
          revokeAll() {
            for (const url of [...this.urls]) this.release(url);
          },
        },
        AppState: {
          save(key, value) {
            try {
              localStorage.setItem("cts_" + key, value);
            } catch (e) {}
          },
          load(key) {
            try {
              return localStorage.getItem("cts_" + key);
            } catch (e) {
              return null;
            }
          },
          restoreInputs() {
            document.querySelectorAll(".persist-val").forEach((el) => {
              const saved = this.load(el.id);
              if (saved !== null) {
                el.value = saved;
              }
              el.addEventListener("change", () => this.save(el.id, el.value));
            });
            // Clear legacy local storage for dimensions
            localStorage.removeItem("exportWidth");
            localStorage.removeItem("exportHeight");
            document.querySelectorAll(".persist-chk").forEach((el) => {
              const saved = this.load(el.id);
              if (saved !== null) el.checked = saved === "true";
              el.addEventListener("change", () => this.save(el.id, el.checked));
            });
          },
        },
        Presets: {
          /* Control IDs captured per tool section. type: 'val' (input value)
             or 'chk' (checkbox checked). Only these are snapshotted/applied. */
          sections: {
            "section-logo": [
              { id: "globalFontFamily", type: "val" },
              { id: "fontSizeInput", type: "val" },
              { id: "fontColorPicker", type: "val" },
              { id: "boldToggle", type: "chk" },
              { id: "syncFilenameToggle", type: "chk" },
              { id: "globalPadding", type: "val" },
              { id: "globalImgPos", type: "val" },
              { id: "exportWidth", type: "val" },
              { id: "exportHeight", type: "val" },
              { id: "exportFormat", type: "val" },
            ],
            "section-pdf": [
              { id: "pdfFormat", type: "val" },
              { id: "splitMode", type: "val" },
              { id: "splitRows", type: "val" },
              { id: "splitCols", type: "val" },
            ],
            "section-stills-boards": [
              { id: "storyCols", type: "val" },
              { id: "storyFitMode", type: "val" },
              { id: "storyBgColor", type: "val" },
            ],
            "section-adlinks": [],
            "section-yt-helper": [],
          },
          storageKey(section) {
            return "cts_preset_" + section;
          },
          controlsFor(section) {
            return this.sections[section] || [];
          },
          list(section) {
            try {
              const raw = localStorage.getItem(this.storageKey(section));
              const arr = raw ? JSON.parse(raw) : [];
              return Array.isArray(arr) ? arr : [];
            } catch (e) {
              return [];
            }
          },
          save(section, name) {
            const title = (name || "").trim();
            if (!title || !section) return { ok: false, error: "Enter a preset name." };
            const controls = this.controlsFor(section);
            if (controls.length === 0)
              return { ok: false, error: "This tool has no saved settings yet." };
            const data = {};
            controls.forEach((c) => {
              const el = document.getElementById(c.id);
              if (!el) return;
              data[c.id] = c.type === "chk" ? (el.checked ? "1" : "0") : el.value;
            });
            const all = this.list(section).filter((p) => p.name !== title);
            all.push({ name: title, values: data });
            try {
              localStorage.setItem(this.storageKey(section), JSON.stringify(all));
            } catch (e) {
              return { ok: false, error: "Could not save preset." };
            }
            return { ok: true };
          },
          del(section, name) {
            const all = this.list(section).filter((p) => p.name !== name);
            try {
              localStorage.setItem(this.storageKey(section), JSON.stringify(all));
            } catch (e) {}
            return true;
          },
          apply(section, name) {
            const p = this.list(section).find((x) => x.name === name);
            if (!p || !p.values) return false;
            const controls = this.controlsFor(section);
            controls.forEach((c) => {
              const el = document.getElementById(c.id);
              if (!el || !(c.id in p.values)) return;
              if (c.type === "chk") {
                el.checked = p.values[c.id] === "1";
              } else {
                el.value = p.values[c.id];
              }
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
            });
            return true;
          },
        },
        Utils: {
          sanitize(s) {
            return (s || "").replace(/\s+/g, "_").replace(/[\\\/:*?"<>|]/g, "");
          },
          debounce(func, wait) {
            let timeout;
            return function (...args) {
              clearTimeout(timeout);
              timeout = setTimeout(() => func.apply(this, args), wait);
            };
          },
          createDropZone(el, onFiles) {
            if (!el) return;
            el.ondragover = (e) => {
              e.preventDefault();
              el.classList.add("drag-over");
            };
            el.ondragleave = () => el.classList.remove("drag-over");
            el.ondrop = (e) => {
              e.preventDefault();
              el.classList.remove("drag-over");
              onFiles([...e.dataTransfer.files]);
            };
          },
        },
      };

      const UI = {
        ToolColors: {
          home:             { accent: "#FF6B4A", soft: "rgba(136, 136, 136, 0.15)", glow: "rgba(136, 136, 136, 0.3)" },
          "section-logo":   { accent: "#F59E77", soft: "rgba(136, 136, 136, 0.15)", glow: "rgba(136, 136, 136, 0.3)" },
          "section-pdf":    { accent: "#D979C2", soft: "rgba(136, 136, 136, 0.15)", glow: "rgba(136, 136, 136, 0.3)" },
          "section-stills-boards": { accent: "#9A84F6", soft: "rgba(136, 136, 136, 0.15)", glow: "rgba(136, 136, 136, 0.3)" },
          "section-adlinks":{ accent: "#42CBA8", soft: "rgba(136, 136, 136, 0.15)", glow: "rgba(136, 136, 136, 0.3)" },
          "section-yt-helper": { accent: "#F1B85B", soft: "rgba(136, 136, 136, 0.15)", glow: "rgba(136, 136, 136, 0.3)" },
        },
        els: {
          sidebar: document.getElementById("mainSidebar"),
          viewApp: document.getElementById("view-app"),
          viewHome: document.getElementById("view-home"),
          lightbox: document.getElementById("lightbox"),
          lightboxImg: document.getElementById("lightboxImg"),
          toast: document.getElementById("errorToast"),
        },
        switchViews(fn) {
          const token = (this._switchToken = (this._switchToken || 0) + 1);
          [this.els.viewApp, this.els.viewHome].forEach((el) =>
            el && el.classList.add("leaving")
          );
          setTimeout(() => {
            if (token !== this._switchToken) return;
            fn();
            [this.els.viewApp, this.els.viewHome].forEach(
              (el) => el && el.classList.remove("leaving"),
            );
          }, 160);
        },
        _showHome() {
          document.body.classList.remove("tool-active");
          this.els.sidebar.classList.remove("visible");
          this.els.viewApp.classList.remove("active");
          this.els.viewHome.classList.remove("hidden");
          this.updateNav("nav-home");
          this.applyTheme("home");
          document.getElementById("brandText").textContent = "The Forge";
          
          document.querySelectorAll(".home-card").forEach((card) => {
            const m = (card.getAttribute("onclick") || "").match(/openTool\('([^']+)'/);
            if (m && m[1]) {
              const toolId = m[1];
              let colorData = this.ToolColors[toolId];
              
              if (colorData) {
                const tint = this.accentTint(colorData.accent);
                card.style.setProperty("--accent", colorData.accent);
                card.style.setProperty("--accent-soft", tint.soft);
                card.style.setProperty("--accent-glow", tint.glow);
              }
            }
          });
          
          Core.AppState.save("activeTool", "home");
          Object.values(Tools).forEach((tool) => {
            if (tool.destroy) tool.destroy();
          });
          if (window.HomeTypewriters) {
            window.HomeTypewriters.forEach((tw) => tw.type());
            document.getElementById("homeContent").style.pointerEvents = "all";
            document.querySelectorAll(".home-item").forEach((item) => {
              item.style.transition =
                "color 0.4s ease, text-shadow 0.4s ease, transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), filter 0.4s ease";
            });
          }
        },
        showHome() {
          const core = () => this._showHome();
          if (this.els.viewApp.classList.contains("active")) {
            const motion = window.ForgeWorkspaceRoute;
            const selectedRoute = motion && motion.selected();
            if (selectedRoute) {
              this._switchToken = (this._switchToken || 0) + 1;
              motion.navigate(core, selectedRoute);
            } else {
              this.switchViews(core);
            }
          } else core();
        },
        _openTool(id, mode) {
          document.body.classList.add("tool-active");
          this.els.sidebar.classList.add("visible");
          this.els.viewHome.classList.add("hidden");
          document
            .querySelectorAll(".tool-section")
            .forEach((e) => e.classList.remove("active"));
          document.getElementById(id).classList.add("active");
          this.els.viewApp.classList.add("active");
          const navMap = {
            "section-logo": "nav-logo",
            "section-yt-helper": "nav-yt-helper",
          };
          const singleMode = {
            "section-pdf": (m) => (m === "split" ? "split" : "convert"),
            "section-stills-boards": (m) => (["story", "filmstrip", "fit"].includes(m) ? m : "video"),
            "section-adlinks": (m) =>
              m === "downloader" ? "downloader" : "gen",
          };
          const navByMode = {
            "section-pdf": { convert: "nav-pdf-image", split: "nav-pdf-split" },
            "section-stills-boards": { video: "nav-stills-video", story: "nav-stills-story", filmstrip: "nav-stills-story", fit: "nav-stills-story" },
            "section-adlinks": { gen: "nav-adlinks-gen", downloader: "nav-adlinks-dl" },
          };
          const tabRows = {
            "section-pdf": "tabRowPdf",
            "section-stills-boards": "tabRowStills",
            "section-adlinks": "tabRowAdlinks",
          };
          const headerByMode = {
            "section-pdf": { convert: "PDF to Image", split: "Image Splitter" },
            "section-stills-boards": { video: "Video Stills", story: "Storyboard", filmstrip: "Storyboard", fit: "Storyboard" },
            "section-adlinks": { gen: "Link Gen", downloader: "Ad Link Downloader" },
          };
          let navId = navMap[id];
          const resolver = singleMode[id];
          if (resolver) {
            const resolved = resolver(mode);
            const row = tabRows[id] && document.getElementById(tabRows[id]);
            if (row) row.style.display = "none";
            if (id === "section-pdf") this.switchPdfTab(resolved);
            else if (id === "section-stills-boards") this.switchStillsTab(resolved);
            else if (id === "section-adlinks") this.switchAdlinksTab(resolved);
            navId = navByMode[id][resolved];
            const h2 = document.querySelector("#" + id + " .tool-header h2");
            if (h2) h2.textContent = headerByMode[id][resolved];
          }
          this.updateNav(navId);
          this.applyTheme(id);
          Core.AppState.save("activeTool", id);
          const toolName = this.toolDisplayName(id);
          document.getElementById("brandText").textContent = "The Forge";
        },
        openTool(id, mode) {
          const motion = window.ForgeWorkspaceRoute;
          if (this.els.viewApp.classList.contains("active")) {
            // Changing tools inside the workspace must immediately stop any
            // older shared-element flight; never queue pending navigation.
            if (motion) motion.cancel();
            this._openTool(id, mode);
          } else {
            const core = () => this._openTool(id, mode);
            const route = motion && motion.fromOpen(id, mode);
            if (route) {
              this._switchToken = (this._switchToken || 0) + 1;
              motion.navigate(core, route);
            } else {
              this.switchViews(core);
            }
          }
        },
        switchPdfTab(tabId) {
          const convertTab = document.getElementById("pdfTabConvert");
          const splitTab = document.getElementById("pdfTabSplit");
          const convertContent = document.getElementById(
            "pdfTabContentConvert",
          );
          const splitContent = document.getElementById("pdfTabContentSplit");
          const convertHeader = document.getElementById("convertHeaderControls");
          const splitHeader = document.getElementById("splitHeaderControls");
          if (tabId === "convert") {
            convertTab.classList.add("active-mode");
            convertTab.style.background = "";
            convertTab.style.border = "";
            splitTab.classList.remove("active-mode");
            splitTab.style.background = "transparent";
            splitTab.style.border = "1px solid transparent";
            convertContent.style.display = "block";
            splitContent.style.display = "none";
            if (convertHeader) convertHeader.style.display = "flex";
            if (splitHeader) splitHeader.style.display = "none";
            this.syncTabAria(convertTab, splitTab, convertContent, splitContent);
          } else if (tabId === "split") {
            splitTab.classList.add("active-mode");
            splitTab.style.background = "";
            splitTab.style.border = "";
            convertTab.classList.remove("active-mode");
            convertTab.style.background = "transparent";
            convertTab.style.border = "1px solid transparent";
            splitContent.style.display = "block";
            convertContent.style.display = "none";
            if (convertHeader) convertHeader.style.display = "none";
            if (splitHeader) splitHeader.style.display = "flex";
            this.syncTabAria(splitTab, convertTab, splitContent, convertContent);
          }
        },
        switchStillsTab(tabId) {
          const storyTab = document.getElementById("stillsTabStory");
          const videoTab = document.getElementById("stillsTabVideo");
          const filmstripTab = document.getElementById("stillsTabFilmstrip");
          const storyContent = document.getElementById("stillsTabContentStory");
          const videoContent = document.getElementById("stillsTabContentVideo");
          const filmstripContent = document.getElementById("stillsTabContentFilmstrip");
          const fitContent = document.getElementById("stillsTabContentFit");
          const videoHeader = document.getElementById("videoHeaderControls");
          const storyHeader = document.getElementById("storyHeaderControls");
          const filmstripHeader = document.getElementById("filmstripHeaderControls");
          const fitHeader = document.getElementById("fitHeaderControls");
          const subModeToggle = document.getElementById("storySubModeToggle");
          const subModeBtnBoard = document.getElementById("subModeBtnBoard");
          const subModeBtnFilmstrip = document.getElementById("subModeBtnFilmstrip");
          const subModeBtnFit = document.getElementById("subModeBtnFit");
          const toolIcon = document.getElementById("stillsToolIcon");
          const toolTitle = document.getElementById("stillsToolTitle");

          [storyTab, videoTab, filmstripTab].forEach((t) => {
            if (t) {
              t.classList.remove("active-mode");
              t.style.background = "transparent";
              t.style.border = "1px solid transparent";
              t.setAttribute("aria-selected", "false");
              t.setAttribute("tabindex", "-1");
            }
          });
          [storyContent, videoContent, filmstripContent, fitContent].forEach((c) => {
            if (c) c.style.display = "none";
          });
          [videoHeader, storyHeader, filmstripHeader, fitHeader].forEach((h) => {
            if (h) h.style.display = "none";
          });

          [subModeBtnBoard, subModeBtnFilmstrip, subModeBtnFit].forEach((b) => {
            if (b) { b.classList.remove("active-mode"); b.style.background = "transparent"; }
          });
          if (tabId === "story") {
            if (storyTab) {
              storyTab.classList.add("active-mode");
              storyTab.style.background = "";
              storyTab.style.border = "";
              storyTab.setAttribute("aria-selected", "true");
              storyTab.removeAttribute("tabindex");
            }
            if (storyContent) storyContent.style.display = "block";
            if (storyHeader) storyHeader.style.display = "flex";
            if (subModeToggle) subModeToggle.style.display = "flex";
            if (subModeBtnBoard) {
              subModeBtnBoard.classList.add("active-mode");
              subModeBtnBoard.style.background = "";
            }
            if (subModeBtnFilmstrip) {
              subModeBtnFilmstrip.classList.remove("active-mode");
              subModeBtnFilmstrip.style.background = "transparent";
            }
            if (toolIcon) toolIcon.textContent = "view_timeline";
            if (toolTitle) toolTitle.textContent = "Storyboard";
            this.updateNav("nav-stills-story");
          } else if (tabId === "filmstrip") {
            if (storyTab) {
              storyTab.classList.add("active-mode");
              storyTab.style.background = "";
              storyTab.style.border = "";
              storyTab.setAttribute("aria-selected", "true");
              storyTab.removeAttribute("tabindex");
            }
            if (filmstripTab) {
              filmstripTab.classList.add("active-mode");
              filmstripTab.style.background = "";
              filmstripTab.style.border = "";
              filmstripTab.setAttribute("aria-selected", "true");
              filmstripTab.removeAttribute("tabindex");
            }
            if (filmstripContent) filmstripContent.style.display = "block";
            if (filmstripHeader) filmstripHeader.style.display = "flex";
            if (subModeToggle) subModeToggle.style.display = "flex";
            if (subModeBtnFilmstrip) {
              subModeBtnFilmstrip.classList.add("active-mode");
              subModeBtnFilmstrip.style.background = "";
            }
            if (subModeBtnBoard) {
              subModeBtnBoard.classList.remove("active-mode");
              subModeBtnBoard.style.background = "transparent";
            }
            if (toolIcon) toolIcon.textContent = "theaters";
            if (toolTitle) toolTitle.textContent = "Storyboard";
            this.updateNav("nav-stills-story");
            if (Tools.Filmstrip && Tools.Filmstrip.draw) {
              Tools.Filmstrip.draw();
            }
          } else if (tabId === "fit") {
            if (storyTab) {
              storyTab.classList.add("active-mode");
              storyTab.style.background = "";
              storyTab.style.border = "";
              storyTab.setAttribute("aria-selected", "true");
              storyTab.removeAttribute("tabindex");
            }
            if (fitContent) fitContent.style.display = "block";
            if (fitHeader) fitHeader.style.display = "flex";
            if (subModeToggle) subModeToggle.style.display = "flex";
            if (subModeBtnFit) { subModeBtnFit.classList.add("active-mode"); subModeBtnFit.style.background = ""; }
            if (toolIcon) toolIcon.textContent = "adjust";
            if (toolTitle) toolTitle.textContent = "Storyboard";
            this.updateNav("nav-stills-story");
            if (Tools.FitToPlatform) Tools.FitToPlatform.onActivate();
          } else {
            // video
            if (videoTab) {
              videoTab.classList.add("active-mode");
              videoTab.style.background = "";
              videoTab.style.border = "";
              videoTab.setAttribute("aria-selected", "true");
              videoTab.removeAttribute("tabindex");
            }
            if (videoContent) videoContent.style.display = "block";
            if (videoHeader) videoHeader.style.display = "flex";
            if (subModeToggle) subModeToggle.style.display = "none";
            if (toolIcon) toolIcon.textContent = "movie";
            if (toolTitle) toolTitle.textContent = "Video Stills";
            this.updateNav("nav-stills-video");
          }
        },
        switchStorySubMode(mode) {
          this.switchStillsTab(mode);
        },
        sendStoryToFilmstrip() {
          if (!Tools.Story.active || !Tools.Story.active.images || !Tools.Story.active.images.length) {
            UI.toast("No images in current board to send to Filmstrip");
            return;
          }
          const imgs = Tools.Story.active.images.map((item, idx) => ({
            id: `fs-${Date.now()}-${idx}-${Math.random()}`,
            name: item.file ? item.file.name : `Frame_${idx + 1}`,
            img: item.img,
          }));
          Tools.Filmstrip.images.push(...imgs);
          if (Tools.Filmstrip.sortImagesAscending) Tools.Filmstrip.sortImagesAscending();
          Tools.Filmstrip.updateList();
          Tools.Filmstrip.draw();
          this.switchStorySubMode("filmstrip");
          UI.toast(`Sent ${imgs.length} frame(s) to Filmstrip`);
        },
        sendFilmstripToStory() {
          if (!Tools.Filmstrip.images || !Tools.Filmstrip.images.length) {
            UI.toast("No stills in Filmstrip to send to Board");
            return;
          }
          if (!Tools.Story.active) Tools.Story.addNewProject();
          Tools.Filmstrip.images.forEach((item) => {
            Tools.Story.active.images.push({
              file: { name: item.name },
              img: item.img,
            });
          });
          Tools.Story.updateList();
          Tools.Story.draw();
          this.switchStorySubMode("story");
          UI.toast(`Sent ${Tools.Filmstrip.images.length} frame(s) to Storyboard`);
        },
        switchAdlinksTab(tabId) {
          const genTab = document.getElementById("adlinksTabGen");
          const dlTab = document.getElementById("adlinksTabDownloader");
          const genContent = document.getElementById("adlinksTabContentGen");
          const dlContent = document.getElementById(
            "adlinksTabContentDownloader",
          );
          const genHeaderControls = document.getElementById("adlinksGenHeaderControls");
          const dlHeaderControls = document.getElementById("adlinksDlHeaderControls");
          if (tabId === "gen") {
            genTab.classList.add("active-mode");
            genTab.style.background = "";
            genTab.style.border = "";
            dlTab.classList.remove("active-mode");
            dlTab.style.background = "transparent";
            dlTab.style.border = "1px solid transparent";
            genContent.style.display = "block";
            dlContent.style.display = "none";
            if (genHeaderControls) genHeaderControls.style.display = "flex";
            if (dlHeaderControls) dlHeaderControls.style.display = "none";
            this.syncTabAria(genTab, dlTab, genContent, dlContent);
          } else if (tabId === "downloader") {
            dlTab.classList.add("active-mode");
            dlTab.style.background = "";
            dlTab.style.border = "";
            genTab.classList.remove("active-mode");
            genTab.style.background = "transparent";
            genTab.style.border = "1px solid transparent";
            dlContent.style.display = "block";
            genContent.style.display = "none";
            if (genHeaderControls) genHeaderControls.style.display = "none";
            if (dlHeaderControls) dlHeaderControls.style.display = "flex";
            this.syncTabAria(dlTab, genTab, dlContent, genContent);
          }
        },
        syncTabAria(activeTab, inactiveTab, activePanel, inactivePanel) {
          if (activeTab) activeTab.setAttribute("aria-selected", "true");
          if (inactiveTab) {
            inactiveTab.setAttribute("aria-selected", "false");
            inactiveTab.setAttribute("tabindex", "-1");
          }
          if (activePanel) activePanel.setAttribute("aria-hidden", "false");
          if (inactivePanel) inactivePanel.setAttribute("aria-hidden", "true");
        },
        updateNav(id) {
          document
            .querySelectorAll(".nav-item")
            .forEach((e) => e.classList.remove("active"));
          if (id) { const el = document.getElementById(id); if (el) el.classList.add("active"); }
        },
        accentTint(accentHex) {
          const isLight = document.body.classList.contains("light-mode");
          // Same per-tool hue in both themes; only the strength of the
          // translucent soft/glow tints differs so the tint reads equally
          // on dark (black) vs light (near-white) surfaces.
          const softA = isLight ? 0.24 : 0.16;
          const glowA = isLight ? 0.32 : 0.45;
          const p =
            accentHex.length === 4
              ? accentHex.slice(1).split("").map((x) => x + x)
              : accentHex.slice(1).match(/.{2}/g);
          const r = parseInt(p[0], 16),
            g = parseInt(p[1], 16),
            b = parseInt(p[2], 16);
          return {
            soft: `rgba(${r}, ${g}, ${b}, ${softA})`,
            glow: `rgba(${r}, ${g}, ${b}, ${glowA})`,
          };
        },
        applyTheme(toolId) {
          const c = this.ToolColors[toolId] || this.ToolColors["home"];
          const tint = this.accentTint(c.accent);
          // Apply on <body> too: body.light-mode declares --accent directly on
          // the body element, which would otherwise shadow the inherited value
          // set on <html> and force every tool to the light-mode purple.
          const targets = [document.documentElement, document.body];
          targets.forEach((t) => {
            if (!t) return;
            const s = t.style;
            s.setProperty("--m3-primary", c.accent);
            s.setProperty("--accent", c.accent);
            s.setProperty("--accent-hover", c.accent);
            s.setProperty("--accent-soft", tint.soft);
            s.setProperty("--accent-glow", tint.glow);
          });
        },
        toggleEmptyState(container, isEmpty) {
          if (container)
            container.querySelector(".empty-state-msg").style.display = isEmpty
              ? "flex"
              : "none";
        },
        showSuccess(btn, text = "Done") {
          const old = btn.innerText;
          btn.innerText = text;
          btn.style.borderColor = "var(--success)";
          setTimeout(() => {
            btn.innerText = old;
            btn.style.borderColor = "var(--border)";
          }, 1500);
        },
        showError(msg) {
          this.els.toast.innerText = msg;
          this.els.toast.classList.add("visible");
          setTimeout(() => this.els.toast.classList.remove("visible"), 4000);
        },
        /* In-app confirmation dialog (replaces native confirm()).
           Returns a Promise<boolean>. options: { title, message, okLabel, cancelLabel } */
        confirm(options) {
          const o = options || {};
          const overlay = document.getElementById("confirmOverlay");
          const title = document.getElementById("confirmTitle");
          const body = document.getElementById("confirmBody");
          const okBtn = document.getElementById("confirmOkBtn");
          const cancelBtn = document.getElementById("confirmCancelBtn");
          if (!overlay) return Promise.resolve(true);
          title.textContent = o.title || "Are you sure?";
          body.textContent = o.message || "This action cannot be undone.";
          if (o.okLabel) okBtn.textContent = o.okLabel;
          if (o.cancelLabel) cancelBtn.textContent = o.cancelLabel;
          if (window.lucide) /* window.lucide.createIcons */;

          return new Promise((resolve) => {
            let settled = false;
            let lastFocus = document.activeElement;
            const done = (val) => {
              if (settled) return;
              settled = true;
              overlay.hidden = true;
              document.removeEventListener("keydown", onKey, true);
              overlay.removeEventListener("click", onOverlayBg);
              okBtn.removeEventListener("click", onOk);
              cancelBtn.removeEventListener("click", onCancel);
              resolve(val);
              if (lastFocus && lastFocus.focus) lastFocus.focus();
            };
            const onOk = () => done(true);
            const onCancel = () => done(false);
            const onKey = (e) => {
              if (e.key === "Escape") { e.preventDefault(); done(false); }
              else if (e.key === "Enter") { e.preventDefault(); done(true); }
            };
            const onOverlayBg = (e) => {
              if (e.target === overlay) done(false);
            };
            overlay.addEventListener("click", onOverlayBg);
            okBtn.addEventListener("click", onOk);
            cancelBtn.addEventListener("click", onCancel);
            document.addEventListener("keydown", onKey, true);
            overlay.hidden = false;
            cancelBtn.focus();
          });
        },
        /* Undo toast: shows a message with an Undo button that triggers callback. */
        undoToast(message, onUndo) {
          const toast = document.getElementById("undoToast");
          const msg = document.getElementById("undoToastMsg");
          const btn = document.getElementById("undoToastBtn");
          if (!toast) return;
          if (this._undoTimer) clearTimeout(this._undoTimer);
          msg.textContent = message;
          btn.onclick = () => {
            toast.hidden = true;
            if (typeof onUndo === "function") onUndo();
          };
          toast.hidden = false;
          this._undoTimer = setTimeout(() => { toast.hidden = true; }, 7000);
        },
        activeToolId() {
          return Core.AppState.load("activeTool") || "home";
        },
        toolDisplayName(section) {
          const map = {
            home: "Home",
            "section-logo": "Logo Workspace",
            "section-pdf": "PDF Tools",
            "section-stills-boards": "Stills & Boards",
            "section-adlinks": "Ad Links & Downloader",
            "section-yt-helper": "Video Downloads",
          };
          return map[section] || "He Tool";
        },
        openPresets() {
          const overlay = document.getElementById("presetsOverlay");
          if (!overlay) return;
          const section = this.activeToolId();
          if (!Core.Presets.controlsFor(section) ||
              Core.Presets.controlsFor(section).length === 0) {
            this.showError("No reusable settings for the current view yet.");
            return;
          }
          this._presetReturnFocus = document.activeElement;
          const nameInput = document.getElementById("presetsNameInput");
          if (nameInput) nameInput.value = "";
          document.getElementById("presetsSub").textContent =
            "Save and reuse settings for " + this.toolDisplayName(section) + ".";
          this.renderPresets(section);
          overlay.hidden = false;
          document.getElementById("presetsCloseBtn").focus();
          if (window.lucide) /* window.lucide.createIcons */;
        },
        closePresets() {
          const overlay = document.getElementById("presetsOverlay");
          if (!overlay) return;
          overlay.hidden = true;
          if (this._presetReturnFocus && this._presetReturnFocus.focus) {
            const target = this._presetReturnFocus;
            this._presetReturnFocus = null;
            target.focus();
          }
        },
        renderPresets(section) {
          const list = document.getElementById("presetsList");
          const empty = document.getElementById("presetsEmpty");
          const items = Core.Presets.list(section);
          list.innerHTML = "";
          if (items.length === 0) {
            if (empty) empty.style.display = "block";
            return;
          }
          if (empty) empty.style.display = "none";
          items.forEach((p) => {
            const row = document.createElement("div");
            row.className = "preset-item";
            const name = document.createElement("span");
            name.className = "preset-item-name";
            name.textContent = p.name;
            name.title = p.name;
            const actions = document.createElement("div");
            actions.className = "preset-item-actions";
            const applyBtn = document.createElement("button");
            applyBtn.type = "button";
            applyBtn.className = "preset-btn apply";
            applyBtn.textContent = "Apply";
            applyBtn.addEventListener("click", () => {
              Core.Presets.apply(section, p.name);
              this.closePresets();
              this.showSuccess(applyBtn, "Applied");
            });
            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "preset-btn";
            delBtn.textContent = "Delete";
            delBtn.addEventListener("click", () => {
              Core.Presets.del(section, p.name);
              this.renderPresets(section);
            });
            actions.appendChild(applyBtn);
            actions.appendChild(delBtn);
            row.appendChild(name);
            row.appendChild(actions);
            list.appendChild(row);
          });
        },
        savePreset() {
          const section = this.activeToolId();
          const nameInput = document.getElementById("presetsNameInput");
          const name = nameInput ? nameInput.value.trim() : "";
          if (!name) { this.showError("Enter a preset name."); if (nameInput) nameInput.focus(); return; }
          const res = Core.Presets.save(section, name);
          if (!res.ok) { this.showError(res.error || "Could not save preset."); return; }
          this.renderPresets(section);
          if (nameInput) nameInput.value = "";
          const ok = document.getElementById("presetsSaveBtn");
          this.showSuccess(ok, "Saved");
        },
        openUpdatesOverlay() {
          document.getElementById("dontShowUpdatesOverlay").checked =
            Core.AppState.load("hideUpdatesOverlay") === "true";
          document.getElementById("updatesOverlay").classList.add("active");
          const btn = document.getElementById("whatsNewBtn");
          if (btn) btn.classList.remove("whats-new-highlight");
          Core.AppState.save(
            "lastSeenUpdateVersion",
            window.CURRENT_APP_VERSION || "v1",
          );
        },
        closeUpdatesOverlay() {
          const checked = document.getElementById(
            "dontShowUpdatesOverlay",
          ).checked;
          Core.AppState.save("hideUpdatesOverlay", checked);
          document.getElementById("updatesOverlay").classList.remove("active");
        },
        openKeywordGuide() {
          const overlay = document.getElementById("keywordGuideOverlay");
          const list = document.getElementById("keywordGuideList");
          const tools = [
            {
              id: "section-logo",
              keyword: "logo",
              title: "Logo Workspace",
              desc: "Resize & Brand Images",
              icon: "image",
            },
            {
              id: "section-pdf",
              tab: "convert",
              keyword: "pdf",
              title: "pdf to image",
              desc: "Split & Convert PDFs",
              icon: "file-text",
            },
            {
              id: "section-pdf",
              tab: "split",
              keyword: "image",
              title: "image splitter",
              desc: "Slice images into grid files",
              icon: "crop",
            },
            {
              id: "section-stills-boards",
              tab: "video",
              keyword: "stills",
              title: "video stills",
              desc: "Process Video Frames",
              icon: "film",
            },
            {
              id: "section-stills-boards",
              tab: "story",
              keyword: "story",
              title: "storyboards",
              desc: "Create custom layout boards",
              icon: "clapperboard",
            },
            {
              id: "section-adlinks",
              tab: "gen",
              keyword: "link",
              title: "link gen",
              desc: "Generate campaign tracking shortlinks",
              icon: "link-2",
            },
            {
              id: "section-adlinks",
              tab: "downloader",
              keyword: "downloader",
              title: "ad link downloader",
              desc: "Bulk download sheets media assets",
              icon: "download",
            },
            {
              id: "section-yt-helper",
              keyword: "yt",
              title: "Video Downloads",
              desc: "Extract YouTube Visuals",
              icon: "play-square",
            },
          ];

          // Keep the introductory text if it exists
          const p = list.querySelector("p");
          list.innerHTML = "";
          if (p) list.appendChild(p);

          const grid = document.createElement("div");
          grid.style.display = "grid";
          grid.style.gridTemplateColumns = "1fr";
          grid.style.gap = "10px";

          tools.forEach((t) => {
            const item = document.createElement("div");
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.padding = "12px";
            item.style.border = "2px solid var(--border)";
            item.style.background = "var(--bg-panel)";

            item.innerHTML = `
                        <div style="flex:1;">
                            <div style="font-weight:bold; font-size:1.1rem; margin-bottom:4px; display:flex; align-items:center; gap:8px;">
                                <span class="material-symbols-rounded"  style="font-size: 16px;">${t.icon}</span> ${t.title}
                            </div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${t.desc}</div>
                        </div>
                        <div style="background:var(--bg-input); padding:6px 12px; font-family:var(--font); font-size:0.7rem; border:1px solid var(--border);">
                            ${t.keyword}
                        </div>
                    `;
            grid.appendChild(item);
          });

          list.appendChild(grid);

          if (window.lucide) /* window.lucide.createIcons */;

          document.getElementById("dontShowKeywordGuide").checked =
            Core.AppState.load("hideKeywordGuide") === "true";

          overlay.classList.add("active");
        },
        closeKeywordGuide() {
          const overlay = document.getElementById("keywordGuideOverlay");
          const checked = document.getElementById(
            "dontShowKeywordGuide",
          ).checked;
          Core.AppState.save("hideKeywordGuide", checked);
          overlay.classList.remove("active");
        },
        openLightbox(src) {
          this.els.lightboxImg.src = src;
          this.els.lightbox.classList.add("active");
        },
        closeLightbox() {
          this.els.lightbox.classList.remove("active");
        },
        openCommandPalette() {
          document
            .getElementById("commandPaletteOverlay")
            .classList.add("active");
          document.getElementById("commandPaletteInput").focus();
          document.getElementById("commandPaletteInput").value = "";
          this.filterCommandPalette("");
        },
        closeCommandPalette() {
          document
            .getElementById("commandPaletteOverlay")
            .classList.remove("active");
        },
        filterCommandPalette(term) {
          const query = term.toLowerCase();
          const items = document.querySelectorAll(
            "#commandPaletteList .cmd-item",
          );
          let firstVisible = null;
          items.forEach((item) => {
            item.classList.remove("selected");
            if (item.innerText.toLowerCase().includes(query)) {
              item.style.display = "flex";
              if (!firstVisible) firstVisible = item;
            } else {
              item.style.display = "none";
            }
          });
          if (firstVisible) firstVisible.classList.add("selected");
        },
        handlePaletteKeyDown(e) {
          const overlay = document.getElementById("commandPaletteOverlay");
          if (!overlay.classList.contains("active")) return;

          const items = Array.from(
            document.querySelectorAll("#commandPaletteList .cmd-item"),
          ).filter((i) => i.style.display !== "none");
          if (items.length === 0) return;

          let selectedIdx = items.findIndex((i) =>
            i.classList.contains("selected"),
          );

          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (selectedIdx >= 0)
              items[selectedIdx].classList.remove("selected");
            selectedIdx = (selectedIdx + 1) % items.length;
            items[selectedIdx].classList.add("selected");
            items[selectedIdx].scrollIntoView({ block: "nearest" });
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (selectedIdx >= 0)
              items[selectedIdx].classList.remove("selected");
            selectedIdx = (selectedIdx - 1 + items.length) % items.length;
            items[selectedIdx].classList.add("selected");
            items[selectedIdx].scrollIntoView({ block: "nearest" });
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIdx >= 0) items[selectedIdx].click();
          } else if (e.key === "Escape") {
            e.preventDefault();
            this.closeCommandPalette();
          }
        },
        initTheme() {
          // Light-only presentation while the appearance switch is hidden.
          // Preserve the underlying theme engine for a future opt-in return.
          document.body.classList.add("light-mode");
          this.updateThemeButton();
          const activeTool = Core.AppState.load("activeTool") || "home";
          this.applyTheme(activeTool);
        },
        toggleTheme() {
          // API retained for existing inline handlers, but dark mode is
          // intentionally unavailable in this light-only release.
          document.body.classList.add("light-mode");
          this.applyTheme(Core.AppState.load("activeTool") || "home");
        },
        updateThemeButton() {
          const btn = document.getElementById("themeToggleBtn");
          if (btn && !btn.querySelector(".toggle-track")) {
            btn.innerHTML = `
                        <span class="material-symbols-rounded" id="themeMoonIcon" style="font-size: 14px;">dark_mode</span>
                        <span class="toggle-track">
                            <span class="toggle-thumb"></span>
                        </span>
                        <span class="material-symbols-rounded" id="themeSunIcon" style="font-size: 14px;">light_mode</span>
                    `;

            if (window.lucide) {
              /* window.lucide.createIcons */
            }
          }
        },
      };

      const Tools = {
