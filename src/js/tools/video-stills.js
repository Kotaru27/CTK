/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
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
            const controls = document.getElementById("videoHeaderControls");
            if (controls && !document.getElementById("stillsSmartMode")) {
              const label = document.createElement("label");
              label.style.cssText = "display:inline-flex; gap:7px; align-items:center; font-size:12px; cursor:pointer; white-space:nowrap;";
              label.title = "Optional: sample content and discard near-duplicate, blank or likely blurry frames. Normal extraction remains unchanged when off.";
              const toggle = document.createElement("input"); toggle.type="checkbox"; toggle.id="stillsSmartMode";
              label.append(toggle,document.createTextNode("Smart frame selection"));
              controls.appendChild(label);
            }
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
            this._generation = (this._generation || 0) + 1;
            this.queue = [];
            this.closeDetail();
            Core.BlobRegistry.revokeOwner("stills");
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
          frameFingerprint(video, scratch) {
            const ctx = scratch.getContext("2d",{willReadFrequently:true});
            ctx.drawImage(video,0,0,scratch.width,scratch.height);
            const pixels = ctx.getImageData(0,0,scratch.width,scratch.height).data;
            const values = new Float32Array(scratch.width*scratch.height);
            let sum=0, square=0, edge=0;
            for(let i=0;i<values.length;i++) {
              const at=i*4;
              const lum=(0.2126*pixels[at]+0.7152*pixels[at+1]+0.0722*pixels[at+2])/255;
              values[i]=lum; sum+=lum; square+=lum*lum;
              if(i%scratch.width) edge+=Math.abs(lum-values[i-1]);
              if(i>=scratch.width) edge+=Math.abs(lum-values[i-scratch.width]);
            }
            const avg=sum/values.length;
            const variance=Math.max(0,square/values.length-avg*avg);
            const texture=edge/(values.length*2);
            return {values, avg, variance, texture, quality:variance*0.45+texture*0.55};
          },
          acceptFrame(sample, previous) {
            if(sample.avg<0.025 || sample.avg>0.975 || sample.variance<0.0004) return false;
            if(sample.texture<0.008 && sample.variance<0.012) return false;
            if(!previous) return true;
            let diff=0;
            for(let i=0;i<sample.values.length;i++) diff+=Math.abs(sample.values[i]-previous.values[i]);
            return diff/sample.values.length >= 0.045;
          },
          async process() {
            if (this._processing || !this.queue.length) return;
            this._processing = true;
            const generation = this._generation || 0;
            try {
            UI.toggleEmptyState(this.els.stacks, false);

            const genAllStills = this.els.xlBtn ? this.els.xlBtn.checked : true;
            const smartMode = !!document.getElementById("stillsSmartMode")?.checked;
            const genStory = this.els.storyBtn ? this.els.storyBtn.checked : false;
            const storyFramesCount = this.els.storyGrid ? parseInt(this.els.storyGrid.value, 10) : 4;

            while (this.queue.length && generation === (this._generation || 0)) {
              const file = this.queue.shift();
              let sourceUrl;
              let vid;
              try {
                const name = file.name
                  .replace(/\.[^/.]+$/, "")
                  .replace(/\s+/g, "_");
                vid = document.createElement("video");
                vid.muted = true;
                sourceUrl = Core.BlobRegistry.create(file, "stills-temp");
                await this.loadMetadata(vid, sourceUrl);
                if (generation !== (this._generation || 0)) break;
                if (!Number.isFinite(vid.duration) || vid.duration < 1.0) {
                  UI.showError("Storyboard cannot be generated, file too small.");
                  continue;
                }

                const id = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                this.collection[id] = { name: name, frames: [] };
                await this.seekVideo(vid, 0.5);
                if (generation !== (this._generation || 0)) break;

                const stack = document.createElement("div");
                stack.className = "pdf-stack-wrapper";
                stack.innerHTML = `<img src=""><div class="stack-meta"><div class="stack-title">${name}</div><div class="stack-count">Processing...</div></div>`;
                stack.onclick = () => this.openDetail(id);
                this.els.stacks.appendChild(stack);

                // Smart mode caps the candidate scan; uniform mode uses the original cadence.
                const totalFramesToExtract = smartMode ? Math.min(Math.floor(vid.duration) || 1,180) : (Math.floor(vid.duration) || 1);
                const interval = vid.duration / (totalFramesToExtract + 1);
                let previewDataUrl = null;
                let lastAccepted = null, bestCandidate = null, bestQuality = -1, kept = 0, skipped = 0;
                const sampleCanvas = smartMode ? document.createElement("canvas") : null;
                if (sampleCanvas) {sampleCanvas.width = 48; sampleCanvas.height = 27;}
                const fallbackCanvas = smartMode ? document.createElement("canvas") : null;
                const frameCanvas = document.createElement("canvas");
                frameCanvas.width = vid.videoWidth;
                frameCanvas.height = vid.videoHeight;
                const frameCtx = frameCanvas.getContext("2d");

                for (let f = 1; f <= totalFramesToExtract; f++) {
                  await new Promise((resolve) => setTimeout(resolve, 0));
                  await this.seekVideo(vid, f * interval);
                  if (generation !== (this._generation || 0)) break;
                  frameCtx.drawImage(vid, 0, 0);
                  if (smartMode) {
                    const sample = this.frameFingerprint(vid, sampleCanvas);
                    if (sample.quality > bestQuality) {
                      bestQuality=sample.quality; bestCandidate=f;
                      fallbackCanvas.width=frameCanvas.width;
                      fallbackCanvas.height=frameCanvas.height;
                      fallbackCanvas.getContext("2d").drawImage(frameCanvas,0,0);
                    }
                    if (!this.acceptFrame(sample,lastAccepted)) {skipped++;continue;}
                    lastAccepted=sample;
                  }
                  kept++;
                  if (!genAllStills && !previewDataUrl) {
                    previewDataUrl = frameCanvas.toDataURL("image/jpeg", 0.5);
                    stack.querySelector("img").src = previewDataUrl;
                  }

                  if (genAllStills) {
                    const blob = await new Promise((r) =>
                      frameCanvas.toBlob(r, "image/jpeg", 0.9),
                    );
                    if (!blob) throw new Error("Could not encode video frame");
                    if (generation !== (this._generation || 0)) break;
                    const url = Core.BlobRegistry.create(blob, "stills");
                    if (!previewDataUrl) {
                      previewDataUrl = url;
                      stack.querySelector("img").src = url;
                    }
                    this.collection[id].frames.push({
                      num: f,
                      type: "still",
                      blob,
                      url,
                      checked: true,
                    });
                  }
                }

                if (generation !== (this._generation || 0)) break;
                // All candidates can be black/duplicate. Preserve one best candidate
                // rather than reporting success with an empty collection.
                if (smartMode && kept === 0 && bestCandidate !== null) {
                  if (genAllStills) {
                    const blob = await new Promise(r=>fallbackCanvas.toBlob(r,"image/jpeg",0.9));
                    if (!blob) throw Error("Could not encode fallback frame");
                    if (generation !== (this._generation || 0)) break;
                    const url=Core.BlobRegistry.create(blob,"stills");
                    this.collection[id].frames.push({num:bestCandidate,type:"still",blob,url,checked:true});
                    stack.querySelector("img").src=url;
                  } else { stack.querySelector("img").src=fallbackCanvas.toDataURL("image/jpeg",0.5); }
                  kept=1;
                }
                if (generation !== (this._generation || 0)) break;
                if (genStory) {
                  const storyInterval = vid.duration / (storyFramesCount + 1);

                  let storyThumbs = [];
                  for (let f = 1; f <= storyFramesCount; f++) {
                    await this.seekVideo(vid, f * storyInterval);
                    if (generation !== (this._generation || 0)) break;
                    const tc = document.createElement("canvas");
                    tc.width = vid.videoWidth;
                    tc.height = vid.videoHeight;
                    tc.getContext("2d").drawImage(vid, 0, 0);
                    storyThumbs.push(tc);
                  }

                  if (generation !== (this._generation || 0)) break;
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
                  if (!compositeBlob) throw new Error("Could not encode storyboard");
                  if (generation !== (this._generation || 0)) break;
                  const compUrl = Core.BlobRegistry.create(compositeBlob, "stills");
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

                stack.querySelector(".stack-count").innerText = smartMode
                  ? `${this.collection[id].frames.length} Items · ${skipped} skipped`
                  : `${this.collection[id].frames.length} Items`;
              } catch (e) {
                if (generation === (this._generation || 0)) {
                  console.error(e);
                  UI.showError(`Could not extract video stills: ${e.message}`);
                }
              } finally {
                if (vid) { vid.pause(); vid.removeAttribute("src"); vid.load(); }
                if (sourceUrl) Core.BlobRegistry.release(sourceUrl);
              }
            }
            } finally {
              this._processing = false;
              this.els.dlBtn.disabled = !Object.values(this.collection).some(v => v.frames.length);
              if (this.queue.length) this.process();
            }
          },
          loadMetadata(video, url) {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => finish(new Error("Video metadata timed out")), 15000);
              const finish = (err) => {
                clearTimeout(timeout);
                video.removeEventListener("loadedmetadata", onLoaded);
                video.removeEventListener("error", onError);
                err ? reject(err) : resolve();
              };
              const onLoaded = () => finish();
              const onError = () => finish(new Error("Video could not be decoded"));
              video.addEventListener("loadedmetadata", onLoaded, { once: true });
              video.addEventListener("error", onError, { once: true });
              video.src = url;
            });
          },
          seekVideo(video, time) {
            return new Promise((resolve, reject) => {
              const target = Math.min(Math.max(time, 0), video.duration);
              if (Math.abs(video.currentTime - target) < 0.000001 && video.readyState >= 2) return resolve();
              const timeout = setTimeout(() => finish(new Error("Video seek timed out")), 15000);
              const finish = (err) => {
                clearTimeout(timeout);
                video.removeEventListener("seeked", onSeeked);
                video.removeEventListener("error", onError);
                err ? reject(err) : resolve();
              };
              const onSeeked = () => finish();
              const onError = () => finish(new Error("Video seek failed"));
              video.addEventListener("seeked", onSeeked, { once: true });
              video.addEventListener("error", onError, { once: true });
              try { video.currentTime = target; } catch (err) { finish(err); }
            });
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
              img.src = Core.BlobRegistry.create(f.blob, "story");
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

};
