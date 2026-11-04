# CTK agent guidance

This repository is **The Forge**, a working creative tool kit, not a concept landing page.
There are eight tools and existing routes, exports, editors, and keyboard interactions that must remain intact.

## Design skills

For UI research, design proposals, visual critique, and frontend polish, consult the project-local skills:
- `.agents/skills/design-taste-frontend/SKILL.md` (Taste Skill v2, including `references/app-screens.md` for actual product interfaces)
- `.agents/skills/impeccable/SKILL.md` (Impeccable, especially `critique`, `distill`, `quieter`, `polish`, and `adapt`)
- `.agents/skills/ponytail/SKILL.md` (smallest complete, safe code change; prefer existing project patterns and verify affected callers)
- `.agents/skills/web-design-guidelines/SKILL.md` (review markup, accessibility, responsive behavior, and interaction conventions)
- `.agents/skills/webapp-testing/SKILL.md` (Playwright-based functional and responsive browser checks)
- `.agents/skills/hallmark/SKILL.md` (Hallmark design audits and full layout redesigns; the complete upstream skill is pinned as a Git submodule and must be initialized before use)

The existing cinematic eight-tool intro is approved. Preserve its branding, behavior, keyboard skip, reduced-motion fallback, and synchronized home handoff unless explicitly asked to change them.

## CTK design-quality bar

Treat the homepage as **Operate**, not a marketing splash. Function and navigation must be immediately legible.

Avoid generative-looking tropes: giant motivational slogans, arbitrary editorial italics, repeated ornamental circles, pseudo-technical numbering, decorative status labels, icon tiles without function, noisy mono metadata, and green-on-green surfaces for their own sake.

Use restrained, practical hierarchy; genuine tool names and actions; intentional whitespace; readable density; considered typography; visible focus and hover states; reduced motion; responsive screenshots; and interaction testing.

When the user asks for a design **demo**, create an isolated preview. Do not modify production UI or publish a design before explicit approval.
Before shipping any approved UI change, run the existing CTK build, regression suite and browser QA. Never quietly change tool routes or processing logic.

See `docs/design-skills.md` for skill provenance, installation scope and limitations.
