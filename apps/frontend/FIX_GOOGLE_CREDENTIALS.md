# 🔧 Naprawa Google Cloud Credentials na produkcji

## Problem

Błąd przy generowaniu obrazów na produkcji (project-ida.com):
```
Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.
```

## Przyczyna

Vertex AI (używany do generowania obrazów) wymaga OAuth 2.0 credentials, które nie są skonfigurowane w Vercel.

## Rozwiązanie

### Krok 1: Utwórz Service Account w Google Cloud

1. **Google Cloud Console** → **IAM & Admin** → **Service Accounts**
2. Kliknij **"Create Service Account"**
3. Wypełnij:
   - **Name**: `vertex-ai-image-generator`
   - **Description**: `Service account for Vertex AI image generation`
4. Kliknij **"Create and Continue"**
5. **Grant access**:
   - **Role**: `Vertex AI User` (lub `AI Platform Developer`)
6. Kliknij **"Done"**

### Krok 2: Utwórz klucz JSON

1. Kliknij na utworzony service account
2. Przejdź do zakładki **"Keys"**
3. Kliknij **"Add Key"** → **"Create new key"**
4. Wybierz **JSON**
5. Kliknij **"Create"** - plik JSON zostanie pobrany

### Krok 3: Dodaj zmienne środowiskowe do Vercel

1. **Vercel Dashboard** → **Settings** → **Environment Variables**
2. Dodaj następujące zmienne:

#### Wymagane zmienne:

```env
GOOGLE_AI_API_KEY=your-google-ai-api-key-here
GOOGLE_CLOUD_PROJECT=twoj-project-id
GOOGLE_CLOUD_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**WAŻNE:**
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` - to cały JSON z service account jako string (nie ścieżka do pliku!)
- Skopiuj całą zawartość pliku JSON i wklej jako wartość zmiennej
- Upewnij się, że JSON jest poprawnie sformatowany (bez nowych linii w środku)

### Krok 4: Zaktualizuj kod (jeśli potrzeba)

Kod już powinien działać, ale jeśli `GOOGLE_APPLICATION_CREDENTIALS_JSON` jest ustawione, musimy zaktualizować `GoogleAuth` aby używał tej zmiennej zamiast szukać pliku.

## Alternatywne rozwiązanie (jeśli JSON nie działa)

Jeśli ustawienie `GOOGLE_APPLICATION_CREDENTIALS_JSON` nie działa, możemy użyć bezpośrednio service account credentials w kodzie:

1. Dodaj zmienne:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=vertex-ai-image-generator@project-id.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
   ```

2. Zaktualizuj `GoogleAuth` w `client.ts` aby używał tych zmiennych.

## Sprawdzenie

Po dodaniu zmiennych:

1. **Redeploy na Vercel** (bez cache)
2. Przetestuj generowanie obrazu
3. Sprawdź Runtime Logs w Vercel - nie powinno być błędów "Could not load the default credentials"

## Gdzie znaleźć wartości

- **GOOGLE_CLOUD_PROJECT**: Google Cloud Console → Dashboard → Project ID
- **GOOGLE_AI_API_KEY**: Google AI Studio → Get API Key
- **Service Account JSON**: Pobrany plik JSON z kroku 2

