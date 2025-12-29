# Prompty Suno.com dla Stylów Muzycznych

Ten dokument zawiera prompty do generowania muzyki ambientowej/backgroundowej w Suno.com dla każdego stylu muzycznego dostępnego w wizard profilu.

## Struktura Promptów

Każdy styl ma:
- **Prompt dla trybu Simple** - krótki opis dla szybkiej generacji
- **Prompt dla trybu Custom** - bardziej szczegółowy opis z dodatkowymi parametrami stylu

---

## 1. Jazz (Smooth, sophisticated, relaxed)

### Simple Mode:
```
Smooth jazz instrumental ambient background music, sophisticated and relaxed, soft piano and saxophone melodies, cozy atmosphere
```

### Custom Mode (Detailed):
```
Instrumental smooth jazz ambient track, sophisticated and relaxed atmosphere. Features soft piano melodies, gentle saxophone, subtle bass lines, and minimal percussion. Perfect for cozy, elegant interior spaces. No vocals, pure instrumental background music.
```

---

## 2. Classical (Elegant, timeless, calm)

### Simple Mode:
```
Elegant classical instrumental ambient music, timeless and calm, soft orchestral strings and piano, peaceful atmosphere
```

### Custom Mode (Detailed):
```
Instrumental classical ambient piece, elegant and timeless. Features soft orchestral strings, gentle piano melodies, minimal arrangement, and calm atmospheric qualities. Perfect for sophisticated, peaceful interior spaces. No vocals, pure instrumental background music.
```

---

## 3. Electronic (Modern, energetic, focused)

### Simple Mode:
```
Modern electronic ambient background music, energetic and focused, subtle synth melodies, contemporary atmosphere
```

### Custom Mode (Detailed):
```
Instrumental electronic ambient track, modern and focused. Features subtle synth melodies, gentle electronic beats, atmospheric pads, and contemporary sound design. Energetic yet not overwhelming, perfect for modern interior spaces. No vocals, pure instrumental background music.
```

---

## 4. Rock (Energetic, dynamic, lively)

### Simple Mode:
```
Rock instrumental, [Electric Guitar] [Drums], energetic, background
```

### Custom Mode (Style field):
```
Rock, instrumental, [Electric Guitar] [Rhythm Section], energetic, dynamic
```

---

## 5. Funk (Rhythmic, vibrant, danceable)

### Simple Mode:
```
Funk groove, instrumental, [Funky Bass] [Rhythm Guitar], vibrant, background
```

### Custom Mode (Style field):
```
Funk, instrumental, [Groovy Bass] [Rhythm Guitar] [Soft Drums], vibrant, rhythmic
```

---

## 6. Pop (Catchy, upbeat, universal)

### Simple Mode:
```
Pop instrumental, [Piano] [Synthesizer], upbeat, background
```

### Custom Mode (Style field):
```
Pop, instrumental, [Catchy Melody] [Soft Beat], upbeat, bright
```

---

## Wskazówki dla Suno.com

### Tryb Simple:
- Użyj krótszych promptów (max 2-3 zdania)
- Opisz główne cechy: styl, nastrój, instrumenty
- Dodaj słowo "instrumental" lub "background music"

### Tryb Custom:
- Możesz dodać więcej szczegółów o instrumentach
- Opisz atmosferę i cel użycia
- Wyraźnie zaznacz "No vocals" dla muzyki instrumentalnej
- Możesz dodać tempo/speed: "slow tempo", "relaxed pace", etc.

### Wspólne Elementy dla Ambient Music:
- Zawsze dodaj "instrumental" lub "background music"
- Użyj słów: "ambient", "atmospheric", "soft", "gentle"
- Unikaj głośnych, agresywnych opisów
- Podkreśl funkcję: "perfect for interior spaces", "background music"

---

## Użycie w Projekcie

Te prompty można użyć w:
- Generowaniu muzyki ambientowej dla użytkowników
- Tworzeniu playlisty muzyki tła w pokojach
- Personalizacji doświadczenia audio na podstawie wyboru użytkownika w wizard profilu

---

## Mapa: Music Preference ID → Suno Prompt

```typescript
const SUNO_PROMPTS = {
  jazz: "Smooth jazz, instrumental, [Piano] [Saxophone], relaxed tempo, ambient background",
  classical: "Classical instrumental, [Strings] [Piano], calm tempo, ambient background",
  electronic: "Electronic ambient, instrumental, [Synthesizer], energetic, background music",
  rock: "Rock instrumental, [Electric Guitar] [Drums], energetic, background",
  funk: "Funk groove, instrumental, [Funky Bass] [Rhythm Guitar], vibrant, background",
  pop: "Pop instrumental, [Piano] [Synthesizer], upbeat, background"
};
```
