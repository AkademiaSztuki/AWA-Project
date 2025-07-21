# Aura Frontend - Next.js Application

Aplikacja badawcza do eksploracji współpracy człowieka z AI w projektowaniu wnętrz.

## Features

- **Interaktywna postać AWA** - model 3D z śledzeniem myszy
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

## Struktura

- `src/app/` - Next.js routing
- `src/components/awa/` - komponenty postaci AWA
- `src/components/screens/` - ekrany przepływu
- `src/components/ui/` - glassmorphism UI
- `src/hooks/` - React hooks
- `src/lib/` - utilities i konfiguracja

## Model Quinn

Umieść plik `SKM_Quinn.gltf` w `public/models/` wraz z teksturami.
