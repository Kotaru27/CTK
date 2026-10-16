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

};
