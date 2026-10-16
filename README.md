# Creative Tools Suite — Modular Source

Structural refactor of the original eight-tool Creative Tools Suite, with its existing UI, themes, controls, scripts, dependencies, and inline event handlers retained. **No processing or visual redesign is included.**

## Run locally

Requires Node.js 20 or newer. No npm packages or network installation are needed for the build.

```bash
npm run build
npm run dev
```

Open `http://localhost:4173` (or open the root `index.html` after `npm run build`). External libraries and Google Fonts still load from their **original URLs**; a single HTML release does not bundle these third-party dependencies for fully offline use.

## Outputs

- `index.html` — normal page referencing `dist/css/app.css` and separate JavaScript bundles.
- `dist/index.html` — identical modular page with paths relative to `dist/`.
- `dist/creative-tools-standalone.html` — standalone HTML **byte-identical** to the source baseline, including original script/style elements; still references third-party CDN libraries.
- `dist/css/app.css`, `dist/js/*.js` — built assets.

## Source layout

- `src/css/shared.css`, `src/css/tools/*.css` — shared and tool-owned CSS, split into labeled ordered sections; see `src/css/order.json`.
- `src/js/core/*.js` — original app prelude, tool wrapper, and initialization code in original order.
- `src/js/tools/*.js` — per-tool source object members; Storyboard has Grid, Filmstrip, and Fit to Platform components.
- `src/js/presentation/*.js` — original four late-page presentation scripts.
- `source/baseline.html` — unmodified source-of-truth snapshot for parity checks.
- `scripts/build.mjs` — dependency-free build, strict checks against the baseline.

**Safety-first design trade-off:** The per-tool files are source-preserving code fragments wrapped as valid ES-module object literals for editing. The build unwraps them in the original order into a **classic script**. Do not directly import them as browser ES modules: inline handlers depend on the legacy global lexical APIs. CSS sections carry `CTK_RUN` markers so the original cascade can be reconstructed exactly. Please edit within a section, and keep its marker names intact. A later refactor can eliminate these compatibility shims once thorough end-to-end tests exist.

## Validation

```bash
npm test
```

The build fails if any assembled original CSS/JS differs from `source/baseline.html`. This proves source-byte preservation for scripts/styles; it **does not** prove all workflows. Test with real media and libraries in a connected browser before claiming end-to-end export parity.

## Original dependencies

CDNs are unchanged: Pica, PDF.js, JSZip, SheetJS, Lucide, Three.js, and Google Fonts. Paths such as `Toolkit%20logo.png` and `manifest.json` refer to original companion assets and will need copying from the original project if available; they are not embedded in the supplied HTML source.

## Engine reliability/performance pass 1 (guarded)

Changes address URL lifetime isolation, redundant preview encoding, repeated logo redraws, sequential extraction and cancellation safeguards. No UI design changes. Details and mandatory real-browser verification are in [docs/PERFORMANCE-UPGRADE.md](docs/PERFORMANCE-UPGRADE.md). The test suite also runs browser-mocked engine tests; it **does not** prove end-to-end export parity or a measured speedup.

## Four-tool capabilities (review candidate)

Video Stills has optional Smart frame selection, Storyboard/Filmstrip validate sources and exports, Link Gen validates and safely encodes filenames, and Ad Downloader supports Chrome-native background downloads using an optional extension and selected-file ZIPs when the media host allows CORS. No source popup or manual renaming is needed when the extension is enabled. See [optional/chrome-native-downloader/README.md](optional/chrome-native-downloader/README.md) for one-time installation and limitations; [docs/FOUR-TOOL-LOGIC-UPGRADE.md](docs/FOUR-TOOL-LOGIC-UPGRADE.md) documents the prior review candidate.

## Fix: borderless Storyboard and Chrome-native ad downloads

Storyboard's extra smart-fit suggestion has been removed; the preview and image canvas now suppress decorative borders/shadows, restoring the original visual presentation. The actual source validation/export protections remain.

Ad Downloader no longer has an “Open source” button. For hosts that block the HTML page's CORS fetch (the reported `Failed to fetch`), a normal browser page cannot force a renamed file download via a hidden popup. The optional **CTK Native Downloader** extension instead calls Chrome's built-in Downloads API with the formatted filename and `saveAs:false`. See [installation instructions](optional/chrome-native-downloader/README.md). With the extension, **Download selected** queues multiple independent files; without it, the existing **ZIP** mode works only for fetchable hosts. For download completion and Chrome policy prompts, check Chrome Downloads.
