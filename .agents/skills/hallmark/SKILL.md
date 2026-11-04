---
name: hallmark
description: "CTK-local entry point for the pinned Nutlope Hallmark design skill. Use for new design work, or when the user explicitly requests Hallmark to audit or redesign an existing CTK screen."
---

# Hallmark for The Forge (CTK)

This is the project-local entry point for the **unmodified upstream Hallmark skill**, pinned as a Git submodule.

1. Read `./upstream/skills/hallmark/SKILL.md` **before** applying Hallmark; that file is the authoritative design workflow and its relative references resolve from `./upstream/skills/hallmark/`.
2. If the file is missing, initialize the submodule from the CTK repository root: `git submodule update --init .agents/skills/hallmark/upstream`. Do not improvise an incomplete installation.
3. Hallmark's scripts are in `.agents/skills/hallmark/upstream/skills/hallmark/scripts/`. On CTK's existing working UI, request or run Hallmark's `audit` or `redesign` flow explicitly, not a generic landing-page build.
4. CTK is a desktop-first operational creative toolkit: keep all eight tool names, functions, routes, keyboard controls, exports, logos, and brand type. First produce a separate demo when redesign is requested; never change production UI without explicit approval. Run CTK's own build, tests, and browser QA after an approved change.

The submodule is development tooling only. It does not load in the web app.

See `docs/design-skills.md` for provenance and initialization.
