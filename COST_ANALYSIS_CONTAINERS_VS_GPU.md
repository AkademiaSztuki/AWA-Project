# Analiza: Wiele Kontenerów vs Większy GPU

## Obecna Konfiguracja (Po Naprawie)

- **GPU**: A100 40GB
- **max_containers**: 1
- **max_inputs**: 2 (zmniejszone z 6 z powodu CUDA OOM)
- **Koszt**: $0.000583/sekundę = $2.10/godzinę

### Problem
- 6 requestów równolegle → CUDA OOM (brak pamięci)
- Zmniejszono do 2 równoległych requestów
- **Ale**: Jeśli przychodzi 6 requestów, 4 będą czekać w kolejce

---

## Scenariusz: 6 Requestów Równolegle

### Obecna konfiguracja (A100 40GB, max_inputs=2)
- **Równolegle**: 2 requesty
- **W kolejce**: 4 requesty
- **Czas**: 
  - Pierwsze 2: ~28s (preview)
  - Następne 2: ~28s
  - Ostatnie 2: ~28s
  - **Total**: ~84 sekund (3 batche × 28s)
- **Koszt**: 1 kontener × 84s × $0.000583 = **$0.049**

### Opcja 1: 3 Kontenery A100 40GB (max_inputs=2 każdy)
- **Równolegle**: 6 requestów (2 na kontener)
- **Kontenery**: 3
- **Czas**: ~28s (wszystkie równolegle)
- **Koszt**: 3 kontenery × 28s × $0.000583 = **$0.049** (ten sam!)

**WNIOSEK**: 3 kontenery = ten sam koszt, ale 3x szybsze!

### Opcja 2: A100 80GB (max_inputs=4)
- **GPU**: A100 80GB
- **Cena**: ~$0.000694/sekundę = $2.50/godzinę (19% droższy)
- **Pamięć**: 80GB (2x więcej)
- **max_inputs**: 4 (może obsłużyć 4 równoległe requesty)
- **Czas**: 
  - Pierwsze 4: ~28s
  - Ostatnie 2: ~28s
  - **Total**: ~56 sekund (2 batche × 28s)
- **Koszt**: 1 kontener × 56s × $0.000694 = **$0.039**

**WNIOSEK**: A100 80GB jest **20% tańszy** i **33% szybszy**!

### Opcja 3: H100 80GB (max_inputs=6)
- **GPU**: H100 80GB
- **Cena**: $0.001097/sekundę = $3.95/godzinę (88% droższy)
- **Pamięć**: 80GB
- **max_inputs**: 6 (może obsłużyć wszystkie 6 równolegle)
- **Czas**: ~18s (H100 jest szybszy)
- **Koszt**: 1 kontener × 18s × $0.001097 = **$0.020**

**WNIOSEK**: H100 jest **59% tańszy** i **78% szybszy** dla 6 requestów!

---

## Porównanie dla 6 Requestów Równolegle

| Konfiguracja | Czas | Koszt | Kontenery | Opłacalność |
|--------------|------|-------|-----------|-------------|
| **A100 40GB (max_inputs=2)** | 84s | $0.049 | 1 | Baseline |
| **3× A100 40GB (max_inputs=2)** | 28s | $0.049 | 3 | ✅ 3x szybsze, ten sam koszt |
| **A100 80GB (max_inputs=4)** | 56s | $0.039 | 1 | ✅ 33% szybsze, 20% tańsze |
| **H100 80GB (max_inputs=6)** | 18s | $0.020 | 1 | ✅ 78% szybsze, 59% tańsze |

---

## Analiza dla 500 Użytkowników

### Scenariusz: Każdy użytkownik generuje 6 obrazów

#### A100 40GB (max_inputs=2, max_containers=1)
- **Requesty**: 500 × 6 = 3,000 requestów
- **Batch size**: 2
- **Batches**: 3,000 / 2 = 1,500 batchy
- **Czas na batch**: 28s
- **Total czas**: 1,500 × 28s = 42,000 sekund = 11.67 godziny
- **Koszt**: 11.67h × $2.10 = **$24.51**

#### 3× A100 40GB (max_inputs=2, max_containers=3)
- **Requesty**: 3,000 requestów
- **Batch size**: 6 (2 na kontener × 3 kontenery)
- **Batches**: 3,000 / 6 = 500 batchy
- **Czas na batch**: 28s
- **Total czas**: 500 × 28s = 14,000 sekund = 3.89 godziny
- **Koszt**: 3.89h × $2.10 = **$8.17** ✅

#### A100 80GB (max_inputs=4, max_containers=1)
- **Requesty**: 3,000 requestów
- **Batch size**: 4
- **Batches**: 3,000 / 4 = 750 batchy
- **Czas na batch**: 28s
- **Total czas**: 750 × 28s = 21,000 sekund = 5.83 godziny
- **Koszt**: 5.83h × $2.50 = **$14.58**

#### H100 80GB (max_inputs=6, max_containers=1)
- **Requesty**: 3,000 requestów
- **Batch size**: 6
- **Batches**: 3,000 / 6 = 500 batchy
- **Czas na batch**: 18s (H100 jest szybszy)
- **Total czas**: 500 × 18s = 9,000 sekund = 2.5 godziny
- **Koszt**: 2.5h × $3.95 = **$9.88**

---

## Porównanie dla 500 Użytkowników (6 obrazów każdy)

| Konfiguracja | Czas | Koszt | Oszczędność | Szybkość |
|--------------|------|-------|-------------|----------|
| **A100 40GB (max_inputs=2)** | 11.67h | $24.51 | - | Baseline |
| **3× A100 40GB (max_inputs=2)** | 3.89h | $8.17 | **-67%** | **3x szybsze** |
| **A100 80GB (max_inputs=4)** | 5.83h | $14.58 | **-41%** | **2x szybsze** |
| **H100 80GB (max_inputs=6)** | 2.5h | $9.88 | **-60%** | **4.7x szybsze** |

---

## Rekomendacje

### ✅ Najlepsza Opcja: 3× A100 40GB (max_containers=3)

**Zalety:**
- **67% oszczędność** kosztów
- **3x szybsze** przetwarzanie
- **Ten sam GPU** (A100 40GB) - łatwa migracja
- **Elastyczność** - może skalować w górę/dół

**Wymagane zmiany:**
```python
@app.cls(
    gpu="A100",
    max_containers=3,  # Zwiększone z 1
    min_containers=0
)
@modal.concurrent(max_inputs=2)  # Pozostaje 2
```

### Opcja 2: A100 80GB (max_inputs=4)

**Zalety:**
- **41% oszczędność** kosztów
- **2x szybsze** przetwarzanie
- **1 kontener** - prostsze zarządzanie

**Wady:**
- **19% droższy GPU** (ale oszczędza przez szybsze przetwarzanie)
- Wymaga zmiany GPU

**Wymagane zmiany:**
```python
@app.cls(
    gpu="A100:80GB",  # Zmiana na 80GB
    max_containers=1
)
@modal.concurrent(max_inputs=4)  # Zwiększone z 2
```

### Opcja 3: H100 80GB (max_inputs=6)

**Zalety:**
- **60% oszczędność** kosztów
- **4.7x szybsze** przetwarzanie
- **1 kontener** - najprostsze zarządzanie

**Wady:**
- **88% droższy GPU** (ale oszczędza przez bardzo szybkie przetwarzanie)
- Wymaga zmiany GPU

**Wymagane zmiany:**
```python
@app.cls(
    gpu="H100",  # Zmiana na H100
    max_containers=1
)
@modal.concurrent(max_inputs=6)  # Zwiększone z 2
```

---

## Wnioski

### Dla 500 użytkowników:

1. **Najlepsza opcja**: **3× A100 40GB** (max_containers=3)
   - Koszt: **$8.17** (vs $24.51 obecnie)
   - Oszczędność: **67%**
   - Szybkość: **3x szybsze**

2. **Alternatywa**: **A100 80GB** (max_inputs=4)
   - Koszt: **$14.58**
   - Oszczędność: **41%**
   - Szybkość: **2x szybsze**

3. **Premium**: **H100 80GB** (max_inputs=6)
   - Koszt: **$9.88**
   - Oszczędność: **60%**
   - Szybkość: **4.7x szybsze**

### Rekomendacja Finalna

**✅ Zwiększ `max_containers` do 3** - to najprostsza zmiana z największymi korzyściami!

- **Brak zmiany GPU** - łatwa migracja
- **67% oszczędność** kosztów
- **3x szybsze** przetwarzanie
- **Elastyczność** - może skalować w górę/dół w zależności od obciążenia

