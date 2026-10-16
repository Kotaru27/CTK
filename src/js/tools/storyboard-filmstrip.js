/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
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
          validImage(img) {
            return img && (img.naturalWidth || img.width)>0 && (img.naturalHeight || img.height)>0;
          },
          async loadSource(file) {
            if (!file || file.size > 100*1024*1024) throw Error("File too large or invalid");
            if(file.type.startsWith("image/")) {
              const url=Core.BlobRegistry.create(file,"filmstrip");
              const img=new Image();
              try {
                await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error("Image could not be decoded"));img.src=url;});
                if(!this.validImage(img))throw Error("Image dimensions unavailable");
                return {img,owned:true};
              }catch(error){Core.BlobRegistry.release(url);throw error;}
            }
            if(file.type.startsWith("video/")) {
              const img=await new Promise((resolve,reject)=> {
                const video=document.createElement("video");
                const url=URL.createObjectURL(file);
                let done=false;const timer=setTimeout(()=>finish(null),15000);
                const finish=(image)=>{
                  if(done)return;done=true;clearTimeout(timer);
                  video.pause();video.removeAttribute("src");video.load();URL.revokeObjectURL(url);
                  image?resolve(image):reject(Error("Video frame could not be extracted"));
                };
                video.muted=true;
                video.onerror=()=>finish(null);
                video.onloadedmetadata=()=>{
                  if(!video.videoWidth || !video.videoHeight || !Number.isFinite(video.duration))return finish(null);
                  try{video.currentTime=Math.min(1,video.duration/2);}catch{finish(null);}
                };
                video.onseeked=()=> {
                  try{
                    const c=document.createElement("canvas");c.width=video.videoWidth;c.height=video.videoHeight;
                    c.getContext("2d").drawImage(video,0,0);
                    const image=new Image();image.onload=()=>finish(image);image.onerror=()=>finish(null);
                    image.src=c.toDataURL("image/jpeg",0.95);
                  }catch{finish(null);}
                };
                video.src=url;
              });
              if(!this.validImage(img)) throw Error("Video frame dimensions unavailable");
              return {img,owned:false};
            }
            throw Error("Unsupported format");
          },
          async handleFiles(files) {
            const valid=files.filter(f=>f.type.startsWith("image/") || f.type.startsWith("video/"));
            valid.sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{numeric:true,sensitivity:"base"}));
            let failed=0;
            const results=await Promise.allSettled(valid.map(file=>this.loadSource(file)));
            results.forEach((result,i)=>{
              if(result.status==="fulfilled") {
                this.images.push({id:`fs-${Date.now()}-${Math.random()}`,name:valid[i].name,...result.value});
              }else {failed++;console.warn("Filmstrip rejected:",valid[i].name,result.reason);}
            });
            if(failed)UI.showError(`${failed} invalid or unreadable filmstrip assets skipped.`);
            this.sortImagesAscending();this.updateList();this.draw();
          },
          async addFromStills(stills) {
            if(!stills?.length)return;
            let failed=0;
            const results=await Promise.allSettled(stills.map((still,idx)=>new Promise((resolve,reject)=>{
              const img=new Image();
              img.onload=()=>this.validImage(img)?resolve({
                id:`fs-${Date.now()}-${Math.random()}`,
                name:still.name||`Still_${still.num??idx+1}`,img,owned:false
              }):reject(Error("Bad frame"));
              img.onerror=()=>reject(Error("Frame URL unavailable"));
              img.src=still.url;
            })));
            results.forEach(r=>{if(r.status==="fulfilled")this.images.push(r.value);else failed++;});
            if(failed)UI.showError(`${failed} video still(s) could not be loaded.`);
            this.sortImagesAscending();this.updateList();this.draw();
          },
          removeImage(index) {
            if (index >= 0 && index < this.images.length) {
              const item=this.images.splice(index,1)[0];
              if (item.owned) Core.BlobRegistry.release(item.img.src);
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
              const safeName=String(item.name||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
              div.style.cssText =
                "display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:var(--bg-input); border:1px solid var(--border); font-size:0.8rem;";
              div.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                  <img src="${item.img.src}" style="width:28px; height:28px; object-fit:cover; flex-shrink:0; border:1px solid var(--border);">
                  <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">${String(index + 1).padStart(2, '0')}</span>
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:110px;" title="${safeName}">${safeName}</span>
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
            if (this.images.some(item=>!this.validImage(item.img))) {
              UI.showError("One filmstrip source has no valid dimensions.");return;
            }
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

            if (s.rows < 1 || s.rows > 12 || s.framesPerRow < 0 || s.framesPerRow > 20 ||
                s.frameGap < 0 || s.rowGap < 0 || s.rowGap > 200 || s.frameGap > 200) {
              UI.showError("Invalid filmstrip layout. Reduce rows or spacing.");return;
            }
            let canvas;
            try {canvas = Core.AdaptiveRenderer.renderFilmstrip(this.images, s);}
            catch(error){UI.showError(`Filmstrip render failed: ${error.message}`);return;}
            if (!canvas || !canvas.width || !canvas.height) return;

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
          async download(format = "jpeg") {
            if (!this.canvas?.width || !this.canvas?.height || !this.images.length) return;
            const ext=format==="png"?"png":"jpg";
            const mime=format==="png"?"image/png":"image/jpeg";
            const title=((this.els.title?.value.trim()||"Filmstrip").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,100))||"Filmstrip";
            try {
              const blob=await new Promise((resolve,reject)=>{
                try{this.canvas.toBlob(resolve,mime,0.95);}catch(e){reject(e);}
              });
              if(!blob?.size)throw Error("The canvas could not be encoded");
              const url=URL.createObjectURL(blob);
              const a=document.createElement("a");a.href=url;a.download=`${title}.${ext}`;
              document.body.appendChild(a);a.click();a.remove();
              setTimeout(()=>URL.revokeObjectURL(url),60000);
            }catch(error){UI.showError(`Filmstrip export failed: ${error.message}`);}
          },
          destroy() {
            this.images.forEach(item=>{if(item.owned)Core.BlobRegistry.release(item.img.src);});
            this.images = [];
            this.updateList();
            this.draw();
          },
        },

};
