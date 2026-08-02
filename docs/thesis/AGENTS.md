# Multi-agent writing guide — praca doktorska IDA

Branch: **`pisemna`**. Edytuj wyłącznie **`docs/thesis/`** (to jest kanoniczny folder pracy — nie ma osobnego `/thesis` w rootcie repo).

## Cel

Równoległe pisanie rozprawy w LaTeX: każdy agent ma własny zakres plików, **wspólny słownik**, wspólny build i wspólną bibliografię — żeby narracja się nie rozsypała.

## Kanon spójności (czytaj w tej kolejności)

1. **`GLOSSARY.md`** — obowiązkowy. Terminy, nazwy własne, RQ, 6 źródeł, FLUX vs Gemini, ComfyUI = pracownia.  
2. **`AGENTS.md`** (ten plik) — ownership i zasady edycji.  
3. **`notes/SPIS_TRESCI_PROPOZYCJA_ASP.md`** — aktualny spis / narracja ASP.  
4. **`notes/HIPOTEZY_REWIZJA.md`** — RQ1–RQ6.  
5. **`metadata.tex`** — tytuł, promotor, uczelnia.  

Nowy termin / skrót / nazwa modelu → najpierw wpis w `GLOSSARY.md`, potem proza w `.tex` i ewentualnie `frontmatter/abbreviations.tex`.

## Build

```bash
cd docs/thesis
make pdf          # pełny PDF → main.pdf
make watch        # ciągła kompilacja
make chapter C=06-metodologia   # tylko wybrany rozdział (\includeonly)
make clean
```

Wymagania lokalne: TeX Live (LuaLaTeX), `latexmk`, `biber`, fonty Latin Modern.

## Pasy agentów (ownership)

| Pas (`OWNER`) | Pliki | Fokus |
|---------------|-------|-------|
| `framing` | `frontmatter/*`, `chapters/01-wprowadzenie.tex`, `metadata.tex`\* | Tytuł, streszczenia, wprowadzenie |
| `theory-a` | `chapters/02-*.tex`, `chapters/03-*.tex` | Psychologia środowiskowa, preferencje |
| `theory-b` | `chapters/04-*.tex`, `chapters/05-*.tex` | Osobowość, AI/HCI/RtD |
| `methods` | `chapters/06-*.tex`, `backmatter/appendix-{a,b,e,f}-*.tex` | Metodologia, etyka, zmienne |
| `artifact` | `chapters/07-*.tex`, `backmatter/appendix-{c,d}-*.tex` | Platforma IDA, prompty, mapowania |
| `empirical` | `chapters/08-*.tex`, `chapters/09-*.tex`, `chapters/10-*.tex` | Wyniki, dyskusja, wnioski |
| `media-lab` | przyszły rozdz. o ComfyUI/SAM/depth + `figures/comfyui/` | Pracownia generatywna (poza runtime IDA) |
| `coordinator` | `main.tex`, `preamble.tex`, `metadata.tex`, `GLOSSARY.md`, `latexmkrc`, `Makefile`, `AGENTS.md` | Struktura, słownik, pakiety, konflikty |

\* `metadata.tex` — tylko `coordinator` / `framing` po uzgodnieniu.

## Zasady konfliktu (obowiązkowe)

1. **Jeden agent = jego pliki.** Nie edytuj cudzego rozdziału bez prośby użytkownika.
2. **Nagłówek pliku** zawsze zawiera:
   ```tex
   % OWNER: theory-a
   % STATUS: outline|draft|review|final
   ```
3. **Etykiety** z namespace rozdziału:
   - sekcje: `\label{ch07:sec:macierz}`
   - figury: `\label{fig:ch07:flow}`
   - tabele: `\label{tab:ch06:instruments}`
   - załączniki: `\label{app:c:top}`
4. **Cytowania:** dokładaj wpisy do `bibliography/references.bib` kluczem `authorYearKeyword`. Nie usuwaj cudzych wpisów.
5. **Shared files** (`preamble.tex`, `main.tex`): zmiany tylko jako `coordinator`; opisz je w commit message.
6. **Placeholdery:**
   - `\Todo{...}` — treść do napisania
   - `\NeedsCite{...}` — brakujące źródło
   - `\AgentNote{...}` — krótka notka międzyagentowa (usunąć przed finalem)
7. **Język prozy:** polski w korpusie; angielski tylko w Abstract i cytowanych tytułach.
8. **Bez sekretów / PII** w tekście i załącznikach (żadnych kluczy API, maili uczestników, raw eksportów).
9. **Figury** wrzucaj do `figures/` jako PDF/PNG; nazwa: `ch07-flow-overview.pdf`.
10. **Commit message** (EN): `thesis(ch06): outline instruments table`

## Równoległy workflow (rekomendowany)

1. Użytkownik odpala N agentów z jasnym `OWNER` (np. „jesteś theory-a”).
2. Każdy agent czyta: `GLOSSARY.md` → ten plik → `skills/latex-thesis/SKILL.md` → spis ASP → swój rozdział.
3. Agent pisze tylko w swoich `.tex`; dopina bib; kompiluje `make chapter C=...` lub pełne `make pdf`.
4. `coordinator` scala konflikty w `GLOSSARY.md` / `references.bib` / preambule i pilnuje buildu.

## STATUS lifecycle

`outline` → `draft` → `review` → `final`

Nie ustawiaj `final`, dopóki nie znikną `\Todo` / `\NeedsCite` w pliku.

## Źródła wewnętrzne (nie cytować jako publikacje)

- `GLOSSARY.md` — kanon terminów
- `notes/SPIS_TRESCI_PROPOZYCJA_ASP.md` — spis pod ASP (aktualny)
- `notes/SPIS_TRESCI_ROBOCZY.md` — starszy spis (archiwum robocze)
- `notes/HIPOTEZY_REWIZJA.md` — aktualne RQ / operacjonalizacja
- kod / SQL projektu — opisuj w rozdziałach o artefakcie i załącznikach; do bibliografii tylko gdy formalnie publikowane

## Czego nie robić

- Merge `pisemna` → `main` bez decyzji użytkownika
- Edycja `apps/`, `infra/` na tym branchu
- Commit PDF do gita (`exports/` i `*.pdf` build są ignorowane; wyjątek: figury źródłowe w `figures/`)
