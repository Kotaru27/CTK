# The Forge — Creative Tools

Eight-tool creative workspace, built from the original Creative Tools Suite modular source. **The Forge** branding introduces a Kola wordmark, opening reveal, refreshed homepage hero, and light-by-default theme. The eight tool cards, individual tool workspaces, exports, processing, dependencies, and inline handlers are preserved.

## Brand presentation

- Kola font is loaded from Fontshare for the product name, not as the interface font.
- The wordmark-first design has no standalone logo icon.
- The intro runs once per browser session, can be skipped, and respects reduced-motion settings.
- Light is the default only when no theme preference has already been saved.
- The hero is additive presentation: the original eight card buttons and their tool logic remain unchanged.
- `source/baseline.html` and the legacy `creative-tools-standalone.html` filename are retained as compatibility and regression fixtures.
- Brand assets: `src/css/experience/forge-brand.css`, `src/js/presentation/forge-brand.js`.

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

## SharePoint download on GitHub Pages (no extension or Entra application)

CTK attempts **native SharePoint browser downloads** for file-path-backed links
using the user's existing authorized SharePoint session. No Microsoft Graph,
client ID, tenant ID, user sign-in inside CTK, or extension is used.

**Limits:** Cross-origin response filenames cannot be overridden by GitHub Pages;
SharePoint bulk ZIP is not possible without media bytes; opaque sharing links
without a resolvable file path are unsupported. The browser's download result
cannot be confirmed by the site. Other public CORS-enabled files keep formatted
naming and ZIP downloads. See [docs/SHAREPOINT-GITHUB-PAGES.md](docs/SHAREPOINT-GITHUB-PAGES.md).

## Optional SharePoint download naming experiment

See [`docs/OPTIONAL-DOWNLOAD-RENAMING.md`](docs/OPTIONAL-DOWNLOAD-RENAMING.md). The native download still works independently of folder access. Auto-naming requires a user-selected directory in Chrome/Edge, and is unverified against a real company SharePoint download; no extension or Microsoft Entra setup is required.

## Filename recovery for SharePoint

After a native SharePoint download finishes, use **Save named copy** on that row to select the downloaded media and save a new local copy using the expected spreadsheet `ADn_...` filename. The original stays intact. The optional **Auto-name: Choose folder** feature remains available for hands-free renaming when Chrome saves into exactly the selected directory. These are local-file operations; neither path uses Microsoft Graph or SharePoint credentials in CTK.

### Correct an already-downloaded SharePoint file

Click **Fix downloaded name** beside the corresponding row. Select the folder where Chrome saved the SharePoint file; CTK looks for files matching the original SharePoint basename (including ` (1)` duplicates), asks which file if there is ambiguity, and renames the chosen completed file in that folder. This avoids the extra duplicate produced by **Save named copy**. For hands-free renaming, **Auto-name: Choose folder** still requires selecting the same folder used by Chrome before downloading.

### Multi-file SharePoint Auto-name

Auto-name can now track up to 60 **distinct original SharePoint filenames** simultaneously, with individual spreadsheet-derived targets. Duplicate source basenames and ambiguous filename matches are not automatically renamed. Chrome must use the exact selected folder; see [optional naming documentation](docs/OPTIONAL-DOWNLOAD-RENAMING.md).
