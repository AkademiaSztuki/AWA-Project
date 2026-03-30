# Supabase SQL (archived reference)

**Not used at application runtime.** The production stack persists to **Google Cloud SQL** and **Cloud Storage** via `apps/backend-gcp` and the frontend `gcpApi` client.

- **Authoritative schema for new work:** [`../../infra/gcp/sql/`](../../infra/gcp/sql/)
- **This folder:** historical migrations, export notes, and legacy `schema_full.sql` kept for audit and comparison with older Supabase deployments. Do not treat these files as the live source of truth.
