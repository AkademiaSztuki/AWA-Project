## GCP core setup for AWA (EDU credits)

This document describes how to provision the **core Google Cloud resources** for the AWA project using your **education credits**:

- Project & billing
- Cloud SQL for PostgreSQL
- Cloud Storage buckets for images
- Cloud Run for the backend API
- Basic budgets & cost alerts

Where you see `PROJECT_ID`, `BILLING_ACCOUNT`, `REGION`, or `INSTANCE_NAME`, replace them with your actual values.

---

### 1. Verify EDU credits and billing

1. Go to Google Cloud Console → **Billing**.
2. Open the billing account that contains your **EDU credits**.
3. Check:
   - remaining **credit amount**,
   - **expiration date**,
   - which **projects** are attached to this billing account.
4. Ensure the AWA project you want to use is attached to this billing account.

If you need a dedicated project:

```bash
gcloud projects create PROJECT_ID --name="AWA Research"
gcloud beta billing projects link PROJECT_ID \
  --billing-account=BILLING_ACCOUNT
```

---

### 2. Enable required APIs

Run (once per project):

```bash
gcloud services enable \
  sqladmin.googleapis.com \
  run.googleapis.com \
  compute.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  aiplatform.googleapis.com
```

These cover Cloud SQL, Cloud Run, Cloud Storage, IAM and Vertex AI (image generation).

---

### 3. Cloud SQL for PostgreSQL (research DB)

Choose a region close to your users and Vertex AI, e.g. `europe-west4`:

```bash
REGION=europe-west4
INSTANCE_NAME=awa-research-sql

gcloud sql instances create $INSTANCE_NAME \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --availability-type=zonal \
  --storage-type=SSD \
  --storage-auto-increase \
  --backup-start-time=03:00
```

Create a database for AWA:

```bash
gcloud sql databases create awa_db --instance=$INSTANCE_NAME
```

Create an app user (password auth for local/dev; for Cloud Run you can use IAM / SQL Auth Proxy later):

```bash
gcloud sql users create awa_app \
  --instance=$INSTANCE_NAME \
  --password=STRONG_PASSWORD_HERE
```

Keep connection info handy (for `DATABASE_URL` in backend):

```text
postgresql://awa_app:STRONG_PASSWORD_HERE@HOST:PORT/awa_db
```

You can get `HOST` with:

```bash
gcloud sql instances describe $INSTANCE_NAME --format="value(ipAddresses.ipAddress)"
```

For production, prefer **private IP + Cloud SQL Auth Proxy** from Cloud Run instead of public IP.

---

### 4. Cloud Storage buckets for images

We need at least one bucket for research images (generated + inspiration + room photos).

Example:

```bash
REGION=europe-west4
BUCKET=awa-research-images-PROJECT_ID

gsutil mb -l $REGION gs://$BUCKET
```

Recommended path conventions:

- `participants/{user_hash}/generated/{generation_id}.webp`
- `participants/{user_hash}/inspiration/{image_id}.jpg`
- `participants/{user_hash}/room/{image_id}.jpg`

For public access you can:

- keep bucket **private** and serve **signed URLs** from the backend, or
- make only specific object prefixes public via IAM if you accept that trade-off.

---

### 5. Service account for backend (Cloud Run)

Create a service account for the backend API:

```bash
gcloud iam service-accounts create awa-backend \
  --display-name="AWA Backend Service"
```

Grant it minimum roles:

```bash
PROJECT_ID=PROJECT_ID
SA=awa-backend@$PROJECT_ID.iam.gserviceaccount.com
BUCKET=awa-research-images-PROJECT_ID
INSTANCE_NAME=awa-research-sql

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA" \
  --role="roles/aiplatform.user"
```

Limit roles further if you need stricter separation (e.g. per-bucket role instead of project-wide).

---

### 6. Cloud Run service (backend API)

Once the backend app in this repo is ready (e.g. `apps/backend-gcp` with a Dockerfile), you can deploy it to Cloud Run:

```bash
REGION=europe-west4
SERVICE_NAME=awa-backend-api
PROJECT_ID=PROJECT_ID
SA=awa-backend@$PROJECT_ID.iam.gserviceaccount.com

# Cloud Run connects to Cloud SQL via Unix socket (avoids ETIMEDOUT on public IP)
CONNECTION_NAME=$PROJECT_ID:$REGION:awa-research-sql

gcloud run deploy $SERVICE_NAME \
  --source=. \
  --project=$PROJECT_ID \
  --region=$REGION \
  --service-account=$SA \
  --allow-unauthenticated \
  --add-cloudsql-instances=$CONNECTION_NAME \
  --set-env-vars="DATABASE_URL=postgresql://awa_app:STRONG_PASSWORD_HERE@localhost:5432/awa_db,CLOUD_SQL_CONNECTION_NAME=$CONNECTION_NAME,GCS_IMAGES_BUCKET=$BUCKET"
```

Later you can tighten `--allow-unauthenticated` and put an API gateway / auth in front.

---

### 7. Budgets and alerts (protect your EDU credits)

Create a **simple budget** for the project:

```bash
PROJECT_ID=PROJECT_ID
BILLING_ACCOUNT=BILLING_ACCOUNT
BUDGET_NAME=awa-edu-budget

gcloud beta billing budgets create \
  --billing-account=$BILLING_ACCOUNT \
  --display-name=$BUDGET_NAME \
  --budget-filter-projects=projects/$PROJECT_ID \
  --amount-specified-amount-currency-code=USD \
  --amount-specified-amount-units=100 \
  --threshold-rules=0.5,0.75,0.9
```

This sets a 100 USD budget with alerts at 50%, 75%, and 90% usage. Adjust the amount to match your **EDU credit size**.

You can refine notifications (email / Pub/Sub) in the Cloud Console billing UI.

---

### 8. Environment variables for the app

Once the infrastructure is provisioned, you will need to set:

- `DATABASE_URL` (backend; host ignored when `CLOUD_SQL_CONNECTION_NAME` is set)
- `CLOUD_SQL_CONNECTION_NAME` (backend on Cloud Run, e.g. `project:region:awa-research-sql`)
- `GCS_IMAGES_BUCKET` (backend)
- Vertex AI / Google credentials variables already used in:
  - `apps/frontend/src/lib/google-ai/client.ts`

Frontend should get the backend base URL as:

- `NEXT_PUBLIC_GCP_API_BASE_URL` (example name) pointing to the Cloud Run URL (or a custom domain in front of it).

