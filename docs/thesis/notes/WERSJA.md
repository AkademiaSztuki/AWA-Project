# Mapa wersji roboczej (IDA)

Najnowsze opublikowane archiwum: **[robocza-08.pdf](../wersje-pdf/robocza-08.pdf)**; źródła: [robocza-08](../wersje-tex/robocza-08/). Zachowane są także PDF-y 01–07 i snapshot źródeł 07. Poniższa mapa opisuje starszy katalog roboczy (06).

## Obecna: **robocza-06** (logicznie 0006, 2026-10-05)

| Co | Gdzie |
|----|--------|
| **Edycja na co dzień** | `docs/thesis/` — `chapters/`, `frontmatter/`, `backmatter/`, `metadata.tex`, `preamble.tex` |
| **Skład PDF** | `make pdf` w `docs/thesis/` → `main.pdf` |
| **Archiwum PDF** | `wersje-pdf/robocza-06.pdf` |
| **Snapshot źródeł .tex** | `wersje-tex/robocza-06/` |
| **Etykieta na tytule** | `metadata.tex` → `\ThesisVersionLabel` |

`main.tex` w katalogu głównym to tylko szkielet (`\include` rozdziałów) — proza jest w `chapters/*.tex`. Patrz `notes/JAK-OTWIERAC-WERSJE.md`.

## Wersje zachowane na dysku

| Wersja | Znaczenie | PDF | Snapshot `.tex` |
|--------|-----------|-----|-----------------|
| **robocza-01** (0001) | Dobra baza prozy przed przepisem Grok | `wersje-pdf/robocza-01.pdf` | `wersje-tex/robocza-01/` |
| **robocza-02** (0002) | Odrzucony przepis Grok — tylko PDF | `wersje-pdf/robocza-02.pdf` | *brak* |
| **robocza-03** (0003) | Tekst po powrocie do bazy 01 + redakcja | `wersje-pdf/robocza-03.pdf` | `wersje-tex/robocza-03/` |
| **robocza-04** (0004) | Przebudowa składu: `styles/` + hyperref; PDF ekranowy | `wersje-pdf/robocza-04.pdf` | `wersje-tex/robocza-04/` |
| **robocza-05** (0005) | Strony objaśnień skrótów; klik otwiera hasło, „Wróć” to GoBack | `wersje-pdf/robocza-05.pdf` | `wersje-tex/robocza-05/` |
| **robocza-06** (0006) | Hasło otwiera się od góry strony; bez urwanych kresek przy linkach | `wersje-pdf/robocza-06.pdf` | `wersje-tex/robocza-06/` |

Numery **000N** w notatkach = ta sama wersja co **robocza-NN**; nie ma osobnych folderów `wersje-tex/000N/` ani plików `wersje-pdf/000N.pdf`. `\ThesisVersionLabel` zwykle idzie z tym numerem; przy **robocza-04** i **robocza-05** na stronie tytułowej zostało „wersja robocza 3”.

## Przekierowania

| Stara ścieżka | Teraz |
|---------------|--------|
| `versions/robocza-01/` | tylko `README.md` → `wersje-tex/robocza-01/` |
| `wersje-tex/0001/`, `0003/` | usunięte (duplikaty junction/kopii) |
| `wersje-pdf/000N.pdf` | usunięte — używaj `robocza-NN.pdf` |

## Skrypty

```powershell
cd docs/thesis
make pdf                              # build + zapis wersje-pdf/robocza-NN.pdf (N z tego pliku)
.\scripts\snapshot-wersja-tex.ps1 -Number 3
.\scripts\build-wersja-tex-pdf.ps1 -Number 1
```

Figury (`figures/`) nie są kopiowane do snapshotów — współdzielone z katalogu roboczego. Od **robocza-04** snapshot obejmuje też `styles/` (bez tego przebudowy składu nie da się odtworzyć). Etykieta na stronie tytułowej (`metadata.tex`) przy archiwum 04 i 05 nadal brzmi „wersja robocza 3”.

## Następna wersja (robocza-07)

1. Dokończ redakcję w `docs/thesis/`.
2. Zaktualizuj sekcję **Obecna** powyżej i `\ThesisVersionLabel` w `metadata.tex`.
3. `make pdf` → `wersje-pdf/robocza-07.pdf`.
4. `.\scripts\snapshot-wersja-tex.ps1 -Number 7` → `wersje-tex/robocza-07/`.

## Git (skrót)

- `99ed463` na `main` — pierwszy pełny import drzewa `.tex` (treść ≠ robocza-01 na dysku).
- Stan **robocza-03** = ówczesny working tree + snapshot; nie odtwarzasz 0001/0002/0003 samym `git checkout`.
- Stan **robocza-04** = working tree po przebudowie składu + snapshot na dysku; też nie samym `git checkout`.

## Inne pliki PDF

- `main-verify.pdf` — build testowy, nie archiwum wersji.
- `wersje-pdf/robocza-*.pdf` — publikowane w Git na prośbę użytkownika; pozostałe pliki kompilacji są ignorowane.
