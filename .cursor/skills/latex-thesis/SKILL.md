---
name: latex-thesis
description: LaTeX multi-agent writing for the IDA doctoral dissertation on branch pisemna. Use when editing docs/thesis/**/*.tex, bibliography, figures, or building the dissertation PDF.
---

# LaTeX thesis (IDA)

Canonical guide lives in the dissertation tree:

1. Read **`docs/thesis/GLOSSARY.md`** first (shared terminology — prevents multi-agent drift).
2. Read and follow `docs/thesis/AGENTS.md` (ownership, labels, bib rules).
3. Follow `docs/thesis/skills/latex-thesis/SKILL.md` for writing/build checklist.
4. Content sources: `docs/thesis/notes/SPIS_TRESCI_PROPOZYCJA_ASP.md`, `docs/thesis/notes/HIPOTEZY_REWIZJA.md`.
5. Canonical folder is **`docs/thesis/`** (not a separate root `thesis/`).

```bash
cd docs/thesis && make pdf
# or partial: make chapter C=06-metodologia
```

Edit only owned `.tex` files under `docs/thesis/`. Do not merge into `main` unless the user asks.
