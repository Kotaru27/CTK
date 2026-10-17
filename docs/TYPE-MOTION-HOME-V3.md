# Type & Motion V3 — desktop quality pass

**Goal:** Refine typography, motion and homepage of Creative Tools without changing any tool state, rendering, export or download logic.

**Principles applied:** the craft direction of Frontend Design, interaction polish and contrast hierarchy from Impeccable, and performance-minded CSS animation fundamentals. No directly relevant frontend-design skill was installed in this session; these are design principles, not claimed installed skills.

## Typography
Keep existing network-loaded Plus Jakarta Sans and Instrument Serif. Improve letter-spacing and line-height in headings, lift guidance legibility, soften all-caps microcopy, and reduce home hero compression without replacing its typographic personality. Do not change monospace media filenames/code/terminal outputs.

## Motion
One named system: 140ms immediate response; 210ms control interaction; 330ms workspace/overlay; 470ms home entrance. Use translate + opacity for entrance, no animated blur or scale on workspaces, no continuous motion and a full reduced-motion path. No direct JS or functional changes.

## Home
Keep asymmetric eight-tile catalogue, editorial hero, existing art, dark/light palette and navigation. Add a short, restrained first reveal, more comfortable reading, subtle art direction on hover and accessible contrast. Avoid hero redesign and layout reordering.

## Risk boundaries
The experience is additive in `src/css/experience/typography-motion-v3.css`, loaded after the prior styles. The build verification extracts the exact approved layer before checking that standalone baseline DOM/JS remains identical. The download engine is unmodified. Populated workspaces and interactive functionality still require real-device testing after build and browser screenshots.
