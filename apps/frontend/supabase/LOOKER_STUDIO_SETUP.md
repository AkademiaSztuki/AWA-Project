# Looker Studio Setup - Wykresy z Supabase

## Krok 1: Utwórz widoki SQL w Supabase

1. Otwórz **Supabase Dashboard** → **SQL Editor**
2. Otwórz plik `research_views.sql`
3. Skopiuj całą zawartość
4. Wklej do SQL Editor
5. Kliknij **Run**

To utworzy 10 widoków z danymi badawczymi.

## Krok 2: Podłącz Looker Studio do Supabase

### 2.1. Pobierz Connection String z Supabase

1. Idź do **Supabase Dashboard** → **Settings** → **Database**
2. Znajdź sekcję **Connection string**
3. Wybierz **URI** (nie Session mode)
4. Skopiuj connection string (wygląda jak: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`)

### 2.2. Utwórz nowy Data Source w Looker Studio

1. Otwórz [Looker Studio](https://lookerstudio.google.com/)
2. Kliknij **Create** → **Data Source**
3. Wyszukaj **PostgreSQL**
4. Kliknij **PostgreSQL** connector

### 2.3. Podaj dane połączenia

Wklej connection string z Supabase. Jeśli connection string ma format:
```
postgresql://postgres:password@host:5432/postgres
```

To w Looker Studio wypełnij:
- **Host**: część po `@` (np. `db.xxxxx.supabase.co`)
- **Port**: `5432`
- **Database**: `postgres`
- **Username**: `postgres`
- **Password**: hasło z connection string

**LUB** użyj pełnego connection string w polu "Connection string" (jeśli dostępne).

### 2.4. Wybierz widoki do wizualizacji

Po połączeniu zobaczysz listę tabel i widoków. Wybierz:
- `research_participants_summary`
- `research_tinder_analysis`
- `research_style_preferences`
- `research_sus_scores`
- `research_big_five`
- itd.

## Krok 3: Utwórz wykresy

### Przykładowe wykresy do stworzenia:

#### 1. Pie Chart: Rozkład ścieżek (Fast vs Full)
- **Data Source**: `research_participants_summary`
- **Metric**: `fast_track_users` vs `full_experience_users`
- **Chart Type**: Pie Chart

#### 2. Bar Chart: Preferencje stylów
- **Data Source**: `research_style_distribution`
- **Dimension**: `style_name`
- **Metric**: `count`
- **Chart Type**: Bar Chart

#### 3. Scatter Plot: Big Five vs Satysfakcja
- **Data Source**: `research_complete_export`
- **X-axis**: `openness` (lub inna cecha Big Five)
- **Y-axis**: `sus_score`
- **Chart Type**: Scatter Plot

#### 4. Line Chart: Czas reakcji w Tinder swipes
- **Data Source**: `research_reaction_times`
- **Dimension**: `reaction_category`
- **Metric**: `avg_reaction_time`
- **Chart Type**: Line Chart

#### 5. Histogram: Rozkład SUS scores
- **Data Source**: `research_sus_scores`
- **Metric**: `sus_score`
- **Chart Type**: Histogram

## Krok 4: Eksport do PDF/Excel

1. W Looker Studio kliknij **File** → **Download** → **PDF**
2. Lub **File** → **Download** → **CSV** (dla dalszej analizy w R/Python)

## Alternatywa: Eksport CSV bezpośrednio z Supabase

Jeśli nie chcesz używać Looker Studio, możesz eksportować dane bezpośrednio:

1. Supabase Dashboard → **Table Editor**
2. Wybierz widok (np. `research_participants_summary`)
3. Kliknij **Export** → **CSV**
4. Otwórz w Excel/R/Python do analizy

## Troubleshooting

### Problem: "Connection timeout"
- Sprawdź, czy connection string jest poprawny
- Upewnij się, że używasz **URI** connection string (nie Session mode)

### Problem: "Access denied"
- Sprawdź, czy hasło w connection string jest poprawne
- Upewnij się, że używasz credentials z **Database** settings, nie API keys

### Problem: "Views not visible"
- Upewnij się, że uruchomiłeś `research_views.sql` w Supabase SQL Editor
- Sprawdź w Supabase: **Table Editor** → powinny być widoczne widoki `research_*`

