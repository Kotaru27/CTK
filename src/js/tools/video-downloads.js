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
    