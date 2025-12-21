# Aura Frontend - Next.js Application

Aplikacja badawcza do eksploracji współpracy człowieka z AI w projektowaniu wnętrz.

## Features

- **Interaktywna postać IDA** - model 3D z śledzeniem myszy
- **Glassmorphism UI** - perłowo-złoto-srebrny design system  
- **Research Through Design** - kompletny przepływ zbierania danych
- **FLUX Integration** - generowanie obrazów przez Modal API
- **Responsive Design** - optymalizacja dla wszystkich urządzeń

## Technologie

- Next.js 14 (App Router)
- Three.js + React Three Fiber
- Framer Motion
- Tailwind CSS
- Supabase
- TypeScript

## Uruchomienie

```bash
npm install
npm run dev
```

## Konfiguracja

### Zmienne środowiskowe

Skopiuj `.env.example` do `.env.local` i uzupełnij:

- `GOOGLE_AI_API_KEY` - Klucz API Google AI (używany do Gemini 2.5 Flash-Lite dla tagowania obrazów)
  - Otrzymaj klucz na: https://ai.google.dev/
- `GOOGLE_CLOUD_PROJECT` - ID projektu Google Cloud (wymagane dla generowania obrazów przez Vertex AI)
  - Format: `project-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX` lub nazwa projektu
  - Znajdziesz w: https://console.cloud.google.com/
  - Uwaga: Generowanie obrazów wymaga OAuth 2.0 (Application Default Credentials)
  - W środowisku produkcyjnym (np. Vercel) skonfiguruj zmienną środowiskową `GOOGLE_APPLICATION_CREDENTIALS` z kluczem service account
  - Lokalnie: użyj `gcloud auth application-default login` lub ustaw `GOOGLE_APPLICATION_CREDENTIALS` na ścieżkę do JSON key
- `GOOGLE_CLOUD_LOCATION` - Lokalizacja Vertex AI (opcjonalne, domyślnie `global`)
- `NEXT_PUBLIC_MODAL_API_URL` - URL do Modal.com API (FLUX 2 Dev)

## Struktura

- `src/app/` - Next.js routing
- `src/components/awa/` - komponenty postaci IDA
- `src/components/screens/` - ekrany przepływu
- `src/components/ui/` - glassmorphism UI
- `src/hooks/` - React hooks
- `src/lib/` - utilities i konfiguracja

## Model Quinn

Umieść plik `SKM_Quinn.gltf` w `public/models/` wraz z teksturami.
