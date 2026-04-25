# Instrukcja Uruchomienia Projektu Lokalnie

## Krok 1: Zainstaluj Node.js

1. Pobierz Node.js z oficjalnej strony: https://nodejs.org/
2. Zainstaluj wersję **LTS** (Long Term Support) - zalecana wersja 18 lub wyższa
3. Po instalacji, zamknij i otwórz ponownie PowerShell/Terminal
4. Sprawdź instalację:
   ```powershell
   node --version
   npm --version
   ```

## Krok 2: Zainstaluj pnpm

pnpm to menedżer pakietów używany w tym projekcie. Zainstaluj go globalnie:

```powershell
npm install -g pnpm
```

Sprawdź instalację:
```powershell
pnpm --version
```

## Krok 3: Zainstaluj zależności projektu

W głównym katalogu projektu (`AWA-Project`) uruchom:

```powershell
pnpm install
```

To zainstaluje wszystkie zależności dla całego monorepo (frontend, backend, shared packages).

## Krok 4: Skonfiguruj zmienne środowiskowe (opcjonalne)

Jeśli chcesz połączyć się z Supabase i backendem, utwórz plik `.env.local` w folderze `apps/frontend/`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_MODAL_API_URL=your-modal-endpoint
NEXT_PUBLIC_GCP_API_BASE_URL=https://your-backend-gcp.example.run.app
# Optional: force in-process anon limits (skip Cloud SQL tables)
# AWA_ANON_LIMITS_MEMORY_ONLY=true
```

**Uwaga:** Projekt może działać lokalnie bez tych zmiennych, ale niektóre funkcje mogą nie działać.

**Limity anon (1 generacja / ścieżka + sufit IP):** zastosuj migrację na bazie (wymaga `DATABASE_URL`, np. przez Cloud SQL Proxy), z katalogu głównego repo:

```powershell
$env:DATABASE_URL = "postgresql://awa_app:HASLO@127.0.0.1:5432/awa_db"
pnpm db:migrate:anon-usage
```

Szablony zmiennych: [apps/backend-gcp/.env.example](apps/backend-gcp/.env.example), [apps/frontend/.env.example](apps/frontend/.env.example). Backend obsługuje `POST /api/anon/check-limits` i `POST /api/anon/deduct`. Ustaw ten sam `AURA_IP_HASH_SALT` (frontend + backend / Cloud Run).

## Krok 5: Uruchom projekt

### Opcja A: Uruchom wszystko (frontend + backend)
```powershell
pnpm dev
```

### Opcja B: Tylko frontend
```powershell
pnpm dev:frontend
```

lub bezpośrednio:
```powershell
cd apps/frontend
pnpm dev
```

Frontend powinien być dostępny na: **http://localhost:3000**

## Rozwiązywanie problemów

### Problem: "pnpm: command not found"
- Upewnij się, że Node.js jest zainstalowany
- Zainstaluj pnpm: `npm install -g pnpm`
- Zamknij i otwórz ponownie terminal

### Problem: "Error: EACCES" lub problemy z uprawnieniami
- Na Windows, uruchom PowerShell jako Administrator
- Lub użyj: `npm install -g pnpm --force`

### Problem: Błędy podczas `pnpm install`
- Sprawdź czy masz połączenie z internetem
- Spróbuj: `pnpm install --force`
- Usuń `node_modules` i `pnpm-lock.yaml`, potem uruchom ponownie `pnpm install`

### Problem: Port 3000 jest zajęty
- Zmień port w `apps/frontend/package.json`: `"dev": "next dev -p 3001"`
- Lub zatrzymaj proces używający portu 3000

## Wymagania systemowe

- **Node.js**: 18.0.0 lub wyższa
- **pnpm**: Najnowsza wersja
- **System operacyjny**: Windows 10/11, macOS, lub Linux





