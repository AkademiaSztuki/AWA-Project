# Szablon analityki — UTM i konwersje per kanał

**Metryka sukcesu (w kolejności ważności):**
1. **Pierwsza generacja** — użytkownik wgrał zdjęcie i dostał wynik
2. **Rejestracja** — konto założone
3. **Kliknięcie** — wejście z UTM

Kliknięcia bez rejestracji = copy lub kanał do poprawy.

---

## Konwencja UTM

**Bazowy URL:** `https://www.project-ida.com`

| Parametr | Wartości | Przykład |
|---|---|---|
| `utm_source` | platforma | `facebook`, `reddit`, `instagram`, `linkedin`, `email` |
| `utm_medium` | typ | `group`, `post`, `bio`, `dm`, `pr`, `forum` |
| `utm_campaign` | stała na fazę founderską | `founders` |
| `utm_content` | identyfikator miejsca | `urzadzamy-mieszkania`, `alphaandbetausers` |

**Przykład pełny:**
```
https://www.project-ida.com?utm_source=facebook&utm_medium=group&utm_campaign=founders&utm_content=urzadzamy-mieszkania
```

**Generator (ręczny):** skopiuj bazę + dopisz parametry. Nie używaj spacji — myślniki w `utm_content`.

---

## Tabela kanałów — do wypełniania co tydzień

| Kanał | utm_content | Data startu | Post / mail wysłany | Kliknięcia* | Rejestracje* | 1. generacja* | Notatki |
|---|---|---|---|---|---|---|---|
| FB Urządzamy Mieszkania | urzadzamy-mieszkania | | ☐ | | | | |
| FB AI Evolution | ai-evolution | | ☐ | | | | |
| FB ChatGPT i SI | chatgpt-pl | | ☐ | | | | |
| FB Architekt radzi | architekt-radzi | | ☐ | | | | |
| Forum Murator | wnetrza-thread | | ☐ | | | | |
| Forum BudujemyDom | wykaniczanie | | ☐ | | | | |
| LinkedIn founder | founder-story | | ☐ | | | | |
| IG Reels 1 | reels-1 | | ☐ | | | | |
| IG Reels 2 | reels-2 | | ☐ | | | | |
| IG Reels 3 | reels-3 | | ☐ | | | | |
| IG bio | bio | | ☐ | | | | |
| Reddit alphaandbetausers | alphaandbetausers | | ☐ | | | | |
| Reddit SideProject | sideproject | | ☐ | | | | |
| Mail PR Antyweb | antyweb | | ☐ | | | | |
| Mail PR MamStartup | mamstartup | | ☐ | | | | |
| Mail PR Spider's Web | spidersweb | | ☐ | | | | |
| Mail ASP rzecznik | asp-rzecznik | | ☐ | | | | |
| Mail Czas na Wnętrze | czasnawnetrze | | ☐ | | | | |
| DM @bezarchitekta.pl | bezarchitekta | | ☐ | | | | |
| DM @odinspiracjidorealizacji | odinspiracji | | ☐ | | | | |
| Email osobisty | [imie] | | ☐ | | | | |

\* Kliknięcia: Google Analytics 4 → Raporty → Pozyskiwanie ruchu → Traffic acquisition (filtr: `session source/medium` lub `campaign`). Rejestracje i generacje: dashboard aplikacji / Supabase — patrz sekcja poniżej.

---

## Tygodniowy przegląd (szablon)

**Tydzień:** ___________  
**Łącznie rejestracji:** ___  
**Łącznie pierwszych generacji:** ___  
**Konwersja rejestracja → generacja:** ___%

### Top 3 kanały (wg generacji)
1. 
2. 
3. 

### Kanały do wstrzymania / zmiany copy
- 

### Kanały do skalowania (więcej postów / follow-up)
- 

### Hipotezy na następny tydzień
- 

---

## Gdzie mierzyć

### Google Analytics 4
- Właściwość powiązana z project-ida.com
- **Eksploracja:** ścieżka z UTM → landing → `sign_up` (jeśli skonfigurowane zdarzenie)
- **Filtr:** `Session campaign` = `founders`

### Vercel Analytics (jeśli włączone)
- Ruch per referrer — uzupełnienie, nie zamiennik UTM

### Baza danych / Supabase
Zapytanie orientacyjne (dostosuj do schematu):
```sql
-- Przykład: użytkownicy z ostatnich 7 dni z polem utm_source (jeśli zapisujesz przy rejestracji)
SELECT
  utm_source,
  utm_medium,
  utm_content,
  COUNT(*) AS registrations
FROM profiles
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2, 3
ORDER BY registrations DESC;
```

Jeśli UTM nie jest jeszcze zapisywany przy rejestracji — rozważ dodanie w kolejnej iteracji (cookie `utm_*` → pole w profilu).

---

## KPI fazy founderskiej (30 dni)

| KPI | Cel minimalny | Cel ambitny |
|---|---|---|
| Rejestracje łącznie | 50 | 200 |
| Pierwsza generacja | 30 | 120 |
| Konwersja klik → rejestracja | 5% | 15% |
| Konwersja rejestracja → generacja | 50% | 70% |
| Aktywne kanały z ≥1 generacją | 3 | 8 |
| Odpowiedzi PR / influencer | 2 | 5 |

---

## Kody promo (opcjonalnie)

Jeśli używasz kodów zamiast UTM dla DM / offline:

| Kod | Przypisany do | Użycia | Limit |
|---|---|---|---|
| FOUNDER-URZADZAMY | FB Urządzamy Mieszkania | | |
| FOUNDER-[IMIE] | email osobisty | | |

API redeem: `/api/promo/redeem` (jeśli skonfigurowane w aplikacji).

---

## Notatki jakościowe (równie ważne jak liczby)

Po każdym kanale zapisz 1–2 zdania:
- Jaki był ton komentarzy? (ciekawość / sceptycyzm / spam accusations)
- Czy padło pytanie o bezpieczeństwo danych / RODO?
- Czy ktoś porównywał do [RoomGPT / Interior AI / inne]?

Te notatki decydują o copy na tydzień 2 lepiej niż sama liczba kliknięć.
