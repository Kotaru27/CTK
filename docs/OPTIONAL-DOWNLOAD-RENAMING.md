# Optional automatic naming for protected SharePoint downloads (experimental)

## Why this exists

The native SharePoint `download.aspx` route downloads the **real media**, using the existing company SharePoint browser session. This route must be preserved. Chrome uses SharePoint's `Content-Disposition` filename; a cross-origin HTML `download="AD1_..."` attribute is ignored. GitHub Pages does not get permission to read protected media bytes by virtue of the user's SharePoint session.

## Optional, no extension and no Microsoft app registration

When CTK runs on GitHub Pages in a supporting Chrome/Edge browser (HTTPS), Ad Downloader exposes **Auto-name: Choose folder**. Click this button and choose a dedicated directory for CTK downloads. Then set **the same directory** as Chrome's download location under **Chrome → Settings → Downloads → Location** (or choose it at each Save As prompt). Chrome may refuse access to protected system folders; a new `CTK Downloads` subfolder is recommended.

Next, click the existing per-row **Download** button. SharePoint still serves the media directly. After the completed file appears in the chosen folder, CTK looks for a **new** file matching the expected original SharePoint basename and extension, then attempts to rename it to the spreadsheet-derived `AD1_...mp4` name. No extra app registration, extension, company credentials, or remote file transfer is performed by this feature.

**Important limitations**

- This is a **best effort experiment**, not an automatic-filename guarantee. It only runs while CTK is open; reselect the directory on page reload. Files saved in a different location will not be detected. Permission prompts and browser restrictions vary.
- Chrome's `FileSystemFileHandle.move()` has inconsistent availability for regular user files. The fallback makes a streamed, verified copy with the desired name and deletes the original only after verifying length and first/last 64 KiB; disk space and write permission are needed. A copy failure keeps the original intact.
- Existing files in the selected directory are never touched; targets with the intended final name are **never overwritten**. Renaming is limited to a newly appeared file matching the original SharePoint filename, with a common ` (N)` collision suffix. Opaque URLs without resolvable source paths cannot be processed.
- There is no browser API notifying a third-party GitHub Pages website when SharePoint's native download finishes. CTK detects likely completion from an unchanged file size and modification time, then checks for a `.crdownload` companion. Long-paused or unusual downloads might fool this heuristic; do not use this feature with sensitive or mission-critical files until verified on the actual browser.
- If the folder permission is declined, the file cannot be identified, or renaming fails, the **native media download still works under SharePoint's original filename**. CTK reports a failure rather than claiming that it renamed the file.
- Selected-file ZIP for private SharePoint media remains unsupported in the browser without CORS-accessible bytes. No change to the other CTK tools.

## Tests and release status

`npm test` includes deterministic File System Access API mocks that check filename parsing, new-file-only matching, safe collision behavior, stable-file checks, and preserving the normal download without folder permission. It **cannot** prove that an actual company SharePoint download will trigger the rename: manual Chrome/Edge testing is mandatory before enabling it for more employees.

Sources: [Chrome File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access), [MDN showDirectoryPicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker), [MDN anchor download restrictions](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a).
