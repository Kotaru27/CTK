# The Forge design skills

These are **agent skill files**, not app code or npm runtime dependencies. They are installed under `.agents/skills/` and do not load on the live site.

| Skill | Source | Source revision | Local folder |
| --- | --- | --- | --- |
| Taste Skill v2 (`design-taste-frontend`) | https://github.com/Leonxlnx/taste-skill | `12af471f627f866411b4bd785b19646d3672784c` | `.agents/skills/design-taste-frontend/` |
| Impeccable (`impeccable`) | https://github.com/pbakaus/impeccable | `9fadc41729c38fd47d7ae622b501558653f9d2e9` | `.agents/skills/impeccable/` |

Taste's full portable folder (skill, references, design library, app rules, scripts) is vendored. Impeccable's portable skill, playbooks, and scripts are vendored with its Apache 2.0 license, except its optional ~1.1 MB `scripts/data/font-index.json`, which the GitHub file interface cannot return. If an Impeccable font-search command requires that dataset, install or refresh through the official CLI in a local checkout.

**No design hooks, GitHub Actions, CLI binaries, or other automatic code execution are enabled by this change.** Impeccable's launcher can download its analysis engine when explicitly invoked. Review any executable and its network behavior before opting in.

For a full upstream Impeccable CLI installation (including the omitted font index), in the project root, review the commands then run:

```sh
npx impeccable install -y --providers=codex --scope=project --no-hooks
```

For the vendor's recommended Taste installation or refresh:

```sh
npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend
```

Local skill instructions require a coding agent that supports project-local `SKILL.md` files. These do not install as ChatGPT account plugins.

The design process: inspect the real product, classify it as an operational UI, critique before ideating, propose a specific direction, build a **separate** demo, review it at desktop/mobile, then change production only after approval. Preserve all eight tool names, routes, processing and exports.

Source licenses are copied into each skill folder.
