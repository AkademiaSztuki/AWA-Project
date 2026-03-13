-- Manually grant 100 credits to all existing participants (idempotent-ish).
-- For each participant, insert one 'manual_admin' grant of 100 if not already present.

INSERT INTO credit_transactions (user_hash, type, amount, source, generation_id, expires_at)
SELECT p.user_hash, 'grant', 100, 'manual_admin', NULL, NULL
FROM participants p
LEFT JOIN credit_transactions ct
  ON ct.user_hash = p.user_hash
 AND ct.source = 'manual_admin'
WHERE ct.id IS NULL;

