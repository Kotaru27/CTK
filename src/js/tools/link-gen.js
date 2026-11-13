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
          // Folder import is filename-only; no file contents or local paths leave the browser.
          sortNamesAscending(names) {
            const collator = new Intl.Collator("en", {numeric:true, sensitivity:"base"});
            return [...names].sort((a,b)=>collator.compare(a,b) || (a < b ? -1 : a > b ? 1 : 0));
          },
          collectFolderNames(files) {
            const names = [];
            let unsupported = 0, nested = 0;
            const items = Array.from(files || []);
            const folderName = (items[0]?.webkitRelativePath || "").split("/")[0] || "Selected folder";
            for (const file of items) {
              const parts = String(file.webkitRelativePath || file.name || "").split("/").filter(Boolean);
              if (parts.length > 2) { nested++; continue; }
              const parsed = this.validateName(file.name);
              if (!parsed) { unsupported++; continue; }
              names.push(parsed.cleaned);
            }
            return { names:this.sortNamesAscending(names), folderName, unsupported, nested };
          },
          browseFolder() {
            document.getElementById("alg-folder-picker")?.click();
          },
          importFolder(event) {
            const picker = event?.target;
            const files = Array.from(picker?.files || []);
            if (picker) picker.value = ""; // Re-selecting the same folder should always work.
            if (!files.length) return; // Cancel must not clear the current filenames.
            const imported = this.collectFolderNames(files);
            const editor = document.getElementById("alg-input");
            if (!editor) return;
            editor.value = imported.names.join("\n");
            const folder = document.getElementById("alg-folder-name");
            if (folder) folder.textContent = imported.folderName;
            const notice = document.getElementById("alg-folder-status");
            if (notice) notice.textContent = imported.names.length+" supported filename(s) imported"+
              (imported.unsupported ? " · "+imported.unsupported+" unsupported skipped" : "")+
              (imported.nested ? " · "+imported.nested+" nested excluded" : "");
            this.updateFolderPreview("imported");
          },
          loadSampleFolder() {
            const sample = this.sortNamesAscending(["Ad_11.mp4","Ad_3.mp4","Ad_10.jpg","Ad_2.jpg","Ad_1.jpg"]);
            const editor = document.getElementById("alg-input");
            if (!editor) return;
            editor.value = sample.join("\n");
            const label = document.getElementById("alg-folder-name");
            if (label) label.textContent = "Sample ads";
            const notice = document.getElementById("alg-folder-status");
            if (notice) notice.textContent = sample.length+" sample filenames sorted in ascending order";
            this.updateFolderPreview("sample");
          },
          updateFolderPreview(source = "manual") {
            const textarea = document.getElementById("alg-input");
            const counter = document.getElementById("alg-folder-count");
            const list = document.getElementById("alg-folder-preview");
            if (!textarea || !list) return;
            const names = textarea.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
            if (counter) counter.textContent = names.length+" filename"+(names.length === 1 ? "" : "s")+
              (source === "imported" || source === "sample" ? " · natural A–Z" : " · editable");
            list.replaceChildren();
            for (let i=0; i<Math.min(10,names.length); i++) {
              const item = document.createElement("li");
              const number = document.createElement("span");
              number.className = "alg-file-no";
              number.textContent = String(i+1).padStart(2,"0");
              const name = document.createElement("span");
              name.className = "alg-file-name";
              name.textContent = names[i]; // Never use a filename as HTML.
              item.append(number,name);
              list.append(item);
            }
            if (names.length > 10) {
              const more = document.createElement("li");
              more.className = "alg-file-more";
              more.textContent = "+"+(names.length-10)+" more filenames";
              list.append(more);
            }
            if (source === "manual") {
              const status = document.getElementById("alg-folder-status");
              if (status) status.textContent = "Manual entry · files are not uploaded";
            }
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
