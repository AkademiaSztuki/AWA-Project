import { Router } from 'express';
import { pool } from '../db';
import {
  allocateSubscriptionCredits,
  markStripeEventFailed,
  markStripeEventProcessed,
  registerStripeEvent,
  upsertSubscriptionBase,
} from '../services/billing';

export const billingRouter = Router();

async function withStripeEventProcessing(
  eventId: string,
  eventType: string,
  payload: unknown,
  handler: (client: import('pg').PoolClient) => Promise<void>
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eventState = await registerStripeEvent(client, eventId, eventType, payload);
    if (eventState.alreadyProcessed) {
      await client.query('ROLLBACK');
      return { alreadyProcessed: true };
    }

    await handler(client);
    await markStripeEventProcessed(client, eventId);
    await client.query('COMMIT');
    return { alreadyProcessed: false };
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
      await markStripeEventFailed(client, eventId, 1, error?.message || 'unknown_error');
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

billingRouter.post('/billing/stripe/checkout-completed', async (req, res) => {
  const payload = req.body as {
    eventId?: string;
    userHash?: string;
    subscriptionId?: string;
    customerId?: string;
    planId?: 'basic' | 'pro' | 'studio';
    billingPeriod?: 'monthly' | 'yearly';
    credits?: number;
    status?: 'active' | 'unpaid';
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };

  if (
    !payload.eventId ||
    !payload.userHash ||
    !payload.subscriptionId ||
    !payload.customerId ||
    !payload.planId ||
    !payload.billingPeriod ||
    typeof payload.credits !== 'number' ||
    !payload.currentPeriodStart ||
    !payload.currentPeriodEnd
  ) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  try {
    const result = await withStripeEventProcessing(
      payload.eventId,
      'checkout.session.completed',
      payload,
      async (client) => {
        const { rows: existingRows } = await client.query<{ current_period_start: string }>(
          `
            SELECT current_period_start
            FROM subscriptions
            WHERE stripe_subscription_id = $1
            LIMIT 1
          `,
          [payload.subscriptionId]
        );

        if (existingRows[0]?.current_period_start === payload.currentPeriodStart) {
          await client.query(
            `
              UPDATE subscriptions
              SET
                status = $2,
                current_period_start = $3,
                current_period_end = $4,
                cancel_at_period_end = $5,
                updated_at = NOW()
              WHERE stripe_subscription_id = $1
            `,
            [
              payload.subscriptionId,
              payload.status || 'active',
              payload.currentPeriodStart,
              payload.currentPeriodEnd,
              !!payload.cancelAtPeriodEnd,
            ]
          );
          return;
        }

        await upsertSubscriptionBase(client, {
          userHash: payload.userHash!,
          subscriptionId: payload.subscriptionId!,
          customerId: payload.customerId!,
          planId: payload.planId!,
          billingPeriod: payload.billingPeriod!,
          status: payload.status || 'active',
          currentPeriodStart: payload.currentPeriodStart!,
          currentPeriodEnd: payload.currentPeriodEnd!,
          cancelAtPeriodEnd: !!payload.cancelAtPeriodEnd,
          creditsAllocated: 0,
          creditsUsed: 0,
          subscriptionCreditsRemaining: 0,
        });

        await allocateSubscriptionCredits(client, {
          userHash: payload.userHash!,
          planId: payload.planId!,
          billingPeriod: payload.billingPeriod!,
          credits: payload.credits!,
          expiresAt: payload.currentPeriodEnd!,
          subscriptionId: payload.subscriptionId!,
        });
      }
    );

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('billing/checkout-completed error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

billingRouter.post('/billing/stripe/subscription-updated', async (req, res) => {
  const payload = req.body as {
    eventId?: string;
    subscriptionId?: string;
    status?: 'active' | 'past_due' | 'unpaid';
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };

  if (!payload.eventId || !payload.subscriptionId || !payload.status) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  try {
    const result = await withStripeEventProcessing(
      payload.eventId,
      'customer.subscription.updated',
      payload,
      async (client) => {
        await client.query(
          `
            UPDATE subscriptions
            SET
              status = $2,
              current_period_start = COALESCE($3, current_period_start),
              current_period_end = COALESCE($4, current_period_end),
              cancel_at_period_end = COALESCE($5, cancel_at_period_end),
              updated_at = NOW()
            WHERE stripe_subscription_id = $1
          `,
          [
            payload.subscriptionId,
            payload.status,
            payload.currentPeriodStart || null,
            payload.currentPeriodEnd || null,
            payload.cancelAtPeriodEnd ?? null,
          ]
        );
      }
    );

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('billing/subscription-updated error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

billingRouter.post('/billing/stripe/subscription-deleted', async (req, res) => {
  const payload = req.body as {
    eventId?: string;
    subscriptionId?: string;
  };

  if (!payload.eventId || !payload.subscriptionId) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  try {
    const result = await withStripeEventProcessing(
      payload.eventId,
      'customer.subscription.deleted',
      payload,
      async (client) => {
        await client.query(
          `
            UPDATE subscriptions
            SET status = 'cancelled', updated_at = NOW()
            WHERE stripe_subscription_id = $1
          `,
          [payload.subscriptionId]
        );
      }
    );

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('billing/subscription-deleted error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

billingRouter.post('/billing/stripe/invoice-payment-succeeded', async (req, res) => {
  const payload = req.body as {
    eventId?: string;
    subscriptionId?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
    credits?: number;
  };

  if (
    !payload.eventId ||
    !payload.subscriptionId ||
    !payload.currentPeriodStart ||
    !payload.currentPeriodEnd ||
    typeof payload.credits !== 'number'
  ) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  try {
    const result = await withStripeEventProcessing(
      payload.eventId,
      'invoice.payment_succeeded',
      payload,
      async (client) => {
        const { rows } = await client.query<{
          user_hash: string;
          plan_id: 'basic' | 'pro' | 'studio';
          billing_period: 'monthly' | 'yearly';
          current_period_start: string;
        }>(
          `
            SELECT user_hash, plan_id, billing_period, current_period_start
            FROM subscriptions
            WHERE stripe_subscription_id = $1
            LIMIT 1
          `,
          [payload.subscriptionId]
        );

        const subscription = rows[0];
        if (!subscription) {
          throw new Error('subscription_not_found');
        }

        if (subscription.current_period_start === payload.currentPeriodStart) {
          await client.query(
            `
              UPDATE subscriptions
              SET
                current_period_start = $2,
                current_period_end = $3,
                cancel_at_period_end = COALESCE($4, cancel_at_period_end),
                updated_at = NOW()
              WHERE stripe_subscription_id = $1
            `,
            [
              payload.subscriptionId,
              payload.currentPeriodStart,
              payload.currentPeriodEnd,
              payload.cancelAtPeriodEnd ?? null,
            ]
          );
          return;
        }

        await allocateSubscriptionCredits(client, {
          userHash: subscription.user_hash,
          planId: subscription.plan_id,
          billingPeriod: subscription.billing_period,
          credits: payload.credits!,
          expiresAt: payload.currentPeriodEnd!,
          subscriptionId: payload.subscriptionId!,
        });

        await client.query(
          `
            UPDATE subscriptions
            SET
              current_period_start = $2,
              current_period_end = $3,
              cancel_at_period_end = COALESCE($4, cancel_at_period_end),
              updated_at = NOW()
            WHERE stripe_subscription_id = $1
          `,
          [
            payload.subscriptionId,
            payload.currentPeriodStart,
            payload.currentPeriodEnd,
            payload.cancelAtPeriodEnd ?? null,
          ]
        );
      }
    );

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('billing/invoice-payment-succeeded error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

billingRouter.post('/billing/stripe/invoice-payment-failed', async (req, res) => {
  const payload = req.body as {
    eventId?: string;
    subscriptionId?: string;
  };

  if (!payload.eventId || !payload.subscriptionId) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  try {
    const result = await withStripeEventProcessing(
      payload.eventId,
      'invoice.payment_failed',
      payload,
      async (client) => {
        await client.query(
          `
            UPDATE subscriptions
            SET status = 'past_due', updated_at = NOW()
            WHERE stripe_subscription_id = $1
          `,
          [payload.subscriptionId]
        );
      }
    );

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('billing/invoice-payment-failed error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});
