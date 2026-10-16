/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
        AdLinkGen: {
          base: {
            aldi: "https://aldimediaeu.blob.core.windows.net/aldimediaeu/",
            s3: "https://s3media-ml-eu.surveycenter.com/",
          },
          normFolder(v) {
            return String(v || "").trim().replace(/\s+/g,"/").replace(/\/+/g,"/").replace(/^\/|\/$/g,"") + "/";
          },
          encodePath(folder) {
            const parts = String(folder).split("/").filter(Boolean);
            if (parts.some(x=>x === "." || x === ".." || /[\u0000-\u001f]/.test(x))) throw Error("Folder contains an invalid path segment");
            return parts.map(encodeURIComponent).join("/") + (parts.length ? "/" : "");
          },
          validateName(name) {
            const cleaned = String(name).trim();
            // Filenames, never arbitrary URLs or additional directory traversal.
            if (!cleaned || /[\/\\\u0000-\u001f]/.test(cleaned) || cleaned === "." || cleaned === "..") return null;
            const ext = cleaned.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
            if (!["jpg","jpeg","png","mp4","mp3"].includes(ext)) return null;
            return {cleaned,ext};
          },
          htmlAttr(value) {
            return String(value).replace(/&/g,"&amp;").replace(/"/g,"&quot;")
              .replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/'/g,"&#39;");
          },
          generate() {
            const server = document.getElementById("alg-server").value;
            const root = this.base[server];
            const adsOut = document.getElementById("alg-out-ads");
            const storyOut = document.getElementById("alg-out-story");
            if (!root) {adsOut.value = storyOut.value = ""; UI.showError?.("Unknown storage server");return;}
            const modeNew = !!document.getElementById("alg-mode-toggle")?.checked;
            let folder;
            try {folder=this.encodePath(this.normFolder(document.getElementById("alg-folder").value));}
            catch(e) {adsOut.value=storyOut.value="";UI.showError?.(e.message);return;}
            const lines = document.getElementById("alg-input").value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
            let ads = [], story = [], skipped = [];
            for (const line of lines) {
              const name = this.validateName(line);
              if (!name) {skipped.push(line);continue;}
              const url = root + folder + encodeURIComponent(name.cleaned);
              const safe = this.htmlAttr(url);
              if (["jpg","jpeg","png"].includes(name.ext)) {
                ads.push(`<img src="${safe}" class="zoomImage" style="max-width:80%">`);
                story.push(`<img src="${safe}" class="zoomImage" style="max-height:280px">`);
              } else if (name.ext === "mp4") {
                ads.push(modeNew ? url.replace(/^https:/,"").replace(/\.mp4$/i,"") : url);
                const poster = root + folder + encodeURIComponent(name.cleaned.replace(/\.mp4$/i,".jpg"));
                story.push(`<img src="${this.htmlAttr(poster)}" class="zoomImage" style="max-height:280px">`);
              } else if (name.ext === "mp3") {
                ads.push(url);
                story.push(name.cleaned); // textarea output only
              }
            }
            adsOut.value = ads.join("\n");
            storyOut.value = story.join("\n");
            if (skipped.length) UI.showError?.(`${skipped.length} invalid or unsupported filename(s) were skipped.`);
          },
          copy(id, btn) {
            const el = document.getElementById(id);
            el.select();
            el.setSelectionRange(0, 99999);
            if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(el.value).then(() => UI.showSuccess(btn,"Copied"))
                .catch(() => {el.focus(); el.select();document.execCommand("copy");UI.showSuccess(btn,"Copied");});
            } else {el.focus();el.select();document.execCommand("copy");UI.showSuccess(btn,"Copied");}
          },
        },

};
