# Ad Downloader: native Chrome download path

Problem: the prior CORS-dependent `fetch()` failed on the reported remote media link and provided an "Open source" fallback. Hidden popup windows do not solve CORS, control the source server's `Content-Disposition`, or suppress browser Save dialogs.

Resolution: the optional `optional/chrome-native-downloader/` extension calls `chrome.downloads.download({url, filename, saveAs:false, conflictAction:'uniquify'})` from a service worker, via a local CTK page/content-script bridge. No `window.open`, source tab, manual filename, or privileged webpage `fetch()` is required for extension-backed downloads. A click reports that download started, not completed; Chrome Downloads is the source of completion status.

The extension is not installed automatically. See its README for Chrome Developer Mode, Load unpacked and (for a local file) Allow access to file URLs. Without the extension, CORS-allowed downloads and ZIP still function, but CORS-blocked remote files cannot be silently renamed by an ordinary webpage. When the extension is available, Download selected queues separate Chrome downloads rather than trying to create one in-memory ZIP from inaccessible cross-origin responses.

Storyboard's extra Preserve full frames button introduced in the capability pass is removed. Preview-area borders/shadows, rendered preview canvas border/shadow and size label border are explicitly suppressed; no export image border is drawn. Original crop/cover setting remains unchanged.

QA: npm test, 19 tests including native background API validation, mocked no-popup single/bulk routes, and visual presentation source checks. Browser UI and live cross-origin downloads are **not verified** in this environment; Chromium returns ERR_BLOCKED_BY_ADMINISTRATOR. Chrome may enforce its own download prompts/policies and remote hosts can still return authorization errors.
