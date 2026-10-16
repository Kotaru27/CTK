(() => {
  "use strict";
  // Local files require the one-time "Allow access to file URLs" permission.
  // Restrict this bridge to pages that contain CTK's actual Ad Downloader.
  const validHost = location.protocol === "file:" ||
    (location.protocol === "http:" && ["localhost", "127.0.0.1"].includes(location.hostname));
  if (!validHost) return;
  window.addEventListener("message", async event => {
    if (event.source !== window || event.data?.channel !== "CTK_NATIVE_DOWNLOAD_REQUEST") return;
    if (!document.getElementById("adDlInput") || !document.getElementById("adDlTableBody")) return;
    const {id,action,url,filename} = event.data;
    if (typeof id !== "string" || id.length > 120 || !["ping", "download"].includes(action)) return;
    try {
      const result = await chrome.runtime.sendMessage({action,url,filename});
      window.postMessage({channel:"CTK_NATIVE_DOWNLOAD_RESULT",id,
        ok:!!result?.ok,downloadId:result?.downloadId,error:result?.error},"*");
    } catch (error) {
      window.postMessage({channel:"CTK_NATIVE_DOWNLOAD_RESULT",id,ok:false,error:String(error.message || error)},"*");
    }
  });
})();
