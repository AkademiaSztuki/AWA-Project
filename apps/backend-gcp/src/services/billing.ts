import { PoolClient } from 'pg';

export const CREDITS_PER_IMAGE = 10;
export const FREE_GRANT_CREDITS = 600;

export interface SubscriptionRow {
  id: string;
  user_hash: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  plan_id: 'basic' | 'pro' | 'studio';
  billing_period: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  credits_allocated: number;
  credits_used: number;
  subscription_credits_remaining: number;
}

export interface CreditOverview {
  balance: number;
  generationsAvailable: number;
  hasActiveSubscription: boolean;
  subscriptionCreditsRemaining: number;
  subscription: SubscriptionRow | null;
}

export async function ensureParticipantRecord(
  client: PoolClient,
  userHash: string,
  options?: { authUserId?: string | null; consentTimestamp?: string | null }
): Promise<void> {
  const consentTimestamp = options?.consentTimestamp || new Date().toISOString();
  await client.query(
    `
      INSERT INTO participants (user_hash, auth_user_id, consent_timestamp, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_hash) DO UPDATE
      SET
        auth_user_id = COALESCE(EXCLUDED.auth_user_id, participants.auth_user_id),
        consent_timestamp = COALESCE(participants.consent_timestamp, EXCLUDED.consent_timestamp),
        updated_at = NOW()
    `,
    [userHash, options?.authUserId || null, consentTimestamp]
  );
}

export async function getActiveSubscription(
  client: PoolClient,
  userHash: string
): Promise<SubscriptionRow | null> {
  const { rows } = await client.query<SubscriptionRow>(
    `
      SELECT *
      FROM subscriptions
      WHERE user_hash = $1
        AND status = 'active'
      ORDER BY current_period_start DESC
      LIMIT 1
    `,
    [userHash]
  );

  return rows[0] || null;
}

export async function getCreditOverview(
  client: PoolClient,
  userHash: string
): Promise<CreditOverview> {
  const { rows } = await client.query<{ balance: string }>(
    `
      SELECT COALESCE(SUM(amount), 0)::text AS balance
      FROM credit_transactions
      WHERE user_hash = $1
        AND (expires_at IS NULL OR expires_at > NOW())
    `,
    [userHash]
  );

  const balance = Number(rows[0]?.balance || 0);
  const subscription = await getActiveSubscription(client, userHash);

  return {
    balance,
    generationsAvailable: Math.floor(balance / CREDITS_PER_IMAGE),
    hasActiveSubscription: !!subscription,
    subscriptionCreditsRemaining: subscription?.subscription_credits_remaining || 0,
    subscription,
  };
}

export async function checkCreditsAvailable(
  client: PoolClient,
  userHash: string,
  amount: number = CREDITS_PER_IMAGE
): Promise<boolean> {
  const overview = await getCreditOverview(client, userHash);
  if (overview.hasActiveSubscription && overview.subscriptionCreditsRemaining >= amount) {
    return true;
  }
  return overview.balance >= amount;
}

export async function grantFreeCredits(client: PoolClient, userHash: string): Promise<boolean> {
  console.log('[billing] grantFreeCredits start', { userHash });
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '5e0063',
    },
    body: JSON.stringify({
      sessionId: '5e0063',
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'services/billing.ts:grantFreeCredits:start',
      message: 'grantFreeCredits called',
      data: { userHash },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log
  await ensureParticipantRecord(client, userHash);

  const participantResult = await client.query<{
    free_grant_used: boolean | null;
    auth_user_id: string | null;
  }>(
    `
      SELECT free_grant_used, auth_user_id
      FROM participants
      WHERE user_hash = $1
      FOR UPDATE
    `,
    [userHash]
  );

  const participant = participantResult.rows[0];
  if (!participant) {
    console.log('[billing] grantFreeCredits: participant not found', { userHash });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '5e0063',
      },
      body: JSON.stringify({
        sessionId: '5e0063',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'services/billing.ts:grantFreeCredits:no-participant',
        message: 'participant not found when granting free credits',
        data: { userHash },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
    return false;
  }
  if (participant.free_grant_used) {
    console.log('[billing] grantFreeCredits: already used on participant', { userHash });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '5e0063',
      },
      body: JSON.stringify({
        sessionId: '5e0063',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'services/billing.ts:grantFreeCredits:already-used',
        message: 'free grant already used on this participant',
        data: { userHash },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
    return false;
  }

  if (participant.auth_user_id) {
    const { rows: linkedRows } = await client.query<{ user_hash: string }>(
      `
        SELECT user_hash
        FROM participants
        WHERE auth_user_id = $1
          AND user_hash <> $2
          AND free_grant_used = TRUE
        LIMIT 1
      `,
      [participant.auth_user_id, userHash]
    );

    if (linkedRows.length > 0) {
      await client.query(
        `
          UPDATE participants
          SET free_grant_used = TRUE,
              free_grant_used_at = NOW(),
              updated_at = NOW()
          WHERE user_hash = $1
        `,
        [userHash]
      );
      console.log('[billing] grantFreeCredits: authUserId already used on other participant, marking current as used without new credits', {
        userHash,
        authUserId: participant.auth_user_id,
        otherUserHash: linkedRows[0].user_hash,
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '5e0063',
        },
        body: JSON.stringify({
          sessionId: '5e0063',
          runId: 'pre-fix',
          hypothesisId: 'H2',
          location: 'services/billing.ts:grantFreeCredits:auth-reused',
          message: 'auth_user_id already consumed free grant on another participant',
          data: { userHash, otherUserHash: linkedRows[0].user_hash },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log
      return false;
    }
  }

  const duplicateCheck = await client.query(
    `
      SELECT 1
      FROM credit_transactions
      WHERE user_hash = $1
        AND source = 'free_grant'
      LIMIT 1
    `,
    [userHash]
  );

  if (duplicateCheck.rowCount === 0) {
    console.log('[billing] grantFreeCredits: inserting free_grant credit transaction', {
      userHash,
      amount: FREE_GRANT_CREDITS,
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '5e0063',
      },
      body: JSON.stringify({
        sessionId: '5e0063',
        runId: 'pre-fix',
        hypothesisId: 'H3',
        location: 'services/billing.ts:grantFreeCredits:insert-transaction',
        message: 'inserting free_grant credit transaction',
        data: { userHash, amount: FREE_GRANT_CREDITS },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
    await client.query(
      `
        INSERT INTO credit_transactions (
          user_hash,
          type,
          amount,
          source,
          generation_id,
          expires_at
        )
        VALUES ($1, 'grant', $2, 'free_grant', NULL, NULL)
      `,
      [userHash, FREE_GRANT_CREDITS]
    );
  }

  await client.query(
    `
      UPDATE participants
      SET free_grant_used = TRUE,
          free_grant_used_at = NOW(),
          updated_at = NOW()
      WHERE user_hash = $1
    `,
    [userHash]
  );

  const granted = duplicateCheck.rowCount === 0;
  console.log('[billing] grantFreeCredits done', { userHash, granted });
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '5e0063',
    },
    body: JSON.stringify({
      sessionId: '5e0063',
      runId: 'pre-fix',
      hypothesisId: 'H3',
      location: 'services/billing.ts:grantFreeCredits:end',
      message: 'grantFreeCredits finished',
      data: { userHash, granted },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log
  return granted;
}

export async function deductCredits(
  client: PoolClient,
  userHash: string,
  generationId: string
): Promise<boolean> {
  await ensureParticipantRecord(client, userHash);

  await client.query(
    `
      INSERT INTO credit_transactions (
        user_hash,
        type,
        amount,
        source,
        generation_id,
        expires_at
      )
      VALUES ($1, 'used', $2, NULL, $3, NULL)
    `,
    [userHash, -CREDITS_PER_IMAGE, generationId]
  );

  const activeSubscription = await getActiveSubscription(client, userHash);
  if (activeSubscription && activeSubscription.subscription_credits_remaining > 0) {
    const amountFromSubscription = Math.min(
      CREDITS_PER_IMAGE,
      activeSubscription.subscription_credits_remaining
    );

    await client.query(
      `
        UPDATE subscriptions
        SET
          subscription_credits_remaining = GREATEST(0, subscription_credits_remaining - $2),
          credits_used = credits_used + $2,
          updated_at = NOW()
        WHERE id = $1
      `,
      [activeSubscription.id, amountFromSubscription]
    );
  }

  return true;
}

export async function upsertSubscriptionBase(
  client: PoolClient,
  payload: {
    userHash: string;
    subscriptionId: string;
    customerId: string;
    planId: 'basic' | 'pro' | 'studio';
    billingPeriod: 'monthly' | 'yearly';
    status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    creditsAllocated: number;
    creditsUsed?: number;
    subscriptionCreditsRemaining?: number;
  }
): Promise<void> {
  await ensureParticipantRecord(client, payload.userHash);
  await client.query(
    `
      INSERT INTO subscriptions (
        user_hash,
        stripe_subscription_id,
        stripe_customer_id,
        plan_id,
        billing_period,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        credits_allocated,
        credits_used,
        subscription_credits_remaining
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (stripe_subscription_id) DO UPDATE
      SET
        user_hash = EXCLUDED.user_hash,
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        plan_id = EXCLUDED.plan_id,
        billing_period = EXCLUDED.billing_period,
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        credits_allocated = EXCLUDED.credits_allocated,
        credits_used = EXCLUDED.credits_used,
        subscription_credits_remaining = EXCLUDED.subscription_credits_remaining,
        updated_at = NOW()
    `,
    [
      payload.userHash,
      payload.subscriptionId,
      payload.customerId,
      payload.planId,
      payload.billingPeriod,
      payload.status,
      payload.currentPeriodStart,
      payload.currentPeriodEnd,
      payload.cancelAtPeriodEnd,
      payload.creditsAllocated,
      payload.creditsUsed || 0,
      payload.subscriptionCreditsRemaining ?? payload.creditsAllocated,
    ]
  );
}

export async function allocateSubscriptionCredits(
  client: PoolClient,
  payload: {
    userHash: string;
    planId: 'basic' | 'pro' | 'studio';
    billingPeriod: 'monthly' | 'yearly';
    credits: number;
    expiresAt: string;
    subscriptionId: string;
  }
): Promise<boolean> {
  await client.query(
    `
      INSERT INTO credit_transactions (
        user_hash,
        type,
        amount,
        source,
        generation_id,
        expires_at
      )
      VALUES ($1, 'subscription_allocated', $2, $3, NULL, $4)
    `,
    [
      payload.userHash,
      payload.credits,
      `subscription_${payload.planId}`,
      payload.expiresAt,
    ]
  );

  await client.query(
    `
      UPDATE subscriptions
      SET
        credits_allocated = credits_allocated + $2,
        subscription_credits_remaining = subscription_credits_remaining + $2,
        updated_at = NOW()
      WHERE stripe_subscription_id = $1
    `,
    [payload.subscriptionId, payload.credits]
  );

  return true;
}

export async function registerStripeEvent(
  client: PoolClient,
  eventId: string,
  eventType: string,
  payload: unknown
): Promise<{ alreadyProcessed: boolean; retryCount: number }> {
  const existing = await client.query<{ processed: boolean; retry_count: number }>(
    `
      SELECT processed, retry_count
      FROM stripe_webhook_events
      WHERE stripe_event_id = $1
      LIMIT 1
    `,
    [eventId]
  );

  if (existing.rows[0]?.processed) {
    return {
      alreadyProcessed: true,
      retryCount: existing.rows[0].retry_count || 0,
    };
  }

  if (existing.rowCount === 0) {
    await client.query(
      `
        INSERT INTO stripe_webhook_events (
          stripe_event_id,
          event_type,
          payload,
          processed,
          retry_count
        )
        VALUES ($1, $2, $3, FALSE, 0)
      `,
      [eventId, eventType, payload]
    );
  }

  return {
    alreadyProcessed: false,
    retryCount: existing.rows[0]?.retry_count || 0,
  };
}

export async function markStripeEventProcessed(client: PoolClient, eventId: string): Promise<void> {
  await client.query(
    `
      UPDATE stripe_webhook_events
      SET processed = TRUE,
          error_message = NULL
      WHERE stripe_event_id = $1
    `,
    [eventId]
  );
}

export async function markStripeEventFailed(
  client: PoolClient,
  eventId: string,
  retryCount: number,
  errorMessage: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO stripe_webhook_events (
        stripe_event_id,
        event_type,
        payload,
        processed,
        retry_count,
        error_message
      )
      VALUES ($1, 'unknown', '{}'::jsonb, FALSE, $2, $3)
      ON CONFLICT (stripe_event_id) DO UPDATE
      SET retry_count = $2,
          error_message = $3
    `,
    [eventId, retryCount, errorMessage]
  );
}
