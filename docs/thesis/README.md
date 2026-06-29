# Praca pisemna (branch `pisemna`)

Materiały pisemne do pracy doktorskiej / naukowej — oddzielone od kodu aplikacji.

## Branch

| Branch    | Przeznaczenie                          |
|-----------|----------------------------------------|
| `main`    | Aplikacja IDA, deploy, zmiany w kodzie |
| `pisemna` | Tylko treści pod pracę pisemną         |

**Zasada:** na `pisemna` edytuj wyłącznie pliki w `docs/thesis/`. Nie zmieniaj `apps/`, `infra/` ani konfiguracji deployu.

## Struktura

```
docs/thesis/
  notes/
    SPIS_TRESCI_ROBOCZY.md   # roboczy spis treści + uzasadnienie rozdziałów
  chapters/      # rozdziały (.md, .tex)
  figures/       # wykresy, diagramy, screeny do pracy
  bibliography/  # bibtex, źródła
  exports/       # PDF / Word do oddania (gitignore — lokalnie)
```

## Workflow

```powershell
# Pisanie pracy
git checkout pisemna
git merge main    # opcjonalnie: aktualny opis projektu

# Tylko materiały pisemne
git add docs/thesis/
git commit -m "thesis: ..."

# Powrót do kodu
git checkout main
```

Merge `pisemna` → `main` tylko świadomie (np. gdy metodologia ma być w głównym repo).

## Pliki poza git

- Szkice `.docx` / `.doc` — trzymaj lokalnie lub w `exports/` (ignorowane przez git)
- Duże PDF-y do promotora — folder `exports/`

Źródła wersjonuj w `chapters/` (Markdown lub LaTeX).
