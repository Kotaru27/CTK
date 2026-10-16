/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
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
