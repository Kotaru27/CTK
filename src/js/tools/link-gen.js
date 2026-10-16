/* Source-preserving module. Build unwraps the object property into the original Tools object. */
export default {
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

};
