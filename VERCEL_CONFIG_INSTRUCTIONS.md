# 📝 Instrukcja: Zmiana brancha produkcyjnego w Vercel

## Problem
Vercel deployuje z brancha `cursor/fix-missing-room-image-for-generation-b73f` zamiast z `main`.

## Rozwiązanie - Zmiana w Dashboard Vercel

### Krok 1: Otwórz Dashboard Vercel
1. Idź do: https://vercel.com/dashboard
2. Zaloguj się do konta

### Krok 2: Znajdź Projekt
1. Znajdź projekt: **`awa-project-frontend-fhka`** (lub inny odpowiedni)
2. Kliknij na nazwę projektu

### Krok 3: Przejdź do Settings
1. Kliknij zakładkę **"Settings"** (po lewej stronie)
2. Przewiń do sekcji **"Git"**

### Krok 4: Zmień Production Branch
1. W sekcji **"Production Branch"** znajdź dropdown
2. Zmień z: `cursor/fix-missing-room-image-for-generation-b73f`
3. Na: **`main`**
4. Kliknij **"Save"**

### Krok 5: Weryfikacja
1. Po zapisaniu, Vercel automatycznie rozpocznie deployment z brancha `main`
2. Sprawdź zakładkę **"Deployments"** - powinien pojawić się nowy deployment z `main`

---

## Alternatywnie: Link bezpośredni
Jeśli masz dostęp do projektu, możesz też użyć bezpośredniego linku:
- `https://vercel.com/[twoja-nazwa-uzytkownika]/awa-project-frontend-fhka/settings/git`

---

## ✅ Po zmianie
- Vercel będzie automatycznie deployować z brancha `main`
- Każdy push do `main` uruchomi nowy deployment produkcyjny
- Branch `cursor/fix-missing-room-image-for-generation-b73f` może być używany tylko do preview deployments

---

**Uwaga:** Błąd typu w `RoomSetup.tsx` został już naprawiony w obu branchach (commit `355844d`).

