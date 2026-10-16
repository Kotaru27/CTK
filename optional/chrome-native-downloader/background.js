"use strict";
// The Downloads API triggers Chrome's normal download manager without a source
// popup. A webpage cannot do this to a cross-origin resource by itself.
function validSource(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.href.length < 8192;
  } catch { return false; }
}
function cleanFilename(value) {
  if (typeof value !== "string" || value.length > 230 || !value.length) return "";
  // A filename rather than a folder path: no traversal, special Windows names,
  // separators or control characters. Names from the app are already sanitized.
  const cleaned = value.replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,"_").replace(/[. ]+$/g,"");
  if (!cleaned || cleaned === "." || cleaned === ".." || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(cleaned)) return "";
  return cleaned;
}
chrome.runtime.onMessage.addListener((request,sender,sendResponse) => {
  // Accept only the CTK content script on explicitly authorized local origins.
  if (!sender.tab || !sender.url || !(/^(file:\/\/|http:\/\/localhost(?::\d+)?\/|http:\/\/127\.0\.0\.1(?::\d+)?\/)/i.test(sender.url))) {
    sendResponse({ok:false,error:"Untrusted download request"});return;
  }
  if (request?.action === "ping") {sendResponse({ok:true});return;}
  if (request?.action !== "download" || !validSource(request.url)) {
    sendResponse({ok:false,error:"Invalid download URL"});return;
  }
  const filename=cleanFilename(request.filename);
  if (!filename) {sendResponse({ok:false,error:"Invalid download filename"});return;}
  chrome.downloads.download({url:request.url,filename,saveAs:false,conflictAction:"uniquify"},id=> {
    const error=chrome.runtime.lastError;
    sendResponse(error||typeof id !== "number"
      ? {ok:false,error:error?.message || "Chrome rejected the download"}
      : {ok:true,downloadId:id});
  });
  return true;
});
