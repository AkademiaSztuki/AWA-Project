# Praca pisemna (branch `pisemna`)

Materiały pisemne do rozprawy doktorskiej IDA — **LaTeX**, oddzielone od kodu aplikacji.

## Branch

| Branch    | Przeznaczenie                          |
|-----------|----------------------------------------|
| `main`    | Aplikacja IDA, deploy, zmiany w kodzie |
| `pisemna` | Tylko treści pod pracę pisemną         |

**Zasada:** na `pisemna` edytuj wyłącznie pliki w `docs/thesis/`. Nie zmieniaj `apps/`, `infra/` ani konfiguracji deployu.

## Multi-agent (żeby się nie rozsypało)

Wszystko żyje w **`docs/thesis/`** — to jest folder pracy (nie osobny `/thesis` w rootcie).

| Plik | Po co |
|------|--------|
| **[GLOSSARY.md](./GLOSSARY.md)** | **Kanon terminów** — czytają wszyscy agenci przed pisaniem |
| **[AGENTS.md](./AGENTS.md)** | Ownership plików, zakazy konfliktów |
| **[skills/latex-thesis/SKILL.md](./skills/latex-thesis/SKILL.md)** | Checklist build/write |

Kolejność startu agenta: `GLOSSARY.md` → `AGENTS.md` → spis ASP → własny `.tex`.

## Struktura

```
docs/thesis/                 ← kanoniczny folder rozprawy
  GLOSSARY.md                # wspólny słownik (spójność multi-agent)
  AGENTS.md                  # ownership pasów
  main.tex                   # dokument główny
  preamble.tex / metadata.tex
  latexmkrc / Makefile
  frontmatter/               # tytuł, abstrakty, skróty (← sync z GLOSSARY)
  chapters/                  # rozdz. 01–10
  backmatter/                # załączniki A–F
  bibliography/references.bib
  figures/
  notes/                     # konspekty MD (nie w PDF)
  exports/                   # lokalne PDF (gitignored)
  skills/latex-thesis/
```

## Build

Wymagania: TeX Live z LuaLaTeX, `latexmk`, `biber`.

```bash
cd docs/thesis
make pdf       # → main.pdf
make watch
make chapter C=07-artefakt-ida
```

Albo:

```bash
latexmk -pdflua main.tex
```

## Workflow git

```powershell
git checkout pisemna
# …edycja wyłącznie docs/thesis/…
git add docs/thesis/
git commit -m "thesis(ch06): outline methodology instruments"
git push -u origin pisemna
```

`main` się nie zmienia, dopóki świadomie nie zrobisz merge/PR.

## Notatki robocze (Markdown)

- `notes/SPIS_TRESCI_PROPOZYCJA_ASP.md` — **aktualna propozycja spisu** pod ASP (ComfyUI, medium dyfuzyjne, artefakt IDA)
- `notes/SPIS_TRESCI_ROBOCZY.md` — wcześniejszy spis (psychologia/HCI) — archiwum robocze
- `notes/HIPOTEZY_REWIZJA.md` — rewizja H1–H5 → RQ1–RQ6

Źródła wersjonuj w `.tex` (rozdziały) + `.bib`. Szkice `.docx` trzymaj w `exports/` (ignorowane).
