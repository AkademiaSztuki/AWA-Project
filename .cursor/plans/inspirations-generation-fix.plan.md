# Plan: Kompleksowa Naprawa Generowania Inspiracji

## Problem
Dla niektórych użytkowników nie wszystkie 6 obrazów generuje się poprawnie w pierwszej części flow generowania. Przyczyny mogą być różne:

1. **Brak danych dla konkretnych źródeł** - np. brak inspiracji, niepełne dane Big Five, brak danych z Tinder
2. **Problemy z API Google** - timeouty, błędy quota, limity rate
3. **Problemy z przetwarzaniem obrazów inspiracji** - blob URLs nie konwertowane na base64, błędy fetch
4. **Problemy z jakością danych** - źródło ocenione jako `insufficient` i pominięte

## Analiza Kodu

### Główne Pliki
- `/apps/frontend/src/app/flow/generate/page.tsx` - główna strona generowania
- `/apps/frontend/src/lib/prompt-synthesis/index.ts` - synteza promptów dla 6 źródeł
- `/apps/frontend/src/lib/prompt-synthesis/data-quality.ts` - ocena jakości danych dla każdego źródła

### Flow Generowania
1. `synthesizeSixPrompts()` ocenia jakość danych dla 6 źródeł
2. Źródła z `shouldGenerate: false` są pomijane
3. Dla pozostałych źródeł generowane są prompty
4. `generateSixImagesParallelWithGoogle()` generuje obrazy równolegle
5. UI czeka na wszystkie oczekiwane źródła przed pokazaniem przycisku "Wybierz"

### Problem w UI (Naprawiony - Quick Fix)
```typescript
// BYŁO:
const isCompleteForGeneratedSources = synthesisResult.generatedSources.every(src =>
  matrixImages.some(img => img.provider === 'google' && img.source === src)
);

// JEST (po quick fix):
const hasAtLeastOneImage = readyCount >= 1;
```

## Plan Naprawy (Do Implementacji)

### Etap 1: Poprawa Diagnostyki
- [ ] Dodać szczegółowe logowanie błędów dla każdego źródła w `generateSixImagesParallelWithGoogle`
- [ ] Dodać telemetrię błędów do Supabase (tabela `generation_errors`)
- [ ] Pokazać użytkownikowi komunikat gdy źródło jest pominięte (np. "Brak danych z Tinder")

### Etap 2: Naprawa Konwersji Obrazów Inspiracji
**Plik:** `/apps/frontend/src/app/flow/generate/page.tsx` (linie ~1130-1200)

- [ ] Poprawić konwersję blob URL → base64 przed wysłaniem do API
- [ ] Dodać retry logic dla nieudanych konwersji
- [ ] Fallback: jeśli konwersja się nie uda, użyj URL z Supabase Storage

**Kod do naprawy:**
```typescript
// Linia ~1135: Filtrowanie blob URLs
if (url.startsWith('blob:')) {
  console.warn("[6-Image Matrix] Skipping blob URL inspiration image:", img.substring(0, 50));
  return null;
}
```

**Propozycja:**
```typescript
// Próba konwersji blob → base64
if (url.startsWith('blob:')) {
  try {
    const base64 = await convertBlobUrlToBase64(url);
    if (base64) return base64;
  } catch (e) {
    console.warn("[6-Image Matrix] Failed to convert blob URL:", e);
  }
  return null;
}
```

### Etap 3: Poprawa Obsługi Błędów API Google
**Plik:** `/apps/frontend/src/hooks/useGoogleAI.ts`

- [ ] Dodać retry z exponential backoff dla błędów 429 (rate limit) i 503 (overload)
- [ ] Timeout per-image zamiast globalnego timeout
- [ ] Partial success handling - zwracaj sukces dla obrazów które się udały

### Etap 4: Lepsze Fallbacki w Syntezie Promptów
**Plik:** `/apps/frontend/src/lib/prompt-synthesis/index.ts`

Aktualnie jest fallback gdy żadne źródło nie przejdzie quality check:
```typescript
if (availableSources.length === 0) {
  // Find the source with the best quality score (even if insufficient)
  const bestReport = qualityReports.reduce(...);
  if (bestReport) {
    availableSources = [bestReport.source];
  }
}
```

- [ ] Rozszerzyć fallback aby zawsze generować minimum 2-3 źródła
- [ ] Dodać "safe mode" który generuje Mixed/MixedFunctional nawet z ograniczonymi danymi

### Etap 5: UX Improvements
**Plik:** `/apps/frontend/src/app/flow/generate/page.tsx`

- [ ] Pokazać użytkownikowi które źródła się nie wygenerowały i dlaczego
- [ ] Przycisk "Spróbuj ponownie" dla pojedynczych źródeł które failowały
- [ ] Progress indicator pokazujący ile z ilu źródeł się udało

### Etap 6: Pre-emptive Data Validation
**Przed rozpoczęciem generowania:**

- [ ] Walidować dane przed rozpoczęciem generowania
- [ ] Ostrzec użytkownika jeśli brakuje kluczowych danych (np. "Dodaj inspiracje aby uzyskać lepsze wyniki")
- [ ] Automatycznie kierować na brakujące kroki (np. "Wróć do kroku inspiracji")

## Priorytety

1. **Wysoki** - Etap 2 (konwersja blob URLs) - najczęstsza przyczyna problemu
2. **Wysoki** - Etap 3 (retry logic dla API) - stabilność
3. **Średni** - Etap 5 (UX) - informowanie użytkownika
4. **Niski** - Etap 1 (diagnostyka) - debugging

## Testowanie

### Scenariusze do Przetestowania
1. Użytkownik bez żadnych inspiracji
2. Użytkownik z blob URL inspiracjami (nie zsynchronizowanymi)
3. Użytkownik bez ukończonego Big Five
4. Użytkownik bez Tinder swipes
5. Timeout API Google (symulowany)
6. Częściowy sukces (3/6 obrazów)

### Metryki Sukcesu
- % użytkowników którzy widzą minimum 3 obrazy
- % użytkowników którzy widzą wszystkie 6 obrazów
- Średni czas generowania
- % błędów per źródło

## Notatki

Ten plan zakłada że quick fix jest już zastosowany (pozwala kontynuować z minimum 1 obrazem).
Celem jest poprawienie success rate do >95% użytkowników widzi minimum 4 obrazy.
