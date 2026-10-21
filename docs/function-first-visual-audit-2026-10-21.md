# The Forge — Function-first visual audit and release gates

Date: 2026-10-21. Repository: Kotaru27/CTK (main).
Evidence: live repository code and the Oct 21 GitHub Actions captured empty/populated full-HD/QHD workspace screenshots. Screenshots and code reviews are not substitutes for physical 60/100Hz device tests or production SharePoint integration.

## Non-negotiable principle

The Forge is not a dashboard or eight identical upload utilities. Give prominence to the actual work object—image, frame, storyboard, document page, link, or batch of media. Do not copy competitor layouts, add decorative chrome, or change approved functionality. Keep the Kola wordmark, established home, light palette, concentrated work areas, and existing navigation.

## Per-tool audit and evidence gates

| Workspace | The real job | Verified code contract | Screen-level design gate |
| --- | --- | --- | --- |
| Logo Resizer | Batch configure images and export; inspect a chosen image | src/js/tools/logo-resizer.js: global controls, rendered image cards, sidebar Focus Mode | Image output and dimensions must stay prominent. Check multi-logo density and filenames. Do not make Focus Mode fullscreen. |
| PDF to Image | Convert multiple PDFs, select pages and download | src/js/tools/pdf-to-image.js: collection, conversion progress/cancel, page selection | Show document identity, completion and page selection; validate several PDFs and download controls, not just a decorative PDF mockup. |
| Image Splitter | Partition imported images according to split settings | src/js/tools/image-splitter.js: split count, grid preview, export | Split boundaries and tile outputs are the primary content. Preserve precise alignment and selection. No added preview theater. |
| Video Stills | Extract frame collections, select stills, bulk Send to Board | src/js/tools/video-stills.js: video sets, detail view, global hand-off | Large frame viewing is appropriate here, unlike Compressor. Audit dense thumbnail and selected states. Reproduce alleged overlay ghosting before claiming a bug. |
| Storyboard | Import folder(s), arrange stills, export composed boards | src/js/tools/storyboard.js: Add Assets folder input, multi-board management, board canvas/export | Composition dominates. Inspect populated rails and header actions at compact desktops; do not invent another import control. |
| Link Gen | Turn filenames into safe, usable links and markup | src/js/tools/link-gen.js: validation, server/folder inputs, dual text outputs/copy | Make input/output text readable; test invalid names, long rows and copying. Do not add generic media cards. |
| Ad Downloader | Folder authorization, Excel-driven multi-ad download/rename | src/js/tools/ad-downloader.js: required folder-before-Excel gate, batch/download actions | Pending and completed ads, long filenames and renaming readiness take precedence over previews. Test dense spreadsheet workloads. |
| Video Compressor | Process up to five files toward one target per video and download results | compressor/index.html and compressor/app.mjs: queue, per-file warnings, status, explicit optional Preview dialog, MP4/ZIP actions | Pilot: readable five-file ledger with visible warnings and actions, no default preview and no unnecessary card-in-card chrome. |

## Specific findings and scope

1. The October 21 populated compressor screenshot shows a single queued fixture in a large minimum-height pane with individually bordered nested row cards. This increases chrome without helping multi-file processing. The pilot changes only the compressor presentation stylesheet.
2. The compressor HTML already keeps video preview behind an explicit Preview button and a closed dialog. Preserve this, do not replace it with a large default player.
3. The initial single-file compressor browser QA did not prove a five-file layout. The expanded browser QA uses five entries, long filenames, optional preview checks, per-file quality messages and responsive desktop sizes.
4. The 8-workspace photo audit captures selected real UI states using synthetic input. It does not establish every error state, user filename, protected download, or hardware refresh performance.
5. A ghosted screenshot of the Video Stills overlay is inconclusive without a stable-state reproduction. Do not mutate the working motion system solely on that screenshot.
6. The compressor's earlier actual browser FFmpeg.wasm encode passed one short synthetic clip; file-quality guarantees for every video and aggressive target remain unsupported.

## Pilot acceptance

- Empty batch shows a clear invitation, not meaningless data columns.
- Adding media never opens/plays a default video.
- Five distinct entries appear with intact file identity, warnings, status and controls.
- No horizontal overflow or clipped row content at 1920×1080 and 1366×768; at smaller heights, normal scrolling may still be necessary.
- Preview opens only by explicit click; download/export, codec, targets, queue lifecycle and limits are unchanged.
- Existing CI regressions, Forge desktop QA, actual WASM encode, and full motion audit pass; record incomplete runs honestly.

## Release sequence

**A — Pilot.** Evaluate and verify the compressor's five-file workflow before generalizing styles.

**B — Remaining seven.** Add realistic screenshot/test states for high-volume/dense modes. Prioritize issues with reproduced evidence, not vague aesthetic dissatisfaction.

**C — Shared craft.** Improve typography, spacing, contrast, keyboard focus, and status treatments only where they help each workflow. Do not force uniform composition.

**D — Confirm.** Run source/bundle parity, all tools and motion regressions, desktop viewport tests, and deployment checks. Retest problematic states on actual screens when possible.

Protected: existing home layout; wordmark-only identity; light theme; Logo Resizer sidebar Focus Mode; Video Stills player and global Send to Board; Storyboard Add Assets multi-folder import; Ad Downloader folder-before-Excel requirement; compressor batch limit and optional preview. No new dependencies or speculative features.

Status: function-first audit documented; initial Video Compressor design pilot in source. Remaining workspaces are scoped for evidence-led follow-up, not claimed redesigned.
