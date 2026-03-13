-- DANGER: wipes all auth + credits data in awa_db.
-- Used for resetting a fresh environment.

TRUNCATE TABLE credit_transactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE subscriptions RESTART IDENTITY CASCADE;
TRUNCATE TABLE stripe_webhook_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE magic_link_tokens RESTART IDENTITY CASCADE;
TRUNCATE TABLE participants RESTART IDENTITY CASCADE;

