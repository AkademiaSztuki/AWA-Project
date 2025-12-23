# 📊 Eksport danych z Supabase do CSV

## Sposób 1: Automatyczny skrypt (NAJŁATWIEJSZY) ⭐

### Krok 1: Upewnij się, że masz zmienne środowiskowe

W pliku `.env.local` musisz mieć:
```env
NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=twoj-service-role-key
```

**Gdzie znaleźć Service Role Key:**
1. Otwórz Supabase Dashboard
2. Settings → API
3. Skopiuj **service_role** key (nie anon key!)

### Krok 2: Uruchom skrypt

```bash
cd apps/frontend
npm run export:csv
```

Lub bezpośrednio:
```bash
node scripts/export-to-csv.js
```

**Wymuszenie eksportu konkretnych tabel:**
Jeśli tabela istnieje, ale nie została automatycznie wykryta, możesz wymusić jej eksport:
```bash
node scripts/export-to-csv.js --force-tables=rooms,households
```

**Co robi skrypt:**
- ✅ **Automatycznie wykrywa** wszystkie dostępne tabele i widoki w bazie
- ✅ Eksportuje tylko te, które faktycznie istnieją
- ✅ Pokazuje listę znalezionych tabel/widoków
- ✅ Tworzy osobny plik CSV dla każdej tabeli/widoku

### Krok 3: Znajdź pliki CSV

Pliki zostaną zapisane w:
```
apps/frontend/exports/YYYY-MM-DDTHH-MM-SS/
```

Każdy widok/tabela będzie w osobnym pliku CSV, gotowym do otwarcia w Excel/Python/R.

**Przykładowy output:**
```
🔍 Sprawdzam dostępne tabele i widoki...
   Sprawdzam 48 możliwych tabel/widoków...
   Sprawdzono 48/48...

   ✅ Znaleziono 9 widoków i 15 tabel
   Widoki: research_participants_summary, research_complete_export, ...
   Tabele: user_profiles, sessions, survey_results, ...
```

---

## Sposób 2: Bezpośrednio z Supabase Dashboard

### Krok 1: Otwórz Supabase Dashboard

1. Przejdź do **Table Editor**
2. Wybierz widok (np. `research_participants_summary`)

### Krok 2: Eksportuj

1. Kliknij przycisk **Export** (u góry)
2. Wybierz **CSV**
3. Plik zostanie pobrany

**Uwaga:** To działa tylko dla widoków/tabel, które są widoczne w Table Editor.

---

## Sposób 3: SQL Editor + Export

### Krok 1: Otwórz SQL Editor

1. Supabase Dashboard → **SQL Editor**
2. Utwórz nowe zapytanie

### Krok 2: Uruchom zapytanie

Skopiuj jedno z zapytań z `export_to_csv.sql`:

```sql
SELECT * FROM research_complete_export;
```

### Krok 3: Eksportuj wyniki

1. Po uruchomieniu zapytania kliknij przycisk **Export** (u góry)
2. Wybierz **CSV**
3. Plik zostanie pobrany

---

## Sposób 4: pg_dump (dla zaawansowanych)

Jeśli masz dostęp do PostgreSQL CLI:

```bash
pg_dump -h db.xxxxx.supabase.co \
        -U postgres \
        -d postgres \
        -t research_complete_export \
        --csv \
        -o export.csv
```

---

## Który sposób wybrać?

- **Sposób 1 (skrypt)** - Najłatwiejszy, eksportuje wszystko naraz ✅
- **Sposób 2 (Dashboard)** - Szybki, ale trzeba eksportować każdy widok osobno
- **Sposób 3 (SQL Editor)** - Elastyczny, możesz filtrować dane przed eksportem
- **Sposób 4 (pg_dump)** - Dla zaawansowanych użytkowników

---

## Rozwiązywanie problemów

### Problem: "Brak zmiennych środowiskowych"

**Rozwiązanie:** 
- Sprawdź, czy masz plik `.env.local` w `apps/frontend/`
- Upewnij się, że masz `NEXT_PUBLIC_SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY`

### Problem: "Access denied" / "Permission denied"

**Rozwiązanie:**
- Użyj **Service Role Key**, nie Anon Key
- Service Role Key ma pełne uprawnienia do odczytu wszystkich danych

### Problem: "View does not exist"

**Rozwiązanie:**
- Upewnij się, że uruchomiłeś `research_views.sql` w SQL Editor
- Sprawdź w Table Editor, czy widoki `research_*` są widoczne

### Problem: "Puste pliki CSV"

**Rozwiązanie:**
- To normalne, jeśli widok nie ma danych
- Sprawdź w Supabase, czy są jakieś dane w tabelach źródłowych

---

## Struktura eksportowanych danych

### Widoki badawcze (research_*):
- `research_participants_summary` - Podsumowanie uczestników
- `research_complete_export` - Pełny eksport wszystkich danych
- `research_tinder_analysis` - Analiza swipe'ów Tinder
- `research_style_preferences` - Preferencje stylów
- `research_sus_scores` - Wyniki SUS (System Usability Scale)
- `research_clarity_scores` - Wyniki jasności preferencji
- `research_big_five` - Wyniki Big Five
- `research_style_distribution` - Rozkład stylów
- `research_reaction_times` - Czasy reakcji
- `research_generation_analysis` - Analiza generacji

### Tabele:
- `user_profiles` - Profile użytkowników
- `sessions` - Sesje użytkowników
- `survey_results` - Wyniki ankiet
- `generation_feedback` - Feedback do generacji
- `research_consents` - Zgody badawcze

---

## Użycie w Python

```python
import pandas as pd

# Wczytaj CSV
df = pd.read_csv('exports/2024-01-15T10-30-00/research_complete_export.csv')

# Analiza
print(df.describe())
print(df.head())
```

## Użycie w R

```r
# Wczytaj CSV
data <- read.csv('exports/2024-01-15T10-30-00/research_complete_export.csv')

# Analiza
summary(data)
head(data)
```

---

## Automatyczny eksport (opcjonalnie)

Możesz dodać do cron/planowania zadań, aby eksportować dane automatycznie:

```bash
# Eksport codziennie o 2:00
0 2 * * * cd /path/to/project/apps/frontend && npm run export:csv
```

