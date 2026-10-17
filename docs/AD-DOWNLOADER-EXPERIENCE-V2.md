# Ad Downloader — Experience V2

The current pass redesigns the **Ad Downloader desktop workspace only**. It is intentionally separate from the preserved baseline styles and engine modules. It is authored using principles from Anthropic Frontend Design (distinctive design direction) and Impeccable (hierarchy, interaction states, accessibility, and motion restraint).

## Direction

**Mineral blue on deep ink**, with porcelain surfaces in light mode. The previous dark forest-green edition look is deliberately not reused here. A strong typographic filename hierarchy, clean table, high-contrast primary download control, focused typography, and reserved cobalt accents create a workspace rather than a dense status dashboard.

## Motion

- 180–260ms feedback for hover/focus/press, with no exaggerated scaling.
- Subtle one-time reveal on table/empty-state entrance, small menu reveal, and a low-amplitude empty-state float.
- Native keyboard focus remains obvious. Reduced-motion preference disables movement.
- No layout-shifting stagger applied to dynamic rows or heavy scroll-linked effects.

## Interaction contract

The display layer groups **Fix downloaded name** and **Save named copy** into native \`<details>\` menus for SharePoint entries. Their **original DOM buttons and their original click handlers are moved intact**, not re-created or intercepted. Primary **Download** and **Copy** remain directly visible and callable. The file watcher, concurrency logic, SharePoint routing, spreadsheet parser, and export behavior are untouched.

The enhancement runs once on DOM readiness and observes newly inserted table rows (e.g. new workbook). It does not patch global state or require third-party dependencies.

## Source/build

- \`src/css/experience/ad-downloader-v2.css\` — isolated design layer, loaded after legacy CSS.
- \`src/js/presentation/ad-downloader-v2.js\` — progressively enhances rows and text.
- \`scripts/build.mjs\` writes both modular assets and inlines them into standalone release.
- \`scripts/verify.mjs\` still compares the resulting output with the baseline after subtracting the explicitly approved experience layer and the pre-existing engine modifications.

## Verification status

Automated checks validate build/bundle integrity and old DOM IDs/routes. They cannot prove aesthetic quality or interaction across authenticated SharePoint in a real browser. Desktop Chrome, light mode, dark mode, keyboard, and full table tests are still needed to award a final visual rating.
