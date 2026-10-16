# Optional CTK Native Downloader — Chrome desktop

Enables one-click remote file downloads under the exact formatted filename **without opening a source popup**. Works even when the remote host does not allow webpage `fetch()` through CORS. Uses only Chrome's native Downloads API; it does not read your spreadsheet or handle the asset contents.

## Install once

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked**, select this `optional/chrome-native-downloader` folder.
3. **If you open the standalone HTML from your computer:** open the extension's **Details** and turn on **Allow access to file URLs**. This is required for a content script to run in a `file://` HTML file.
4. Reload CTK. Click **Download** or **Download selected** in Ad Downloader. The file saves using Chrome's download location, without source tabs or a manual rename workflow.

Chrome may still enforce its own download location, file safety prompts, site download restrictions, or enterprise policy. We cannot disable those controls. The extension asks for permission to download HTTP(S) assets by URL; review the files before enabling it.

## Without the extension

CTK continues to download files via `fetch()` and build a ZIP for selected assets **only if the media host allows cross-origin access**. An ordinary webpage cannot force a custom filename for an inaccessible remote file; hidden popups or iframes do not solve that. When the extension is present, bulk downloads are individual Chrome downloads rather than a single ZIP.

## Limitations

- Chrome desktop only; no installation scripts or browser automation required.
- Some hosts block access with authentication, signed URLs, expired tokens or hotlink protections. Chrome's download manager will report such failures.
- The Download button reports **started**, not necessarily **completed**; check Chrome Downloads (`Ctrl+J`) for the final state.
- The app does not automatically install or silently grant extension permissions.
