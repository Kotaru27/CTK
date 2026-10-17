/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
        AdDownloader: {
          workbookData: null,
          allNames: [],
          adTypeMap: {},
          entries: [],
          _downloadBusy: false,
          init() {
            document.getElementById("adDlInput").addEventListener("change", (e) => {
              const file = e.target.files[0];
              document.getElementById("adDlFileNameDisplay").innerText = file ? file.name : "Upload Excel";
              if (file) this.loadExcel();
            });
            const header = document.getElementById("adlinksDlHeaderControls") || document.getElementById("adDlSummaryBar");
            if (header && !document.getElementById("adDlBulkButton")) {
              const btn = document.createElement("button");
              btn.id = "adDlBulkButton";
              btn.type = "button";
              btn.className = "liquid-btn active-mode";
              btn.style.cssText = "height:40px; padding:0 14px;";
              btn.textContent = "Download selected";
              btn.disabled = true;
              btn.onclick = () => this.downloadBulk();
              header.appendChild(btn);
            }
            if (typeof window.showDirectoryPicker === "function" && window.isSecureContext && header && !document.getElementById("adDlRenameFolder")) {
              const folderButton = document.createElement("button");
              folderButton.id = "adDlRenameFolder";
              folderButton.type = "button";
              folderButton.className = "liquid-btn";
              folderButton.textContent = "Auto-name: Choose folder";
              folderButton.title = "Optional: give CTK permission to rename completed SharePoint downloads in Chrome's selected download folder.";
              folderButton.onclick = () => this.chooseRenameFolder();
              header.appendChild(folderButton);
            }
            const bar = document.getElementById("adDlSummaryBar");
            if (bar && !document.getElementById("adDlStatus")) {
              const status = document.createElement("span");
              status.id = "adDlStatus";
              status.setAttribute("role", "status");
              status.setAttribute("aria-live", "polite");
              status.style.cssText = "display:inline-block; margin-left:12px; font-size:12px; line-height:1.5; color:var(--text-muted);";
              bar.appendChild(status);
            }
          },
          status(message, isError = false) {
            const el = document.getElementById("adDlStatus");
            if (el) { el.textContent = message; el.style.color = isError ? "var(--danger, #b64a44)" : "var(--text-muted)"; }
          },
          async chooseRenameFolder() {
            try {
              const chosen = await CTKDownloadRenamer.chooseFolder();
              document.getElementById("adDlRenameFolder").textContent = "Auto-name: " + chosen;
              this.status(`Folder selected: ${chosen}. In Chrome Downloads settings, set this SAME folder as your download location. CTK only renames NEW matching downloads after they finish; unrelated files are untouched.`);
            } catch(error) {
              if (error.name === "AbortError") { this.status("Folder selection cancelled. Native downloads still work."); return; }
              this.status("Folder access unavailable: "+error.message+". Native downloads still work.",true);
            }
          },
          normalize(text) {
            return String(text ?? "").replace(/\s+/g, "").replace(/_/g, "").toUpperCase();
          },
          safeName(text) {
            return String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/ß/g, "ss").replace(/[^a-zA-Z0-9]+/g, "_")
              .replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 160) || "asset";
          },
          safeUrl(url) {
            const text = String(url ?? "").trim();
            if (!/^https?:\/\//i.test(text)) return "";
            try {
              const result = new URL(text);
              return /^https?:$/.test(result.protocol) ? result.href : "";
            } catch { return ""; }
          },
          detectColumns(rows) {
            const names = {no: /^(ad\s*(no|num|number|#)|number|no|id|ad\s*id)$/i,
              link: /^(link|url|asset\s*(link|url)|download\s*(link|url)|media\s*(link|url)|hyperlink)$/i,
              type: /^(type|ad\s*type|format|media\s*type|category|creative\s*type)$/i};
            for (let r = 0; r < Math.min(rows.length, 12); r++) {
              const found = {};
              rows[r].forEach((cell, c) => {
                const label = String(cell?.v ?? "").replace(/[_\s]+/g, " ").trim();
                for (const [kind, re] of Object.entries(names)) if (re.test(label)) found[kind] = c;
              });
              if (found.no !== undefined && found.link !== undefined) {
                return {start:r + 1,no:found.no,link:found.link,type:found.type ?? 2,recognized:true};
              }
            }
            return {start:1,no:0,link:1,type:2,recognized:false}; // existing workbook layout
          },
          extensionHint(url, label, type) {
            const allowed = new Set(["mp4","mov","avi","mkv","webm","mp3","wav","ogg","m4a","jpg","jpeg","png","gif","webp","svg","bmp","pdf","zip"]);
            for (const value of [label, (() => { try { return new URL(url).pathname; } catch { return ""; } })()]) {
              const m = String(value).match(/\.([a-z0-9]{2,5})(?:$|[?#])/i);
              if (m && allowed.has(m[1].toLowerCase())) return {ext:"." + m[1].toLowerCase(),confidence:"high"};
            }
            const t = String(type ?? "").toLowerCase().replace(/[_-]+/g," ");
            if (/\b(radio|podcast|audio|sound)\b/.test(t)) return {ext:".mp3",confidence:"inferred"};
            if (/\b(tvc|video|ol[v]|cinema|film|reels|tv)\b/.test(t)) return {ext:".mp4",confidence:"inferred"};
            if (/\b(print|outdoor|ooh|image|photo|static|poster|banner|display)\b/.test(t)) return {ext:".jpg",confidence:"inferred"};
            return {ext:"",confidence:"unknown"};
          },
          loadExcel() {
            const file = document.getElementById("adDlInput").files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onerror = () => this.status("Could not read the spreadsheet.", true);
            reader.onload = (e) => {
              try {
                const data = new Uint8Array(e.target.result);
                this.workbookData = window.XLSX.read(data, {type:"array"});
                this.generateDashboard();
              } catch (error) { this.status("Spreadsheet could not be parsed: " + error.message, true); }
            };
            reader.readAsArrayBuffer(file);
          },
          generateDashboard() {
            if (!this.workbookData?.SheetNames?.length) { this.status("The workbook has no sheets.", true); return; }
            const sheet = this.workbookData.Sheets[this.workbookData.SheetNames[0]];
            if (!sheet?.["!ref"]) { this.status("The first sheet is empty.", true); return; }
            const range = XLSX.utils.decode_range(sheet["!ref"]);
            const rows = [];
            for (let r = range.s.r; r <= range.e.r; r++) {
              const cells = [];
              for (let c = 0; c <= range.e.c; c++) cells.push(sheet[XLSX.utils.encode_cell({r,c})] || null);
              rows.push(cells);
            }
            const columns = this.detectColumns(rows);
            const body = document.getElementById("adDlTableBody");
            const downloadedBody = document.getElementById("adDlDownloadedBody");
            const downloadedHead = document.getElementById("adDlDownloadedHeaderRow");
            body.replaceChildren();
            Array.from(downloadedBody.children).filter(el => el !== downloadedHead).forEach(el => el.remove());
            downloadedHead.style.display = "none";
            const statusCell=downloadedHead.querySelector("td");
            if (statusCell) statusCell.textContent="Download started";
            this.entries = []; this.allNames = []; this.adTypeMap = {};
            const seen = new Set();
            let skipped = 0, inferred = 0;
            const fragment = document.createDocumentFragment();
            for (let r = columns.start; r < rows.length; r++) {
              const line = rows[r];
              const no = String(line[columns.no]?.v ?? "").trim();
              const linkCell = line[columns.link];
              const type = String(line[columns.type]?.v ?? "").trim();
              const raw = String(linkCell?.l?.Target || linkCell?.v || "").trim();
              const url = this.safeUrl(raw);
              if (!no && !raw && !type) continue;
              if (!no || !url) { skipped++; continue; }
              const label = String(linkCell?.v || "").trim() || (() => { try {return decodeURIComponent(new URL(url).pathname.split("/").pop());} catch {return "asset";} })();
              const hint = this.extensionHint(url, label, type);
              if (hint.confidence === "inferred") inferred++;
              const stem = label.replace(/\.(mp4|mov|avi|mkv|webm|mp3|wav|ogg|m4a|jpg|jpeg|png|gif|webp|svg|bmp|pdf|zip)$/i, "");
              const typeNumber = type.match(/\d+/)?.[0] || "";
              const typeBase = this.safeName(type.replace(/\d+/g, ""));
              let clean = this.safeName(stem);
              if (typeNumber && typeBase !== "asset") clean = clean.replace(new RegExp(typeBase + "(?!\d)","i"),typeBase + typeNumber);
              const base = `AD${this.safeName(no)}_${clean}`;
              let name = base, counter = 2;
              while (seen.has(name.toLowerCase())) name = `${base}_${counter++}`;
              seen.add(name.toLowerCase());
              const entry = {no,url,type,displayName:name,ext:hint.ext,confidence:hint.confidence,selected:true,downloaded:false};
              this.entries.push(entry);
              this.allNames.push(name);
              this.adTypeMap[this.normalize(type)] = no;
              const tr = document.createElement("tr");
              tr.id = `adDl-row-${this.entries.length}`;
              const numCell = document.createElement("td");
              const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = true;
              cb.setAttribute("aria-label",`Include ${name} in ZIP`);
              cb.style.marginRight = "9px";
              cb.onchange = () => { entry.selected = cb.checked; this.updateBulkButton(); };
              numCell.append(cb,document.createTextNode(no));
              const nameCell = document.createElement("td");
              nameCell.textContent = name + (hint.ext || "");
              if (hint.confidence === "inferred") nameCell.title = "Extension inferred from media category; actual downloaded file type is checked";
              if (hint.confidence === "unknown") nameCell.title = "File extension will be detected from the downloaded response";
              const actions = document.createElement("td"); actions.style.textAlign = "right";
              const copy = document.createElement("button"); copy.type = "button"; copy.className = "liquid-btn";
              copy.textContent = "Copy"; copy.onclick = () => this.copySingleName(name);
              const download = document.createElement("button"); download.type = "button";
              download.className = "liquid-btn active-mode";
              download.textContent = "Download"; download.onclick = () => this.downloadFile(entry);
              actions.append(copy," ",download);
              tr.append(numCell,nameCell,actions); entry.row = tr; entry.downloadButton = download;
              fragment.appendChild(tr);
            }
            body.appendChild(fragment);
            document.getElementById("adDlTableContainer").style.display = "block";
            document.getElementById("adDlSummaryBar").style.display = "block";
            document.getElementById("adDlCountText").innerText = `${this.entries.length} valid ads`;
            document.getElementById("adDlEmptyState").style.display = "none";
            this.updateBulkButton();
            this.status(`${this.entries.length} ready · ${skipped} invalid rows skipped · ${inferred} extensions inferred.${this.entries.some(e=>CTKSharePoint.isSharePoint(e.url)) ? ' SharePoint uses native downloads; click Auto-name: Choose folder for optional renamed files.' : ''}`);
          },
          updateBulkButton() {
            const btn = document.getElementById("adDlBulkButton");
            if (btn) btn.disabled = this._downloadBusy || !this.entries.some(entry => entry.selected && !entry.downloaded);
          },
          guessType(blob, hint, signature=[]) {
            // Use the actual MIME where possible; do not trust guessed spreadsheet categories.
            const mime = String(blob.type || "").split(";")[0].toLowerCase();
            const types = {"video/mp4":"mp4","video/webm":"webm","video/quicktime":"mov","audio/mpeg":"mp3","audio/mp4":"m4a","audio/wav":"wav","image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","image/svg+xml":"svg","application/pdf":"pdf","application/zip":"zip"};
            // Content sniffing is safer than a category-based extension guess.
            // Reject SharePoint player/login pages even when servers label them binary.
            const sniff=new TextDecoder().decode(new Uint8Array(signature).slice(0,200)).trimStart().toLowerCase();
            if (/^(?:<!doctype html|<html\b|\{\s*"(?:error|code)"\s*:)/.test(sniff) || mime === "text/html" || mime === "application/json")
              throw Error("The source returned a web page (HTML preview/login) instead of the media file.");
            const ascii=(a,b)=>String.fromCharCode(...Array.from(signature).slice(a,b));
            if(ascii(0,4)==="%PDF")return ".pdf";
            if(signature[0]===0x89&&ascii(1,4)==="PNG")return ".png";
            if(signature[0]===0xff&&signature[1]===0xd8&&signature[2]===0xff)return ".jpg";
            if(ascii(0,3)==="GIF")return ".gif";
            if(ascii(0,4)==="RIFF"&&ascii(8,12)==="WEBP")return ".webp";
            if(ascii(0,4)==="RIFF"&&ascii(8,12)==="WAVE")return ".wav";
            if(ascii(4,8)==="ftyp")return ".mp4";
            if(ascii(0,3)==="ID3")return ".mp3";
            if(signature[0]===0x50&&signature[1]===0x4b&&signature[2]===0x03&&signature[3]===0x04)return ".zip";
            if (types[mime]) return "." + types[mime];

            if (hint.confidence === "high") return hint.ext;
            if (hint.confidence === "inferred" && mime.startsWith("audio/") && hint.ext === ".mp3") return hint.ext;
            if (hint.confidence === "inferred" && mime.startsWith("video/") && hint.ext === ".mp4") return hint.ext;
            if (hint.confidence === "inferred" && mime.startsWith("image/") && hint.ext === ".jpg") return hint.ext;
            return ".bin";
          },
          async getAsset(entry, signal) {
            if (CTKSharePoint.isSharePoint(entry.url)) {
              throw Error("Protected SharePoint files cannot be read into a browser ZIP without cross-origin access. Use the individual native Download button.");
            }
            const response = await fetch(entry.url, {mode:"cors", credentials:"omit", redirect:"follow", signal});
            if (!response.ok) throw Error(`HTTP ${response.status}`);
            const size = Number(response.headers.get("content-length")) || 0;
            if (size > 350 * 1024 * 1024) throw Error("File exceeds 350 MB browser memory safety limit");
            let blob;
            if (response.body?.getReader) {
              // Prevent unbounded allocations even when the server omits Content-Length.
              const reader=response.body.getReader(), chunks=[];
              let bytes=0;
              try {
                while (true) {
                  const {done,value}=await reader.read();
                  if (done) break;
                  bytes+=value.byteLength;
                  if (bytes>350*1024*1024) {await reader.cancel();throw Error("File exceeds 350 MB browser memory safety limit");}
                  chunks.push(value);
                }
              } finally {reader.releaseLock();}
              blob=new Blob(chunks,{type:response.headers.get("content-type")||"application/octet-stream"});
            } else {blob=await response.blob();}
            if (!blob.size) throw Error("Empty download");
            if (blob.size > 350 * 1024 * 1024) throw Error("File exceeds 350 MB browser memory safety limit");
            const bytes=new Uint8Array(await blob.slice(0,256).arrayBuffer());
            const ext=this.guessType(blob,entry,bytes);
            return {blob, name:entry.displayName + ext};
          },
          saveBlob(blob, name) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = name;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          },
          markDownloaded(entry) {
            entry.downloaded = true;
            if (entry.row) {
              entry.row.classList.add("downloaded");
              entry.row.style.opacity = "0.65";
              document.getElementById("adDlDownloadedHeaderRow").style.display = "table-row";
              document.getElementById("adDlDownloadedBody").appendChild(entry.row);
            }
            this.updateBulkButton();
          },
          downloadSharePoint(entry) {
            const target = CTKSharePoint.directUrl(entry.url);
            if (!target) throw Error('This SharePoint link does not contain a file path. A direct file link or a stream.aspx?id= file path is required.');
            // Same-tab navigation uses the user's existing SharePoint sign-in.
            // An attachment response downloads; an unauthorized/error response may navigate away.
            // No popup, extension, Graph token or CORS fetch is used.
            const renamer = typeof CTKDownloadRenamer !== 'undefined' ? CTKDownloadRenamer : null;
            // The tracking starts synchronously from the same user gesture, preserving the
            // native download's trusted click. The chosen folder is never uploaded.
            entry.renameStatus = (message,isError=false) => this.status(message,isError);
            const tracking = !!(renamer?.active() && renamer.begin(entry));
            const a = document.createElement('a');
            a.href = target;
            a.target = '_self';
            a.rel = 'noreferrer';
            document.body.appendChild(a);
            try { a.click(); }
            catch(error) { if(tracking)renamer.cancel(entry); throw error; }
            finally { a.remove(); }
            // Do not claim an unobservable cross-origin download completed.
            if (entry.downloadButton) entry.downloadButton.textContent = 'Download again';
            this.status(tracking
              ? `SharePoint download requested. Waiting to rename ${entry.displayName} after it appears in your selected folder.`
              : `SharePoint download requested for ${entry.displayName}. Select Auto-name: Choose folder to rename future downloads; otherwise Chrome uses SharePoint's filename. Download completion cannot be confirmed here.`);
          },
          async downloadFile(entry) {
            if (entry.downloaded || entry.inProgress) return;
            if (CTKSharePoint.isSharePoint(entry.url)) {
              try { this.downloadSharePoint(entry); }
              catch (error) { this.status(`${entry.displayName}: ${error.message}`,true); }
              return;
            }
            entry.inProgress = true;
            if (entry.downloadButton) entry.downloadButton.disabled = true;
            this.status(`Preparing ${entry.displayName}...`);
            try {
              const {blob,name}=await this.getAsset(entry);
              this.saveBlob(blob,name);
              this.markDownloaded(entry);
              this.status(`Download requested: ${name} (${(blob.size/1048576).toFixed(1)} MB).`);
            } catch(error) {
              const message=/Failed to fetch|CORS|NetworkError/i.test(error.message)
                ? 'The host blocks cross-origin media access. The provider must supply a downloadable endpoint or permit CORS for custom naming.'
                : error.message;
              this.status(`${entry.displayName}: ${message}`,true);
              if (entry.downloadButton) entry.downloadButton.disabled=false;
            } finally {entry.inProgress=false;}
          },
          async downloadBulk() {
            if (this._downloadBusy) return;
            const selection = this.entries.filter(entry=>entry.selected && !entry.downloaded);
            if (!selection.length) return;
            if (selection.some(entry => CTKSharePoint.isSharePoint(entry.url))) {
              this.status("SharePoint cannot be added to a client-side ZIP from GitHub Pages. Download SharePoint files individually with their native Download buttons. Other CORS-enabled files can still be zipped.",true);
              return;
            }
            if (selection.length > 250) { this.status("Select at most 250 files per batch.",true); return; }
            if (typeof JSZip === "undefined") { this.status("ZIP library did not load.",true); return; }
            this._downloadBusy = true; this.updateBulkButton();
            const zip = new JSZip(); const successes = [], failures = [];
            let index = 0, totalBytes = 0, stopped = false;
            const worker = async () => {
              while (!stopped && index < selection.length) {
                const entry = selection[index++];
                try {
                  const {blob,name} = await this.getAsset(entry);
                  totalBytes += blob.size;
                  if (totalBytes > 350 * 1024 * 1024) { stopped = true; throw Error("ZIP exceeds 350 MB safety limit"); }
                  zip.file(name,blob); successes.push(entry);
                } catch (error) { failures.push({name:entry.displayName,reason:error.message}); }
                this.status(`${successes.length + failures.length}/${selection.length} checked · ${successes.length} ready · ${failures.length} failed`);
              }
            };
            try {
              await Promise.all(Array.from({length:Math.min(3,selection.length)},worker));
              if (!successes.length) {
                this.status(`No ZIP assets accessible (${failures.length} blocked or invalid links). Other hosts must allow cross-origin access.`,true);
                return;
              }
              this.status(`Creating ZIP for ${successes.length} assets...`);
              const blob = await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:2}});
              this.saveBlob(blob, "ad_assets.zip");
              successes.forEach(entry=>this.markDownloaded(entry));
              const first = failures.slice(0,3).map(x=>`${x.name}: ${x.reason}`).join("; ");
              this.status(`ZIP download requested for ${successes.length} files, ${failures.length} failed.${failures.length?" "+first:""}`,!!failures.length);
            } catch (error) { this.status(`ZIP failed: ${error.message}`,true); }
            finally {this._downloadBusy=false;this.updateBulkButton();}
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
          // Legacy inline-handler compatibility: no popup is opened.
          downloadPopup(url, adNo, finalName) {
            const entry = this.entries.find(item => item.url === this.safeUrl(url) && item.no === String(adNo));
            if (entry) return this.downloadFile(entry);
            this.status("Please reimport the spreadsheet before downloading.",true);
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
