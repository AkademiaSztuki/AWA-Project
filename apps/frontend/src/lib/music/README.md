# Music Generation Prompts for Suno.com

Ten katalog zawiera prompty do generowania muzyki ambientowej w Suno.com dla stylów muzycznych używanych w wizard profilu.

## Pliki

- `suno-prompts.ts` - TypeScript moduł z promptami i funkcjami pomocniczymi
- `../../SUNO_MUSIC_PROMPTS.md` - Szczegółowa dokumentacja z przykładami

## Użycie

```typescript
import { getSunoPrompt, SUNO_PROMPTS } from '@/lib/music/suno-prompts';

// Podstawowe użycie
const jazzPrompt = getSunoPrompt('jazz', 'simple');
// → "Smooth jazz instrumental ambient background music..."

// Użycie z trybem custom
const classicalPrompt = getSunoPrompt('classical', 'custom');
// → "Instrumental classical ambient piece, elegant and timeless..."

// Bezpośredni dostęp
const electronicPrompt = SUNO_PROMPTS.simple.electronic;
```

## Mapowanie na Music Preferences

Prompty odpowiadają ID z `MUSIC_PREFERENCES` w `@/lib/questions/validated-scales.ts`:

- `jazz` → Smooth, sophisticated, relaxed
- `classical` → Elegant, timeless, calm
- `electronic` → Modern, energetic, focused
- `rock` → Energetic, dynamic, lively
- `funk` → Rhythmic, vibrant, danceable
- `pop` → Catchy, upbeat, universal

## Dokumentacja Suno.com

Więcej informacji o korzystaniu z Suno.com:
- [Suno Help Center](https://help.suno.com)
- Tryb Simple: krótkie opisy (2-3 zdania)
- Tryb Custom: szczegółowe opisy z parametrami
