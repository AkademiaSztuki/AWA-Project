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
```

**Uwaga:** Projekt może działać lokalnie bez tych zmiennych, ale niektóre funkcje mogą nie działać.

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





