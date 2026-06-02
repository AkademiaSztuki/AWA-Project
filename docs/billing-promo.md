# Billing: credits scale, founders program, promo codes

## Credit scale (display)

- **100 credits** = one standard AI image generation
- **Basic (monthly)** = **6000 credits**
- Sync constants: `apps/backend-gcp/src/lib/billing-constants.ts` and `apps/frontend/src/lib/stripe.ts`

## Founders program (first 1000 accounts)

- Env: `FOUNDERS_GRANT_MAX` (default `1000`), `FOUNDERS_GRANT_CREDITS` (default `6000`)
- Granted on first email verification / authenticated grant paths only (not on anonymous `participants/ensure`)
- Public status: `GET /api/credits/founders-status` (Next) → GCP `GET /api/credits/founders-status`

## Promo codes (invite / manual Basic plan grant)

### Apply migration

```bash
psql "$DATABASE_URL" -f infra/gcp/sql/21_promo_codes.sql
```

### Activate or create a code (SQL)

```sql
UPDATE promo_codes SET active = TRUE WHERE code = 'IDA-TEST-STARTER';

INSERT INTO promo_codes (code, grant_credits, max_redemptions, note, active)
VALUES ('IDA-BETA-XY12', 6000, 50, 'Research invite batch', TRUE);
```

### Create via admin API

```bash
curl -X POST "$BACKEND_URL/api/admin/promo" \
  -H "Content-Type: application/json" \
  -H "x-promo-admin-secret: $PROMO_ADMIN_SECRET" \
  -d '{"code":"IDA-BETA-XY12","grantCredits":6000,"maxRedemptions":50,"active":true}'
```

Set `PROMO_ADMIN_SECRET` in backend-gcp and Vercel.

Users redeem in the app under subscription plans (“Masz kod zaproszenia?”) or `POST /api/promo/redeem` (authenticated).

Promo redemptions do **not** consume founders program slots.
