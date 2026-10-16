
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
          urls: [],
          create(blob) {
            const url = URL.createObjectURL(blob);
            this.urls.push(url);
            return url;
          },
          revokeAll() {
            this.urls.forEach((url) => URL.revokeObjectURL(url));
            this.urls = [];
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
          document.getElementById("brandText").textContent = "CREATIVE TOOLS SUITE";
          
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
          if (this.els.viewApp.classList.contains("active")) this.switchViews(core);
          else core();
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
          document.getElementById("brandText").textContent = "HOME";
        },
        openTool(id, mode) {
          if (this.els.viewApp.classList.contains("active")) {
            this._openTool(id, mode);
          } else {
            const core = () => this._openTool(id, mode);
            this.switchViews(core);
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
          const savedTheme = Core.AppState.load("theme") || "dark";
          if (savedTheme === "light") {
            document.body.classList.add("light-mode");
          } else {
            document.body.classList.remove("light-mode");
          }
          this.updateThemeButton();
          const activeTool = Core.AppState.load("activeTool") || "home";
          this.applyTheme(activeTool);
        },
        toggleTheme() {
          const isLight = document.body.classList.toggle("light-mode");
          Core.AppState.save("theme", isLight ? "light" : "dark");
          this.updateThemeButton();
          const activeTool = Core.AppState.load("activeTool") || "home";
          this.applyTheme(activeTool);

          // Play retro audio
          if (window.RetroAudio) {
            window.RetroAudio.playSuccess();
          }
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
            this.cards.forEach((c) => URL.revokeObjectURL(c.img.src));
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
            img.src = Core.BlobRegistry.create(file);
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
              URL.revokeObjectURL(obj.img.src);
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
            if (!c.img.complete) return;
            requestAnimationFrame(() => {
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
            this.items.forEach((i) => URL.revokeObjectURL(i.url));
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
                url: Core.BlobRegistry.create(file),
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
            this.active.images.forEach((i) => URL.revokeObjectURL(i.img.src));
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
                img.src = Core.BlobRegistry.create(file);
                await new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              } else {
                continue;
              }
              this.active.images.push({ file, img });
            }
            this.saveSettings();
            this.updateList();
            this.draw();
          },
          getVideoFrame(file) {
            return new Promise((resolve) => {
              const video = document.createElement("video");
              video.src = URL.createObjectURL(file);
              video.muted = true;
              video.currentTime = 1.0;
              video.onseeked = () => {
                const c = document.createElement("canvas");
                c.width = video.videoWidth;
                c.height = video.videoHeight;
                c.getContext("2d").drawImage(video, 0, 0);
                const img = new Image();
                img.src = c.toDataURL("image/jpeg");
                img.onload = () => resolve(img);
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
              URL.revokeObjectURL(this.active.images[idx].img.src);
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
        Stills: {
          collection: {},
          currentId: null,
          queue: [],
          els: {
            drop: document.getElementById("stillsDropZone"),
            input: document.getElementById("stillsInput"),
            stacks: document.getElementById("stillsStacksContainer"),
            empty: document.getElementById("stillsEmpty"),
            dlBtn: document.getElementById("downloadStillsBtn"),
            clearBtn: document.getElementById("clearStillsBtn"),
            overlay: document.getElementById("stillsDetailOverlay"),
            title: document.getElementById("stillsOverlayTitle"),
            count: document.getElementById("stillsOverlayCount"),
            grid: document.getElementById("stillsOverlayGrid"),
            selectAll: document.getElementById("stillsSelectAll"),
            xlBtn: document.getElementById("stillsGenAll"),
            storyBtn: document.getElementById("stillsGenStory"),
            storyGrid: document.getElementById("stillsStoryGrid"),
            dlSel: document.getElementById("stillsDownloadSelected"),
            toBoardBtn: document.getElementById("stillsToBoardBtn"),
            boardMenu: document.getElementById("stillsBoardMenu"),
          },
          init() {
            Core.Utils.createDropZone(this.els.drop, (f) =>
              this.handleFiles(f),
            );
            this.els.input.onchange = (e) => {
              this.handleFiles([...e.target.files]);
              this.els.input.value = "";
            };
            this.els.clearBtn.onclick = () => {
              UI.confirm({
                title: "Clear workspace?",
                message: "This removes all loaded assets and resets the workspace. This action cannot be undone.",
                okLabel: "Clear",
                cancelLabel: "Cancel",
              }).then((ok) => {
                if (!ok) return;
                const items = Array.from(this.els.stacks.children).filter(
                  (el) => !el.id.includes("Empty"),
                );
                window.applyThanosSnap(items).then(() => this.destroy());
              });
            };
            this.els.selectAll.onchange = (e) => {
              if (!this.currentId) return;
              this.collection[this.currentId].frames.forEach(
                (f) => (f.checked = e.target.checked),
              );
              document
                .querySelectorAll("#stillsOverlayGrid .detail-check")
                .forEach((cb) => (cb.checked = e.target.checked));
            };
            this.els.dlSel.onclick = () => this.downloadSelected();
            this.els.dlBtn.onclick = () => this.downloadAll();
            this.els.toBoardBtn.onclick = (e) => {
              e.stopPropagation();
              this.toggleBoardMenu();
            };
            document.addEventListener("click", () => this.closeBoardMenu());
            document.addEventListener("keydown", (e) => {
              if (
                !this.els.boardMenu.style.display ||
                this.els.boardMenu.style.display === "none"
              )
                return;
              if (e.key === "Escape") this.closeBoardMenu();
            });
            document.addEventListener("keydown", (e) => {
              if (
                !this.currentId ||
                !this.els.overlay.classList.contains("active")
              )
                return;
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
                e.preventDefault();
                this.toggleBoardMenu();
                return;
              }
              if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                const active = Array.from(this.els.grid.children).findIndex(
                  (el) => el.classList.contains("active-still"),
                );
                if (active > 0) {
                  this.els.grid.children[active - 1].click();
                  this.els.grid.children[active - 1].scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                }
              }
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                const active = Array.from(this.els.grid.children).findIndex(
                  (el) => el.classList.contains("active-still"),
                );
                if (active >= 0 && active < this.els.grid.children.length - 1) {
                  this.els.grid.children[active + 1].click();
                  this.els.grid.children[active + 1].scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                }
              }
            });
          },
          destroy() {
            this.collection = {};
            this.els.stacks.innerHTML = "";
            this.els.stacks.appendChild(this.els.empty);
            UI.toggleEmptyState(this.els.stacks, true);
          },
          handleFiles(files) {
            const valid = files.filter((f) => f.type.startsWith("video/"));
            if (!valid.length) return;
            this.queue.push(...valid);
            this.els.empty.innerHTML = `${this.queue.length} video(s) queued.`;
            this.process();
          },
          async process() {
            if (!this.queue.length) return;
            UI.toggleEmptyState(this.els.stacks, false);

            const genAllStills = this.els.xlBtn ? this.els.xlBtn.checked : true;
            const genStory = this.els.storyBtn ? this.els.storyBtn.checked : false;
            const storyFramesCount = this.els.storyGrid ? parseInt(this.els.storyGrid.value, 10) : 4;

            for (let i = 0; i < this.queue.length; i++) {
              try {
                const file = this.queue[i];
                const name = file.name
                  .replace(/\.[^/.]+$/, "")
                  .replace(/\s+/g, "_");
                const vid = document.createElement("video");
                vid.src = Core.BlobRegistry.create(file);
                vid.muted = true;
                await new Promise((r) => {
                  vid.onloadedmetadata = r;
                  vid.onerror = r;
                });

                const id = `vid-${Date.now()}`;
                this.collection[id] = { name: name, frames: [] };
                vid.currentTime = 0.5;
                await new Promise((r) => (vid.onseeked = r));

                if (vid.duration < 1.0) {
                  UI.showError(
                    `Storyboard cannot be generated, file too small.`,
                  );
                  continue;
                }

                const stack = document.createElement("div");
                stack.className = "pdf-stack-wrapper";
                stack.innerHTML = `<img src=""><div class="stack-meta"><div class="stack-title">${name}</div><div class="stack-count">Processing...</div></div>`;
                stack.onclick = () => this.openDetail(id);
                this.els.stacks.appendChild(stack);

                const totalFramesToExtract = Math.floor(vid.duration) || 1;
                const interval = vid.duration / (totalFramesToExtract + 1);
                let previewDataUrl = null;

                for (let f = 1; f <= totalFramesToExtract; f++) {
                  await new Promise((resolve) => setTimeout(resolve, 0));
                  vid.currentTime = f * interval;
                  await new Promise((r) => (vid.onseeked = r));

                  const c = document.createElement("canvas");
                  c.width = vid.videoWidth;
                  c.height = vid.videoHeight;
                  c.getContext("2d").drawImage(vid, 0, 0);

                  if (f === 1) {
                    previewDataUrl = c.toDataURL("image/jpeg", 0.5);
                    stack.querySelector("img").src = previewDataUrl;
                  }

                  if (genAllStills) {
                    const blob = await new Promise((r) =>
                      c.toBlob(r, "image/jpeg", 0.9),
                    );
                    const url = Core.BlobRegistry.create(blob);
                    this.collection[id].frames.push({
                      num: f,
                      type: "still",
                      blob,
                      url,
                      checked: true,
                    });
                  }
                }

                if (genStory) {
                  const storyInterval = vid.duration / (storyFramesCount + 1);

                  let storyThumbs = [];
                  for (let f = 1; f <= storyFramesCount; f++) {
                    vid.currentTime = f * storyInterval;
                    await new Promise((r) => (vid.onseeked = r));
                    const tc = document.createElement("canvas");
                    tc.width = vid.videoWidth;
                    tc.height = vid.videoHeight;
                    tc.getContext("2d").drawImage(vid, 0, 0);
                    storyThumbs.push(tc);
                  }

                  let cols = 2;
                  if (storyFramesCount === 6) {
                    cols = 3;
                  } else if (storyFramesCount === 9) {
                    cols = 3;
                  }

                  const compCanvas = Core.AdaptiveRenderer.renderBoard(
                    storyThumbs,
                    {
                      cols: cols,
                      rows: 0,
                      autoWidth: true,
                      gap: 0,
                      bgColor: "#ffffff",
                      fitMode: "cover",
                    },
                  );

                  const compositeBlob = await new Promise((r) =>
                    compCanvas.toBlob(r, "image/jpeg", 0.95),
                  );
                  const compUrl = Core.BlobRegistry.create(compositeBlob);
                  this.collection[id].frames.push({
                    num: "storyboard",
                    type: "storyboard",
                    blob: compositeBlob,
                    url: compUrl,
                    checked: true,
                  });
                  if (!previewDataUrl || !genAllStills)
                    stack.querySelector("img").src = compUrl;
                }

                stack.querySelector(".stack-count").innerText =
                  `${this.collection[id].frames.length} Items`;
              } catch (e) {
                console.error(e);
              }
            }
            this.queue = [];
            this.els.dlBtn.disabled = false;
          },
          openDetail(id) {
            this.closeBoardMenu();
            this.currentId = id;
            const data = this.collection[id];
            this.els.title.innerText = data.name;
            this.els.count.innerText = `${data.frames.length} Items`;
            this.els.grid.innerHTML = "";
            const previewArea = document.getElementById("stillsOverlayPreview");
            previewArea.innerHTML =
              '<span style="color:var(--text-muted); font-size:0.9rem;">Select a still to preview</span>';

            data.frames.forEach((f) => {
              const card = document.createElement("div");
              card.style.cssText =
                "display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.2s; border-radius:0; margin-bottom:4px;";
              card.innerHTML = `<img src="${f.url}" style="width:50px; height:50px; object-fit:cover; border-radius:0; flex-shrink:0;"><div style="flex:1; font-size:0.85rem; font-family:var(--font-mono); color:var(--text-main);">${f.type === "storyboard" ? "Storyboard" : "#" + f.num}</div><input data-guide="Select or deselect this frame for batch downloading." type="checkbox" class="detail-check toggle-switch small" ${f.checked ? "checked" : ""}>`;

              card.onclick = (e) => {
                if (e.target.tagName !== "INPUT") {
                  Array.from(this.els.grid.children).forEach((el) => {
                    el.classList.remove("active-still");
                    el.style.background = "transparent";
                    el.querySelector("div").style.color = "var(--text-main)";
                  });
                  card.classList.add("active-still");
                  card.style.background = "var(--text-main)";
                  card.querySelector("div").style.color = "var(--bg-main)";
                  previewArea.innerHTML = `<img src="${f.url}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:0;">`;
                }
              };
              card.querySelector(".detail-check").onchange = (e) =>
                (f.checked = e.target.checked);
              this.els.grid.appendChild(card);
            });

            if (data.frames.length > 0) {
              this.els.grid.firstChild.click();
            }

            this.els.overlay.classList.add("active");
          },
          closeDetail() {
            this.els.overlay.classList.remove("active");
            this.currentId = null;
          },
          closeBoardMenu() {
            if (this.els.boardMenu) this.els.boardMenu.style.display = "none";
          },
          toggleBoardMenu() {
            const menu = this.els.boardMenu;
            const willOpen = menu.style.display === "none";
            this.closeBoardMenu();
            if (willOpen) {
              this.renderBoardMenu();
              menu.style.display = "block";
            }
          },
          renderBoardMenu() {
            const menu = this.els.boardMenu;
            menu.innerHTML = "";
            const story = Tools.Story;
            const sel = this.currentId
              ? this.collection[this.currentId].frames.filter(
                  (f) => f.checked && f.type !== "storyboard",
                )
              : [];
            const header = document.createElement("div");
            header.textContent = `Send ${sel.length} still${sel.length === 1 ? "" : "s"} to board`;
            header.style.cssText =
              "font-size:0.72rem; text-transform:uppercase; letter-spacing:0.8px; color:var(--text-muted); padding:8px 10px 4px;";
            menu.appendChild(header);

            const rowStyle =
              "display:flex; align-items:center; gap:10px; padding:8px 10px; font-size:0.85rem; cursor:pointer; border-radius:0; color:var(--text-main); background:transparent;";
            const rowHover = (el) => {
              el.addEventListener("mouseenter", () => {
                el.style.background = "var(--text-main)";
                el.style.color = "var(--bg-main)";
                const svg = el.querySelector("svg");
                if (svg) svg.style.color = "var(--bg-main)";
              });
              el.addEventListener("mouseleave", () => {
                el.style.background = "transparent";
                el.style.color = "var(--text-main)";
                const svg = el.querySelector("svg");
                if (svg) svg.style.color = "var(--text-main)";
              });
            };

            const newRow = document.createElement("div");
            newRow.style.cssText = rowStyle;
            newRow.innerHTML =
              '<span class="material-symbols-rounded" style="flex-shrink:0; color:var(--text-main); font-size: 14px;">add</span><span>New board from selection</span>';
            newRow.onclick = () => this.sendToBoard("__new__");
            rowHover(newRow);
            menu.appendChild(newRow);

            const filmstripRow = document.createElement("div");
            filmstripRow.style.cssText = rowStyle;
            filmstripRow.innerHTML =
              '<span class="material-symbols-rounded" style="flex-shrink:0; color:var(--text-main); font-size: 14px;">theaters</span><span>Send to Filmstrip</span>';
            filmstripRow.onclick = () => {
              this.closeBoardMenu();
              if (sel.length === 0) return;
              this.closeDetail();
              Tools.Filmstrip.addFromStills(sel);
              UI.switchStillsTab("filmstrip");
            };
            rowHover(filmstripRow);
            menu.appendChild(filmstripRow);

            const divider = document.createElement("div");
            divider.style.cssText =
              "height:1px; background:var(--border); margin:6px 8px;";
            menu.appendChild(divider);

            (story.projects || []).forEach((p) => {
              const row = document.createElement("div");
              row.style.cssText = rowStyle;
              const isActive = story.active && p.id === story.active.id;
              row.innerHTML = `<span class="material-symbols-rounded" style="flex-shrink:0; color:var(--text-main); font-size: 14px;">grid_view</span><span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.name}</span>${
                isActive
                  ? '<span style="font-size:0.7rem; opacity:0.6;">active</span>'
                  : ""
              }`;
              row.onclick = () => this.sendToBoard(p.id);
              rowHover(row);
              menu.appendChild(row);
            });

            if (window.lucide) /* window.lucide.createIcons */;
          },
          async sendToBoard(projectId) {
            this.closeBoardMenu();
            if (!this.currentId) return;
            const data = this.collection[this.currentId];
            const sel = data.frames.filter(
              (f) => f.checked && f.type !== "storyboard",
            );
            if (!sel.length) {
              UI.showError("Select at least one still to send to a board.");
              return;
            }
            const story = Tools.Story;
            const alreadyHas = story.projects.some((b) =>
              b.images.some(
                (im) => im.label && im.label.indexOf(data.name + " #") === 0,
              ),
            );
            if (alreadyHas) {
              const confirmDialog = document.getElementById("confirmDialog");
              confirmDialog.style.maxWidth = "min-content";
              let proceed;
              try {
                proceed = await UI.confirm({
                  title: "Same video detected",
                  message: `You are creating a storyboard for the same video ("${data.name}") again. A board already contains frames from it. Cancel keeps the boards unchanged; Proceed adds these frames anyway.`,
                  okLabel: "Proceed",
                  cancelLabel: "Cancel",
                });
              } finally {
                confirmDialog.style.maxWidth = "";
              }
              if (!proceed) return;
            }
            let target = story.active;
            if (projectId === "__new__") {
              story.addNewProject();
              target = story.active;
            } else if (projectId) {
              const p = story.projects.find((x) => x.id === projectId);
              if (!p) {
                UI.showError("Board not found.");
                return;
              }
              target = p;
            }
            const wasEmpty = target.images.length === 0;
            if (wasEmpty) {
              let base = data.name || "Board";
              let boardName = base;
              for (
                let n = 2;
                story.projects.some(
                  (b) => b.id !== target.id && b.name === boardName,
                );
                n++
              ) {
                boardName = `${base} ${n}`;
              }
              target.name = boardName;
              story.loadSettings();
            }
            for (const f of sel) {
              const img = new Image();
              img.src = URL.createObjectURL(f.blob);
              await new Promise((res) => {
                img.onload = res;
                img.onerror = res;
              });
              target.images.push({
                file: f.blob,
                img,
                label: `${data.name} #${f.num}`,
              });
            }
            if (story.active !== target) story.switchProject(target.id);
            story.updateList();
            story.draw();
            story.renderTabs();
            {
              const btn = this.els.toBoardBtn;
              btn.style.borderColor = "var(--success)";
              if (wasEmpty) {
                if (btn.getAttribute("data-created") !== "1") {
                  btn.setAttribute("data-created", "1");
                  const orig = btn.innerHTML;
                  btn.innerHTML = '<span class="material-symbols-rounded" >check</span> Board created';
                  if (window.lucide) /* window.lucide.createIcons */;
                  setTimeout(() => {
                    btn.setAttribute("data-created", "0");
                    btn.innerHTML = orig;
                    if (window.lucide) /* window.lucide.createIcons */;
                  }, 1600);
                }
              }
              setTimeout(
                () => (btn.style.borderColor = "var(--border)"),
                1500,
              );
            }
          },
          async downloadSelected() {
            if (!this.currentId) return;
            const data = this.collection[this.currentId];
            const sel = data.frames.filter((f) => f.checked);
            const zip = new JSZip();
            let imgIdx = 1;
            sel.forEach((f) => {
              if (f.type === "storyboard") {
                zip.file(`storyboard.jpg`, f.blob);
              } else {
                zip.file(`${imgIdx++}.jpg`, f.blob);
              }
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(
              await zip.generateAsync({ type: "blob" }),
            );
            a.download = `${data.name.replace(/[^a-z0-9]/gi, "_")}_stills.zip`;
            a.click();
          },
          async downloadAll() {
            this.els.dlBtn.innerText = "Zipping...";
            const zip = new JSZip();
            Object.values(this.collection).forEach((v) => {
              const topFolder = zip.folder(v.name);
              const sel = v.frames.filter((f) => f.checked);
              let imgIdx = 1;
              sel.forEach((frame) => {
                if (frame.type === "storyboard")
                  topFolder.file(`storyboard.jpg`, frame.blob);
                else topFolder.file(`${imgIdx++}.jpg`, frame.blob);
              });
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(
              await zip.generateAsync({ type: "blob" }),
            );
            a.download = "video_extras.zip";
            a.click();
            this.els.dlBtn.innerText = "Download All";
          },
        },
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
        AdLinkGen: {
          base: {
            aldi: "https://aldimediaeu.blob.core.windows.net/aldimediaeu/",
            s3: "https://s3media-ml-eu.surveycenter.com/",
          },
          normFolder(v) {
            return (
              v
                .trim()
                .replace(/\s+/g, "/")
                .replace(/\/+/g, "/")
                .replace(/^\/|\/$/g, "") + "/"
            );
          },
          generate() {
            const server = document.getElementById("alg-server").value;
            const modeNew = document.getElementById("alg-mode-toggle")
              ? document.getElementById("alg-mode-toggle").checked
              : false;
            const folder = this.normFolder(
              document.getElementById("alg-folder").value,
            );
            const lines = document
              .getElementById("alg-input")
              .value.split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            let ads = [],
              story = [];
            lines.forEach((name) => {
              const ext = name.split(".").pop().toLowerCase();
              const url = this.base[server] + folder + name;
              if (ext === "jpg" || ext === "png") {
                ads.push(
                  `<img src="${url}" class="zoomImage" style="max-width:80%">`,
                );
                story.push(
                  `<img src="${url}" class="zoomImage" style="max-height:280px">`,
                );
              } else if (ext === "mp4") {
                let outUrl = url;
                if (modeNew) {
                  outUrl = outUrl.replace(/^https:/, "").replace(/\.mp4$/i, "");
                }
                ads.push(outUrl);
                story.push(
                  `<img src="${this.base[server] + folder + name.replace(".mp4", ".jpg")}" class="zoomImage" style="max-height:280px">`,
                );
              } else if (ext === "mp3") {
                ads.push(url);
                story.push(name);
              }
            });
            document.getElementById("alg-out-ads").value = ads.join("\n");
            document.getElementById("alg-out-story").value = story.join("\n");
          },
          copy(id, btn) {
            const el = document.getElementById(id);
            el.select();
            el.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(el.value).then(() => {
              UI.showSuccess(btn, "Copied");
            });
          },
        },
        AdDownloader: {
          workbookData: null,
          allNames: [],
          adTypeMap: {},
          init() {
            document
              .getElementById("adDlInput")
              .addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                  document.getElementById("adDlFileNameDisplay").innerText =
                    file.name;
                  this.loadExcel();
                } else {
                  document.getElementById("adDlFileNameDisplay").innerText =
                    "Upload Excel";
                }
              });
          },
          normalize(text) {
            return text
              .toString()
              .replace(/\s+/g, "")
              .replace(/_/g, "")
              .toUpperCase();
          },
          loadExcel() {
            const file = document.getElementById("adDlInput").files[0];
            if (!file) {
              alert("Please upload an Excel file first.");
              return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
              const data = new Uint8Array(e.target.result);
              this.workbookData = window.XLSX.read(data, { type: "array" });
              this.generateDashboard();
            };
            reader.readAsArrayBuffer(file);
          },
          generateDashboard() {
            const sheet =
              this.workbookData.Sheets[this.workbookData.SheetNames[0]];
            const range = window.XLSX.utils.decode_range(sheet["!ref"]);
            const tbody = document.getElementById("adDlTableBody");
            const downloadedBody =
              document.getElementById("adDlDownloadedBody");
            const downloadedHeaderRow = document.getElementById(
              "adDlDownloadedHeaderRow",
            );
            tbody.innerHTML = "";
            Array.from(downloadedBody.children).forEach((child) => {
              if (child.id !== "adDlDownloadedHeaderRow") {
                downloadedBody.removeChild(child);
              }
            });
            downloadedHeaderRow.style.display = "none";
            this.allNames = [];
            this.adTypeMap = {};
            let fragment = document.createDocumentFragment();
            for (let r = 1; r <= range.e.r; r++) {
              let adCell = sheet[window.XLSX.utils.encode_cell({ r: r, c: 0 })];
              let linkCell =
                sheet[window.XLSX.utils.encode_cell({ r: r, c: 1 })];
              let typeCell =
                sheet[window.XLSX.utils.encode_cell({ r: r, c: 2 })];
              if (!typeCell) continue;
              let adNo = adCell.v;
              let adType = typeCell.v;
              this.adTypeMap[this.normalize(adType)] = adNo;
              let link = "";
              if (linkCell && linkCell.l) link = linkCell.l.Target;
              else if (linkCell) link = linkCell.v;
              let linkString = link ? link.toString().trim() : "";
              let displayText = ((linkCell && linkCell.v) || "")
                .toString()
                .trim();
              let extRegex =
                /\.(mp4|mov|avi|mkv|webm|flv|wmv|mp3|wav|ogg|m4a|aac|flac|jpg|jpeg|png|gif|webp|svg|bmp)\b/i;
              let extMatch =
                displayText.match(extRegex) || linkString.match(extRegex);
              if (!extMatch) {
                extMatch = displayText.match(/\.([a-zA-Z0-9]{2,4})$/i);
                if (!extMatch) {
                  try {
                    let urlObj = new URL(linkString);
                    extMatch = urlObj.pathname.match(/\.([a-zA-Z0-9]{2,4})$/i);
                  } catch (e) {
                    extMatch = linkString.match(/\.([a-zA-Z0-9]{2,4})$/i);
                  }
                }
              }
              let ext = extMatch ? extMatch[0].toLowerCase() : "";
              const ignoredExts = [
                ".com",
                ".org",
                ".net",
                ".co",
                ".io",
                ".de",
                ".uk",
                ".us",
                ".info",
                ".biz",
                ".html",
                ".htm",
                ".php",
                ".asp",
                ".aspx",
                ".jsp",
              ];
              if (ignoredExts.includes(ext)) {
                ext = "";
              }
              let clean = displayText
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\u00df/g, "ss");
              clean = clean.replace(/\.(mp4|mov|avi|mkv|webm|flv|wmv|mp3|wav|ogg|m4a|aac|flac|jpg|jpeg|png|gif|webp|svg|bmp)$/i, "");
              if (ext) {
                if (clean.toLowerCase().endsWith(ext)) {
                  clean = clean.substring(0, clean.length - ext.length);
                }
} else {
                 let typeLower = adType.toLowerCase().trim();
                 const imageTypes = [
                   "print", "ooh", "out of home", "outdoor", "billboard", "poster",
                   "img", "image", "picture", "photo", "static", "display", "banner",
                   "pic", "jpeg", "jpg", "png", "gif", "webp", "creative", "visual"
                 ];
                 const audioTypes = [
                   "radio", "audio", "podcast", "sound", "voice", "music", "spot"
                 ];
                 const videoTypes = [
                   "tv", "television", "video", "cinema", "pre-roll", "preroll",
                   "mid-roll", "midroll", "post-roll", "postroll", "bumper",
                   "in-stream", "instream", "ott", "ctv", "connected tv",
                   "social video", "reels", "tiktok", "shorts", "story", "stories"
                 ];

                 let matched = false;
                 for (const t of imageTypes) {
                   if (typeLower === t || typeLower.includes(" " + t + " ") || typeLower.startsWith(t + " ") || typeLower.endsWith(" " + t)) {
                     ext = ".jpg";
                     matched = true;
                     break;
                   }
                 }
                 if (!matched) {
                   for (const t of audioTypes) {
                     if (typeLower === t || typeLower.includes(" " + t + " ") || typeLower.startsWith(t + " ") || typeLower.endsWith(" " + t)) {
                       ext = ".mp3";
                       matched = true;
                       break;
                     }
                   }
                 }
                 if (!matched) {
                   for (const t of videoTypes) {
                     if (typeLower === t || typeLower.includes(" " + t + " ") || typeLower.startsWith(t + " ") || typeLower.endsWith(" " + t)) {
                       ext = ".mp4";
                       matched = true;
                       break;
                     }
                   }
                 }
                 if (!matched) {
                   ext = ".mp4";
                 }
               }
              clean = clean
                .replace(/[^a-zA-Z0-9]/g, "_")
                .replace(/_+/g, "_")
                .replace(/^_|_$/g, "");
              let typeNumberMatch = adType.match(/\d+/);
              let typeNumber = typeNumberMatch ? typeNumberMatch[0] : "";
              let typeBase = adType.replace(/\d+/g, "").trim();
              let typeBaseClean = typeBase
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9]/g, "_")
                .replace(/_+/g, "_")
                .replace(/^_|_$/g, "");
              if (typeNumber) {
                let regex = new RegExp(typeBaseClean, "i");
                clean = clean.replace(regex, typeBaseClean + typeNumber);
              }
              let finalName = `AD${adNo}_${clean}`;
              this.allNames.push(finalName);
              let tr = document.createElement("tr");
              tr.id = `adDl-row-${adNo}`;
              tr.innerHTML = `<td style="padding: 16px; border-bottom: 1px solid var(--border); font-family: var(--font-mono);">${adNo}</td><td style="padding: 16px; border-bottom: 1px solid var(--border); font-family: var(--font-mono); color: var(--success);">${finalName}</td><td style="padding: 16px; border-bottom: 1px solid var(--border); text-align: right;"><div style="display:flex; gap:8px; justify-content:flex-end;"><button class="liquid-btn" style="padding:4px 8px; font-size:0.75rem;" onclick="Tools.AdDownloader.copySingleName('${finalName}')"><span class="material-symbols-rounded" style="margin-right:4px; font-size: 14px;">content_copy</span>Copy</button><button class="liquid-btn active-mode" style="padding:4px 8px; font-size:0.75rem;" onclick="Tools.AdDownloader.downloadPopup('${link}', '${adNo}', '${finalName}')"><span class="material-symbols-rounded" style="margin-right:4px; font-size: 14px;">download</span>Download</button></div></td>`;
              tr.style.transition = "background 0.2s";
              tr.onmouseover = () => {
                if (!tr.classList.contains("downloaded"))
                  tr.style.background = "var(--bg-input)";
              };
              tr.onmouseout = () => {
                if (!tr.classList.contains("downloaded"))
                  tr.style.background = "transparent";
              };
              fragment.appendChild(tr);
            }
            tbody.appendChild(fragment);
            document.getElementById("adDlTableContainer").style.display =
              "block";
            document.getElementById("adDlSummaryBar").style.display = "block";
            document.getElementById("adDlCountText").innerText =
              this.allNames.length + " Ads Detected";
            document.getElementById("adDlEmptyState").style.display = "none";
            if (window.lucide) {
              /* window.lucide.createIcons */
            }
          },
          copyToClipboardFallback(text) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.top = "-9999px";
            textArea.style.left = "-9999px";
            textArea.style.width = "2em";
            textArea.style.height = "2em";
            textArea.style.padding = "0";
            textArea.style.border = "none";
            textArea.style.outline = "none";
            textArea.style.boxShadow = "none";
            textArea.style.background = "transparent";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
              document.execCommand("copy");
            } catch (err) {}
            document.body.removeChild(textArea);
          },
          copySingleName(name) {
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(name).catch(() => {
                this.copyToClipboardFallback(name);
              });
            } else {
              this.copyToClipboardFallback(name);
            }
            alert("Copied: " + name);
          },
          copyAllNames(withoutExtensions = false) {
            if (this.allNames.length === 0) return;
            let names = this.allNames;
            if (withoutExtensions) {
              names = this.allNames.map(name => {
                const lastDotIndex = name.lastIndexOf(".");
                return lastDotIndex !== -1 ? name.substring(0, lastDotIndex) : name;
              });
            }
            const text = names.join("\n");
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(text).catch(() => {
                this.copyToClipboardFallback(text);
              });
            } else {
              this.copyToClipboardFallback(text);
            }
            alert("All " + this.allNames.length + " names copied!");
          },
          downloadPopup(url, adNo, finalName) {
            let downloadUrl = url;
            if (downloadUrl && !downloadUrl.includes("download=")) {
              if (downloadUrl.includes("?")) {
                downloadUrl = downloadUrl.split("?")[0] + "?download=1";
              } else {
                downloadUrl += "?download=1";
              }
            }
            if (finalName) {
              if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(finalName).catch(() => {
                  this.copyToClipboardFallback(finalName);
                });
              } else {
                this.copyToClipboardFallback(finalName);
              }
            }
            if (downloadUrl) {
              window.open(
                downloadUrl,
                "downloadWindow",
                "width=900,height=700,left=200,top=100",
              );
            }
            if (adNo) {
              const row = document.getElementById(`adDl-row-${adNo}`);
              if (row) {
                const downloadedBody =
                  document.getElementById("adDlDownloadedBody");
                const downloadedHeaderRow = document.getElementById(
                  "adDlDownloadedHeaderRow",
                );
                row.classList.add("downloaded");
                row.style.opacity = "0.6";
                row.style.background = "rgba(255,255,255,0.01)";
                const nameCell = row.querySelector("td:nth-child(2)");
                if (nameCell) nameCell.style.textDecoration = "line-through";
                downloadedHeaderRow.style.display = "table-row";
                downloadedBody.appendChild(row);
              }
            }
          },
          getBucketData() {
            if (this.workbookData.SheetNames.length < 2) return [];
            const sheet =
              this.workbookData.Sheets[this.workbookData.SheetNames[1]];
            if (!sheet) return [];
            const range = window.XLSX.utils.decode_range(sheet["!ref"]);
            let rows = [];
            for (let r = 1; r <= range.e.r; r++) {
              let bucketCell =
                sheet[window.XLSX.utils.encode_cell({ r: r, c: 0 })];
              if (!bucketCell) continue;
              let bucket = bucketCell.v.toString().trim();
              let ads = [];
              for (let c = 1; c <= range.e.c; c++) {
                let adCell =
                  sheet[window.XLSX.utils.encode_cell({ r: r, c: c })];
                if (!adCell || !adCell.v) continue;
                let name = this.normalize(adCell.v);
                let adNo = this.adTypeMap[name];
                if (adNo) ads.push(adNo);
              }
              if (ads.length > 0) rows.push({ bucket: bucket, ads: ads });
            }
            return rows;
          },
          copyBucketTable() {
            let rows = this.getBucketData();
            if (rows.length === 0) {
              alert("No bucket data found on Sheet 2.");
              return;
            }
            let output = "Bucket\tAds\n";
            rows.forEach((r) => {
              output +=
                r.bucket +
                "\t" +
                r.ads.map((a) => "'" + a + "'").join(",") +
                "\n";
            });
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(output).catch(() => {
                this.copyToClipboardFallback(output);
              });
            } else {
              this.copyToClipboardFallback(output);
            }
            alert("Bucket table copied!");
          },
          copyForstaScript() {
            let rows = this.getBucketData();
            if (rows.length === 0) {
              alert("No bucket data found on Sheet 2.");
              return;
            }
            let script = "var s = set()\n\n";
            rows.forEach((r) => {
              script += "// Bucket " + r.bucket + "\n";
              script += "if (f('cq42000').any('" + r.bucket + "')) {\n";
              script +=
                "    s = s.union(set(" +
                r.ads.map((a) => "'" + a + "'").join(",") +
                "))\n";
              script += "}\n\n";
            });
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(script).catch(() => {
                this.copyToClipboardFallback(script);
              });
            } else {
              this.copyToClipboardFallback(script);
            }
            alert("Script copied!");
          },
        },
      };

      const YouTubeHelper = {
        parseUrl(url) {
          const patterns = {
            video: [
              /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&\n?#]+)/,
              /youtube\.com\/live\/([^&\n?#]+)/,
            ],
            playlist: [
              /youtube\.com\/playlist\?list=([^&\n#]+)/,
              /youtube\.com\/watch\?.*[&?]list=([^&\n#]+)/,
            ],
            channel: [/youtube\.com\/(?:c\/|channel\/|user\/|@)([^&\n?#\/]+)/],
          };
          for (const [type, regexes] of Object.entries(patterns)) {
            for (const re of regexes) {
              const match = url.match(re);
              if (match) return { type, id: match[1], originalUrl: url };
            }
          }
          return null;
        },
        async fetchMetadata(id, type = "video") {
          const endpoints = {
            video: [
              `https://noembed.com/embed?url=https://youtube.com/watch?v=${id}`,
              `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${id}&format=json`,
            ],
            playlist: [
              `https://yewtu.be/api/v1/playlists/${id}`,
            ],
            channel: [
              `https://noembed.com/embed?url=https://youtube.com/channel/${id}`,
            ],
          };
          
          const urls = endpoints[type] || endpoints.video;
          
          for (const endpoint of urls) {
            try {
              const res = await fetch(endpoint);
              if (!res.ok) continue;
              const data = await res.json();
              return {
                title: data.title || data.name || "Unknown",
                author: data.author_name || data.uploader || "Unknown",
                authorUrl: data.author_url || data.uploader_url || "",
                thumbnail:
                  data.thumbnail_url ||
                  data.thumbnail ||
                  `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                duration: data.duration
                  ? this.formatDuration(data.duration)
                  : null,
                type,
                id,
              };
            } catch (e) {
              continue;
            }
          }
          
          return {
            title: "Unknown",
            author: "Unknown",
            type,
            id,
            thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            error: "Failed to fetch metadata from all endpoints",
          };
        },
        generateCommands(parsed, options = {}) {
          const {
            format = "mp4",
            quality = "best",
            embedSubs = false,
            metadata = true,
            thumbnail = false,
            outputPath = "",
          } = options;
          
          const base = "yt-dlp";
          
          const qualityPresets = {
            best: "bv*[height<=1080]+ba/b[height<=1080]",
            "1080p": "bv*[height<=1080]+ba/b[height<=1080]",
            "720p": "bv*[height<=720]+ba/b[height<=720]",
            "480p": "bv*[height<=480]+ba/b[height<=480]",
            audio: "bestaudio/b",
          };
          
          const qualityStr = qualityPresets[quality] || qualityPresets.best;

          const safePath = outputPath
            .trim()
            .replace(/\\+$/, "")
            .replace(/"/g, '\\"');
          const outPathArg = safePath ? `-P "${safePath}" ` : "";

          const commonFlags = [
            `--extractor-args "youtube:player_client=web_embedded"`,
            `--merge-output-format ${format}`,
            embedSubs ? "--embed-subs" : "",
            metadata ? "--embed-metadata" : "",
            thumbnail ? "--embed-thumbnail" : "",
            "--no-playlist",
            "--restrict-filenames",
            "-o",
            `"%(title)s.%(ext)s"`,
            "-f",
            `"${qualityStr}"`,
          ]
            .filter(Boolean)
            .join(" ");

          const baseCmd = `${base} ${outPathArg}`;

          return {
            video: `${baseCmd}${commonFlags} "${parsed.originalUrl}"`,
            audio: `${base} ${outPathArg}--extractor-args "youtube:player_client=web_embedded" -x --audio-format mp3 --restrict-filenames -o "%(title)s.%(ext)s" "${parsed.originalUrl}"`,
            fixCache: `${base} --rm-cache-dir`,
          };
        },
        formatDuration(seconds) {
          if (!seconds) return null;
          const h = Math.floor(seconds / 3600);
          const m = Math.floor((seconds % 3600) / 60);
          const s = seconds % 60;
          return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
        },
      };

      const YouTubeHelperUI = {
        handlePaste(e) {
          const html = e.clipboardData.getData("text/html");
          if (html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const links = Array.from(doc.querySelectorAll("a"))
              .map((a) => a.href)
              .filter(
                (href) =>
                  href.includes("youtube.com") || href.includes("youtu.be"),
              );
            if (links.length > 0) {
              e.preventDefault();
              const target = e.target;
              const insertText = links.join("\n") + "\n";
              const start = target.selectionStart;
              const end = target.selectionEnd;
              target.value =
                target.value.substring(0, start) +
                insertText +
                target.value.substring(end);
              target.selectionStart = target.selectionEnd =
                start + insertText.length;
            }
          }
        },
        async analyze() {
          const urlText = document.getElementById("ytUrlInput").value.trim();
          const resultEl = document.getElementById("ytResult");
          const metadataPanel = document.getElementById("ytMetadataPanel");
          if (!urlText) return UI.showError("Enter YouTube URLs");
          const urls = urlText.split(/\s+/).filter(Boolean);

          resultEl.style.display = "block";
          resultEl.innerHTML =
            '<div style="padding:15px; text-align:center; color:var(--text-muted);"><span class="processing-pulse">Analyzing...</span></div>';

          try {
            let htmlContent = "";
            metadataPanel.style.display = "block";

            for (const url of urls) {
              const parsed = YouTubeHelper.parseUrl(url);
              if (!parsed) {
                htmlContent += `<div class="glass-panel" style="padding:15px; border:1px solid var(--m3-outline-variant); margin-bottom:10px; color:var(--danger);">Invalid YouTube URL: ${url}</div>`;
                continue;
              }
              const meta = await YouTubeHelper.fetchMetadata(
                parsed.id,
                parsed.type,
              );
              const cmds = YouTubeHelper.generateCommands(parsed, {
                outputPath: "~/Downloads",
                quality: "best",
                format: "mp4",
              });

              htmlContent += `<div class="glass-panel" style="padding:15px; border:1px solid var(--m3-outline-variant); margin-bottom:10px;">
                            <div style="display:flex; gap:12px; align-items:flex-start; flex-wrap:wrap;">
                                <img src="${meta.thumbnail}" style="width:120px; height:68px; object-fit:cover; border-radius:0; flex-shrink:0;" onerror="this.style.display='none'">
                                <div style="flex:1; min-width:0;">
                                    <h4 style="margin:0 0 6px; font-size:0.95rem; word-break:break-word;">${meta.title}</h4>
                                    <div style="font-size:0.8rem; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                                        <span><span class="material-symbols-rounded" style="font-size: 12px;">person</span> ${meta.author}</span>
                                        ${meta.duration ? `<span><span class="material-symbols-rounded" style="font-size: 12px;">schedule</span> ${meta.duration}</span>` : ""}
                                        <span style="text-transform:capitalize;">${parsed.type}</span>
                                    </div>
                                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                        <button class="liquid-btn copy-cmd-btn" data-cmd="${cmds.video.replace(/"/g, "&quot;")}" onclick="YouTubeHelperUI.copySpecificCommand(this)" style="padding:6px 12px; font-size:0.8rem;"><span class="material-symbols-rounded" style="margin-right:6px; font-size: 14px;">content_copy</span> Copy Video Command</button>
                                        <button class="liquid-btn copy-cmd-btn" data-cmd="${cmds.audio.replace(/"/g, "&quot;")}" onclick="YouTubeHelperUI.copySpecificCommand(this)" style="padding:6px 12px; font-size:0.8rem;"><span class="material-symbols-rounded" style="margin-right:6px; font-size: 14px;">music_note</span> Copy Audio Command</button>
                                    </div>
                                </div>
                            </div>
                        </div>`;
            }

            document.getElementById("ytMetadataContent").innerHTML =
              htmlContent;
            resultEl.style.display = "none";
            /* window.lucide disabled */
          } catch (e) {
            resultEl.innerHTML = `<div style="padding:15px; color:var(--danger);">Error: ${e.message}</div>`;
          }
        },
        copySpecificCommand(btn) {
          const text = btn.getAttribute("data-cmd");
          if (text) {
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard
                .writeText(text)
                .then(() => {
                  UI.showSuccess(btn, "Copied!");
                })
                .catch(() => {
                  this.copyToClipboardFallback(text);
                  UI.showSuccess(btn, "Copied!");
                });
            } else {
              this.copyToClipboardFallback(text);
              UI.showSuccess(btn, "Copied!");
            }
          }
        },
        copyToClipboardFallback(text) {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.top = "-9999px";
          textArea.style.left = "-9999px";
          textArea.style.width = "2em";
          textArea.style.height = "2em";
          textArea.style.padding = "0";
          textArea.style.border = "none";
          textArea.style.outline = "none";
          textArea.style.boxShadow = "none";
          textArea.style.background = "transparent";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand("copy");
          } catch (err) {}
          document.body.removeChild(textArea);
        },
      };

      window.CURRENT_APP_VERSION = "v1.1";

      // Initialize All Tools
      Object.values(Tools).forEach((tool) => {
        if (tool.init) tool.init();
      });

      UI.initTheme();
      Core.AppState.restoreInputs();
      UI.showHome();

      

      

      // Command Palette Listeners
      document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          const overlay = document.getElementById("commandPaletteOverlay");
          if (overlay.classList.contains("active")) {
            UI.closeCommandPalette();
          } else {
            UI.openCommandPalette();
          }
        } else {
          UI.handlePaletteKeyDown(e);
        }
      });

      document
        .getElementById("commandPaletteInput")
        .addEventListener("input", (e) => {
          UI.filterCommandPalette(e.target.value);
        });

      // Close on overlay click
      document
        .getElementById("commandPaletteOverlay")
        .addEventListener("click", (e) => {
          if (e.target.id === "commandPaletteOverlay") {
            UI.closeCommandPalette();
          }
        });

      // ================= PRESETS PANEL WIRING =================
      document.getElementById("presetsSaveBtn").addEventListener("click", () => UI.savePreset());
      document.getElementById("presetsCloseBtn").addEventListener("click", () => UI.closePresets());
      document.getElementById("presetsOverlay").addEventListener("click", (e) => {
        if (e.target.id === "presetsOverlay") UI.closePresets();
      });
      document.getElementById("presetsNameInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); UI.savePreset(); }
        if (e.key === "Escape") { e.preventDefault(); UI.closePresets(); }
      });
      document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
          e.preventDefault();
          const overlay = document.getElementById("presetsOverlay");
          if (overlay && overlay.hidden) UI.openPresets();
          else UI.closePresets();
        }
        if (e.key === "Escape") {
          const overlay = document.getElementById("presetsOverlay");
          if (overlay && !overlay.hidden) {
            e.preventDefault();
            UI.closePresets();
          }
        }
      });

      // ================= TAB ARROW-KEY NAVIGATION =================
      document.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const tab = e.target.closest && e.target.closest('[role="tab"]');
        if (!tab) return;
        e.preventDefault();
        const tablist = tab.closest('[role="tablist"]');
        if (!tablist) return;
        const tabs = Array.prototype.slice.call(
          tablist.querySelectorAll('[role="tab"]'),
        );
        const idx = tabs.indexOf(tab);
        if (idx === -1) return;
        const next =
          e.key === "ArrowRight"
            ? tabs[(idx + 1) % tabs.length]
            : tabs[(idx - 1 + tabs.length) % tabs.length];
        if (!next) return;
        next.focus();
        const targetId = next.getAttribute("aria-controls");
        if (targetId && next.onclick) next.onclick();
        else if (targetId) next.click();
      });

      // ================= ORIGIN BUTTON EFFECT (VANILLA JS PORT) =================
      (function () {
        function getCoverDiameter(width, height, x, y) {
          return Math.ceil(
            2 *
              Math.max(
                Math.hypot(x, y),
                Math.hypot(width - x, y),
                Math.hypot(x, height - y),
                Math.hypot(width - x, height - y),
              ),
          );
        }

        function setupOriginButton(btn) {
          if (btn.hasAttribute("data-origin-setup")) return;
          btn.setAttribute("data-origin-setup", "true");
          btn.style.position = "relative";
          btn.style.overflow = "hidden";
          btn.style.zIndex = "1";

          const isLightText = !btn.classList.contains("active-mode");

          btn.style.transition =
            "color 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s, border-color 0.2s";

          let contentWrap = document.createElement("span");
          contentWrap.style.position = "relative";
          contentWrap.style.zIndex = "10";
          contentWrap.style.display = "inline-flex";
          contentWrap.style.alignItems = "center";
          contentWrap.style.justifyContent = "center";
          contentWrap.style.gap = "8px";
          contentWrap.style.pointerEvents = "none";

          while (btn.firstChild) {
            contentWrap.appendChild(btn.firstChild);
          }

          let fillElement = document.createElement("span");
          fillElement.className = "origin-fill";
          fillElement.style.position = "absolute";
          fillElement.style.borderRadius = "50%";

          if (btn.classList.contains("active-mode")) {
            fillElement.style.backgroundColor = "#000000";
          } else if (btn.classList.contains("danger-btn")) {
            fillElement.style.backgroundColor = "#2a0a0a";
          } else {
            fillElement.style.backgroundColor = "#ffffff";
          }

          fillElement.style.pointerEvents = "none";
          fillElement.style.transformOrigin = "center";
          fillElement.style.transform = "translate(-50%, -50%) scale(0)";
          fillElement.style.transition =
            "transform 0.85s cubic-bezier(0.16,1,0.3,1)";
          fillElement.style.zIndex = "0";
          fillElement.style.left = "50%";
          fillElement.style.top = "50%";
          fillElement.style.width = "0px";
          fillElement.style.height = "0px";

          btn.appendChild(fillElement);
          btn.appendChild(contentWrap);

          btn._originState = {
            hovered: false,
            pressed: false,
            fillElement: fillElement,
            contentWrap: contentWrap,
            originalColor: window.getComputedStyle(btn).color,
          };
        }

        function updateFillState(btn) {
          let state = btn._originState;
          let showFill = !btn.disabled && (state.hovered || state.pressed);

          if (showFill) {
            state.fillElement.style.transform = `translate(-50%, -50%) scale(1)`;
            if (btn.classList.contains("active-mode")) {
              btn.style.color = "#ffffff";
            } else if (btn.classList.contains("danger-btn")) {
              btn.style.color = "var(--danger)";
            } else {
              btn.style.color = "#000000";
            }
          } else {
            state.fillElement.style.transform = `translate(-50%, -50%) scale(0)`;
            btn.style.color = ""; // reset
          }
        }

        function updateOriginPosition(btn, clientX, clientY) {
          let rect = btn.getBoundingClientRect();
          let x = clientX - rect.left;
          let y = clientY - rect.top;
          if (clientX === undefined) {
            x = rect.width / 2;
            y = rect.height / 2;
          }

          let coverSize = getCoverDiameter(rect.width, rect.height, x, y);
          let state = btn._originState;

          if (state.fillElement.style.transform.includes("scale(0)")) {
            state.fillElement.style.transition = "none";
            state.fillElement.style.left = x + "px";
            state.fillElement.style.top = y + "px";
            state.fillElement.style.width = coverSize + "px";
            state.fillElement.style.height = coverSize + "px";
            void state.fillElement.offsetWidth; // force reflow
            state.fillElement.style.transition =
              "transform 0.85s cubic-bezier(0.16,1,0.3,1)";
          }
        }

        document.addEventListener("pointerover", (e) => {
          let btn = e.target.closest(".liquid-btn");
          if (!btn || btn.disabled) return;
          setupOriginButton(btn);
          if (!btn._originState) return;

          btn._originState.hovered = true;
          updateOriginPosition(btn, e.clientX, e.clientY);
          updateFillState(btn);
        });

        document.addEventListener("pointerout", (e) => {
          let btn = e.target.closest(".liquid-btn");
          if (!btn || !btn._originState) return;
          if (e.relatedTarget && btn.contains(e.relatedTarget)) return;

          btn._originState.hovered = false;
          btn._originState.pressed = false;
          updateFillState(btn);
        });

        document.addEventListener("pointerdown", (e) => {
          let btn = e.target.closest(".liquid-btn");
          if (!btn || btn.disabled) return;
          setupOriginButton(btn);
          if (!btn._originState) return;

          btn._originState.pressed = true;
          updateOriginPosition(btn, e.clientX, e.clientY);
          updateFillState(btn);
        });

        document.addEventListener("pointerup", (e) => {
          let btn = e.target.closest(".liquid-btn");
          if (!btn || !btn._originState) return;

          btn._originState.pressed = false;
          updateFillState(btn);
        });
      })();

      window.applyThanosSnap = function (elements, duration = 0.6) {
        return new Promise((resolve) => {
          const els = Array.isArray(elements) ? elements : [elements];
          const validEls = els.filter(
            (el) => el && el.dataset.isAnimating !== "true",
          );
          if (validEls.length === 0) {
            resolve();
            return;
          }

          validEls.forEach((el) => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
          resolve();
        });
      };

      if (window.lucide) {
        /* lucide.createIcons */
      }
      window.addEventListener("beforeunload", (e) => {
        if (Core.BlobRegistry.urls.length > 0) e.preventDefault();
      });

      /* Dependency resilience guard (additive, non-destructive).
         If a CDN library failed to load, surface a clear notice with a
         retry that remounts the script rather than silently breaking. */
      (function () {
        function initDependencyGuard() {
          var required = [
            { name: "Lucide Icons", global: "lucide", lib: "lucide" },
            { name: "Image Resizer (Pica)", global: "pica", lib: "pica" },
            { name: "JSZip", global: "JSZip", lib: "jszip" },
            { name: "Excel (SheetJS)", global: "XLSX", lib: "xlsx" },
            { name: "PDF.js", global: "pdfjsLib", lib: "pdfjs" },
          ];
          var missing = required.filter(function (r) {
            return !(r.lib === "lucide"
              ? window.lucide
              : r.lib === "pica"
                ? window.pica
                : r.lib === "jszip"
                  ? window.JSZip
                  : r.lib === "xlsx"
                    ? window.XLSX
                    : r.lib === "pdfjs"
                      ? window.pdfjsLib
                      : null);
          });
          if (missing.length === 0) return;
          if (document.getElementById("cts-dep-guard")) return;

          var box = document.createElement("div");
          box.id = "cts-dep-guard";
          box.setAttribute("role", "alert");
          box.style.cssText =
            "position:fixed;bottom:24px;right:24px;left:24px;max-width:560px;margin:0 auto;" +
            "background:var(--bg-panel,#0b0b0f);border:1px solid var(--danger,#ff5c7c);" +
            "border-left:5px solid var(--danger,#ff5c7c);border-radius:0;padding:18px 20px;" +
            "color:var(--text-main,#ececf3);font:500 .92rem/1.5 Inter,sans-serif;z-index:3000;" +
            "box-shadow:0 24px 60px -12px rgba(0,0,0,.75);display:flex;gap:14px;align-items:flex-start;";

          var text = document.createElement("div");
          text.style.cssText = "flex:1;min-width:0;";
          var head = document.createElement("div");
          head.style.cssText = "font-weight:600;margin-bottom:4px;";
          head.textContent = "A required component did not load";
          var body = document.createElement("div");
          body.style.cssText = "color:var(--text-muted,#9a9ab2);";
          body.textContent =
            "Missing: " + missing.map(function (m) { return m.name; }).join(", ") +
            ". Your connection or a CDN may be unavailable. Retrying may restore full functionality.";

          var actions = document.createElement("div");
          actions.style.cssText = "display:flex;gap:8px;flex-shrink:0;align-items:center;";
          var retry = document.createElement("button");
          retry.type = "button";
          retry.textContent = "Retry";
          retry.style.cssText =
            "background:var(--danger,#ff5c7c);border:none;color:#fff;font-weight:600;" +
            "border-radius:0;padding:8px 14px;cursor:pointer;font:600 .9rem Inter,sans-serif;";
          retry.addEventListener("click", function () {
            var table = {
              lucide: "https://unpkg.com/lucide@latest",
              pica: "https://cdnjs.cloudflare.com/ajax/libs/pica/9.0.1/pica.min.js",
              jszip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
              xlsx: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
              pdfjs: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
            };
            var remaining = required.filter(function (r) { return !(r.lib === "lucide" ? window.lucide : r.lib === "pica" ? window.pica : r.lib === "jszip" ? window.JSZip : r.lib === "xlsx" ? window.XLSX : window.pdfjsLib); });
            remaining.forEach(function (r) {
              var s = document.createElement("script");
              s.src = table[r.lib];
              s.async = true;
              document.head.appendChild(s);
            });
            box.remove();
            setTimeout(initDependencyGuard, 2500);
          });
          var close = document.createElement("button");
          close.type = "button";
          close.setAttribute("aria-label", "Dismiss");
          close.textContent = "Dismiss";
          close.style.cssText =
            "background:transparent;border:1px solid var(--border-strong,#2c2c36);color:var(--text-muted,#9a9ab2);" +
            "border-radius:0;padding:8px 12px;cursor:pointer;font:600 .9rem Inter,sans-serif;";
          close.addEventListener("click", function () { box.remove(); });

          actions.appendChild(retry);
          actions.appendChild(close);
          text.appendChild(head);
          text.appendChild(body);
          box.appendChild(text);
          box.appendChild(actions);
          document.body.appendChild(box);
        }

        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", initDependencyGuard);
        } else {
          initDependencyGuard();
        }
      })();
    