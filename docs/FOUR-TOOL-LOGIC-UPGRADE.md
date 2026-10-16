# Four-tool capability upgrade (review branch)

**Scope only:** Video Stills, Storyboard (including Filmstrip), Link Gen, Ad Downloader. No Logo Resizer, Image Splitter, PDF to Image or Video Downloads algorithm changes in this pass. This branch builds on the unmerged engine-reliability PR #1; merge order matters.

## Video Stills

- Opt-in **Smart frame selection** checkbox; default is the original uniform sampling, unchanged.
- Downsampled luminance/texture/difference measurements reject near-identical, empty, and likely blurry candidate frames; best-scoring fallback prevents zero output.
- Content-aware mode caps scanned candidates at 180 for memory/time control; this is a *heuristic*, not scene understanding and may discard intentional artistic frames. Turn it off to recover all uniformly sampled frames.
- Automatic storyboard composites, when enabled by the app, retain their existing separate sampling behavior. The smart filter targets still-frame extraction.

## Storyboard / Filmstrip

- Grid Board offers **Preserve full frames**: explicit `contain` fit instead of automatically cropping with `cover`; when mixed ratios are detected, the suggestion becomes more prominent.
- Broken/undecodable or oversized imports are rejected rather than creating unusable entries; dimensions and layout parameters checked before render.
- JPEG / ZIP / Filmstrip downloads verify a real encoded blob; cleanup and safe filenames; ZIP can skip invalid boards and reports them.
- Fit to Platform already validates text-circle fit and checks exported blobs; these controls remain unchanged.

## Link Gen

- URL folder and filenames are encoded per path segment; HTML attribute values are escaped.
- Reject path traversal, absolute path components, unsupported extensions, and untrusted server entries. Existing valid `jpg`, `png`, `mp4`, `mp3` workflows continue (also accepts `jpeg`).
- Invalid filenames are skipped with a visible error message instead of inserting broken or unsafe HTML.

## Ad Downloader

- Detect spreadsheet columns by header (ad number, link, optional type/category) with the original A/B/C layout as fallback. Invalid rows are skipped with a count; no JavaScript interpolated into row handlers.
- **Download** fetches the media directly into a browser Blob, verifies content, infers extension using actual bytes/MIME, requests the target name automatically, and only then moves the row into the "download initiated" section.
- **Download selected ZIP** batches 3 files concurrently, packages successes into a single ZIP with generated names, and reports failed links. Limit: 250 entries / 100 MB per file / 350 MB total to protect the browser.
- **Open source** is a *manual fallback*, not part of automatic saving.

### Mandatory browser security caveats

Cross-origin file downloads can be renamed by browser JavaScript **only if the origin permits CORS fetch of those files**, or if a backend under your control proxies the files (not implemented). Public access/permission to view a URL does not imply CORS permission. Tokenized query parameters are preserved. If the remote storage server blocks CORS, single-file renaming and bulk ZIP are blocked; the row remains eligible and a clear error is shown. No popup pretending to download a file. To guarantee cross-origin downloads regardless of host settings, add a vetted server-side proxy with allowlisted domains, SSRF protection, limits and authentication.

A website also **cannot override Chrome's Ask where to save each file setting**; it can only supply the filename. The app does not claim that the OS confirmed saving; it reports that a download was requested.

### Required QA before merge

- Verify browser access to the *actual* remote ad media host(s) with CORS; a mocked `fetch` success is not enough.
- XLSX fixtures with A/B/C and reordered column headers, empty and invalid rows, hyperlinks vs plain text, duplicate names and signed URLs.
- Direct 1-file and 3-file ZIP downloads; filename, extension, byte-parity, ZIP entries and partial failures.
- Compare old/new Video Stills outputs in uniform mode; test a static video, scene cuts, all-black video, 10-min video and blur-heavy clip in Smart mode.
- Grid Board: portrait/landscape mixtures, missing/corrupt images, switching projects while a ZIP is generating, duplicate project names, JPG and ZIP exports.
- Filmstrip: broken images/videos, invalid layout input, separate JPG and PNG exports, preserving frame order.
- Link Gen: ordinary filenames, Unicode, spaces, quoted names, traversal, and special-character URLs.
- Compare visual screenshots in dark and light mode. CSS baseline and existing navigation routes are preserved.

### Validation performed

- `npm test` includes 14 automated tests and source integrity checks.
- **Chromium was attempted but navigation is blocked by the runtime (`ERR_BLOCKED_BY_ADMINISTRATOR`)**. No successful real media host CORS test or export byte-parity browser test, so treat this as a review candidate only.
