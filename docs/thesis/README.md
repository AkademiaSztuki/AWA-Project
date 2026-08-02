# Praca pisemna (branch `pisemna`)

Materiały pisemne do rozprawy doktorskiej IDA — **LaTeX**, oddzielone od kodu aplikacji.

## Branch

| Branch    | Przeznaczenie                          |
|-----------|----------------------------------------|
| `main`    | Aplikacja IDA, deploy, zmiany w kodzie |
| `pisemna` | Tylko treści pod pracę pisemną         |

**Zasada:** na `pisemna` edytuj wyłącznie pliki w `docs/thesis/`. Nie zmieniaj `apps/`, `infra/` ani konfiguracji deployu.

## Multi-agent

Zasady równoległego pisania: **[AGENTS.md](./AGENTS.md)**  
Skill dla agentów Cursor: **[skills/latex-thesis/SKILL.md](./skills/latex-thesis/SKILL.md)**

## Struktura LaTeX

```
docs/thesis/
  main.tex              # dokument główny
  preamble.tex          # pakiety, makra
  metadata.tex          # tytuł, autor, promotor
  latexmkrc / Makefile  # build (LuaLaTeX + biber)
  AGENTS.md             # ownership pasów agentów
  frontmatter/          # tytuł, abstrakty, skróty
  chapters/             # rozdz. 01–10 (jeden plik = jeden agent-scope)
  backmatter/           # załączniki A–F
  bibliography/         # references.bib
  figures/              # ryciny (PDF/PNG)
  notes/                # konspekt MD (nie wchodzi do PDF)
  exports/              # lokalne PDF do promotora (gitignored)
  skills/latex-thesis/  # skill multi-agent
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
