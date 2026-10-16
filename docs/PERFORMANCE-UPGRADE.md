# CTK reliability & processing efficiency — guarded pass 1

This change is an incremental processing-engine update, **not** a UI redesign. The original `source/baseline.html` remains immutable.

## Implemented

- **URL ownership:** `Core.BlobRegistry` now tracks ownership of blob URLs, supports idempotent `release(url)` and `revokeOwner(owner)`, while preserving legacy `urls` and `revokeAll()` APIs. Clearing PDF no longer invalidates Logo, Storyboard, Image Splitter, or Video Stills URLs.
- **Logo Resizer:** coalesces duplicate `draw(card)` calls into one animation-frame render per card; removes/cancels detached cards before drawing. Canvas dimensions, drawing algorithm, compression, export names, and settings are unchanged.
- **Video Stills:** serializes overlapping `handleFiles` calls instead of launching concurrent processors; drains queues without double-processing; reuses a frame canvas for all stills of each video; first still's exported blob also supplies the stack preview (avoiding a second JPEG encode); tracks temporary video source URLs and generated stills by ownership, revoking them on completion/reset; rejects unreadable video metadata or failed seeks and has guarded timeouts. Keeps existing frame time sampling and JPEG export quality.
- **PDF to Image:** prevents simultaneous PDF conversion workers and queues new uploads; cancels work on clear; reuses first exported blob as its preview (avoiding duplicate encoding); releases PDF-owned URLs only. Keeps page scale (2.0), format and encoder quality (0.9).
- **Image Splitter / Storyboard:** lifecycle cleanup through owned URL releases. Deleting boards releases their owned assets. Video-to-board frames are attributed to the Storyboard owner. Storyboard video import releases temporary video URLs after decoding and handles decoding failures.
- **Build:** modular HTML and standalone HTML both include optimized core logic, while HTML/CSS, presentation scripts and external dependencies stay unchanged. Build validates this preservation.

## Verification actually performed

- `npm test`: build, compiled JS syntax, DOM IDs, all eight homepage routes, external script order, unchanged CSS and presentation scripts, standalone HTML unchanged outside optimized engine, and six Node integration tests with browser API mocks.
- **No complete Chromium browser run**: the available Chromium browser rejects navigation with `ERR_BLOCKED_BY_ADMINISTRATOR` in this runtime. Live image/video/PDF codec behavior, appearance, real download completion, and per-tool end-to-end workflows are *not* verified.
- **No measured real-browser speedup**: redundant work is removed by construction; the expected performance gain must still be measured in the actual browser on representative files.

## Required manual end-to-end checks before production

1. Run `npm test`, then `npm run dev`. Compare homepage and all eight workspaces in both themes at desktop widths with the baseline.
2. Logo Resizer: upload mixed images, export individual files and ZIP, sliders/overlays, sidebar Focus Mode, remove/reset/undo; compare dimensions and pixels.
3. PDF to Image: one and multiple PDFs, pages/format, first-page preview, individual/selected/ZIP downloads, cancel during conversion, clear with another tool open, upload again immediately after clear.
4. Image Splitter: multiple images, size/grid, previews, individual and ZIP downloads and clear.
5. Video Stills: one/overlapping multiple videos including short and corrupt files; still extraction, vertical detail list, large preview, storyboard transfer, download selected/ZIP, clear during processing. Compare number and timestamps of frames, JPG dimensions and content.
6. Storyboard: Grid Board / Filmstrip / Fit to Platform, images/videos, exports, multiple boards and deletion, undo as applicable.
7. Link Gen / Ad Downloader: representative inputs including XLSX and Unicode, output formats and exports; Video Downloads: valid/invalid links and generated commands.
8. Test during repeated upload/reset cycles and use DevTools memory panel: no growing dangling Blob URLs or canvases.

Do not merge to production until blockers above are cleared or consciously accepted by the owner.
