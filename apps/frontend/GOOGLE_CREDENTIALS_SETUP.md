# 🔐 Konfiguracja Google Cloud Credentials dla produkcji

## Problem

Na produkcji (project-ida.com) generowanie obrazów nie działa z błędem:
```
Could not load the default credentials
```

## Rozwiązanie

### Krok 1: Utwórz Service Account w Google Cloud

1. Otwórz [Google Cloud Console](https://console.cloud.google.com/)
2. Przejdź do **IAM & Admin** → **Service Accounts**
3. Kliknij **"Create Service Account"**
4. Wypełnij:
   - **Name**: `vertex-ai-image-generator`
   - **Description**: `Service account for Vertex AI image generation`
5. Kliknij **"Create and Continue"**
6. **Grant access**:
   - **Role**: `Vertex AI User` (lub `AI Platform Developer`)
7. Kliknij **"Done"**

### Krok 2: Utwórz klucz JSON

1. Kliknij na utworzony service account
2. Przejdź do zakładki **"Keys"**
3. Kliknij **"Add Key"** → **"Create new key"**
4. Wybierz **JSON**
5. Kliknij **"Create"** - plik JSON zostanie pobrany

### Krok 3: Dodaj zmienne środowiskowe do Vercel

1. **Vercel Dashboard** → **Settings** → **Environment Variables**
2. Dodaj następujące zmienne (jeśli jeszcze nie ma):

#### Wymagane zmienne:

```env
GOOGLE_AI_API_KEY=AQ.Ab8RN6LwGy4UYhSSYDXun1CqUIOSLSSE3MKkBdocyQb4ADSNDg
GOOGLE_CLOUD_PROJECT=twoj-project-id
GOOGLE_CLOUD_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**WAŻNE:**
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` - to **cały JSON** z service account jako **string** (nie ścieżka do pliku!)
- Otwórz pobrany plik JSON w edytorze tekstu
- Skopiuj **całą zawartość** (od `{` do `}`)
- Wklej jako wartość zmiennej w Vercel
- Upewnij się, że JSON jest poprawnie sformatowany (bez nowych linii w środku, chyba że są w stringach)

**Przykład poprawnego formatu:**
```json
{"type":"service_account","project_id":"my-project","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"vertex-ai@my-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/vertex-ai%40my-project.iam.gserviceaccount.com"}
```

### Krok 4: Redeploy na Vercel

1. **Vercel Dashboard** → **Deployments**
2. Kliknij **"Redeploy"** na najnowszym deployment
3. Wybierz **"Redeploy without cache"**
4. Poczekaj aż deployment się zakończy

### Krok 5: Przetestuj

1. Przejdź na `https://www.project-ida.com`
2. Spróbuj wygenerować obraz
3. Sprawdź czy działa (nie powinno być błędu "Could not load the default credentials")

## Gdzie znaleźć wartości

- **GOOGLE_CLOUD_PROJECT**: 
  - Google Cloud Console → Dashboard → **Project ID** (np. `my-project-123456`)
  
- **GOOGLE_AI_API_KEY**: 
  - [Google AI Studio](https://aistudio.google.com/app/apikey) → **Get API Key**
  
- **GOOGLE_APPLICATION_CREDENTIALS_JSON**: 
  - Pobrany plik JSON z kroku 2 (cała zawartość jako string)

## Sprawdzenie czy działa

Po dodaniu zmiennych i redeploy:

1. Sprawdź **Runtime Logs** w Vercel:
   - Powinno być: `[GoogleAI] Using service account credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Nie powinno być: `Could not load the default credentials`

2. Przetestuj generowanie obrazu - powinno działać bez błędów

## Jeśli nadal nie działa

1. **Sprawdź czy JSON jest poprawny**:
   - Otwórz plik JSON w edytorze
   - Upewnij się, że jest poprawnie sformatowany
   - Skopiuj całą zawartość (włącznie z `{` i `}`)

2. **Sprawdź czy service account ma odpowiednie uprawnienia**:
   - Google Cloud Console → IAM & Admin → Service Accounts
   - Kliknij na service account
   - Sprawdź czy ma rolę `Vertex AI User` lub `AI Platform Developer`

3. **Sprawdź Runtime Logs w Vercel**:
   - Vercel Dashboard → Deployments → najnowszy deployment
   - Kliknij **"Runtime Logs"** → **"Stream"**
   - Szukaj błędów związanych z Google Auth

