# Instrukcje zastosowania refaktoru bazy danych

## Krok 1: Zastosuj migrację SQL

Otwórz **Supabase Dashboard** → **SQL Editor** i wykonaj plik:
`apps/frontend/supabase/migrations/20250123000000_radical_refactor.sql`

Lub użyj psql:
```bash
psql "postgresql://[connection_string]" < apps/frontend/supabase/migrations/20250123000000_radical_refactor.sql
```

## Krok 2: Utwórz bucket Storage

Uruchom:
```bash
npm run storage:create-bucket
```

Lub ręcznie w Supabase Dashboard:
1. Storage → Create bucket
2. Nazwa: `participant-images`
3. Public: ✅ TAK
4. File size limit: 10MB
5. Allowed MIME types: `image/jpeg, image/png, image/webp`

## Krok 3: Sprawdź czy wszystko działa

Aplikacja powinna teraz:
- Zapisować dane do `participants` zamiast `sessions`
- Zapisować swipe'y do `participant_swipes`
- Zapisować generacje do `participant_generations`
- Zapisować obrazy do `participant_images`

## Uwaga

Stare tabele (`sessions`, `spaces`, `space_images`, itp.) są nadal dostępne dla kompatybilności wstecznej.
Po upewnieniu się, że wszystko działa, możesz je usunąć.

