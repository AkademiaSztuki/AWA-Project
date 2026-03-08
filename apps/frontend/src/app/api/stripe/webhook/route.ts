import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getPlanConfig } from '@/lib/stripe';
import { gcpApi } from '@/lib/gcp-api-client';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  try {
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true, processed: true, storage: 'gcp' });
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook event:', error);
    return NextResponse.json(
      { error: 'Error processing webhook event', details: error.message },
      { status: 500 },
    );
  }
}

async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = session.subscription as string;
      const userHash =
        session.metadata?.user_hash || session.client_reference_id;

      if (!subscriptionId || !userHash) {
        throw new Error(
          'Missing subscriptionId or userHash for checkout.session.completed',
        );
      }

      const subscription =
        await stripe.subscriptions.retrieve(subscriptionId);
      const planId = session.metadata?.plan_id as
        | 'basic'
        | 'pro'
        | 'studio';
      const billingPeriod = session.metadata?.billing_period as
        | 'monthly'
        | 'yearly';
      const planConfig = getPlanConfig(planId, billingPeriod);

      const result = await gcpApi.billing.checkoutCompleted({
        eventId: event.id,
        userHash,
        subscriptionId,
        customerId: subscription.customer as string,
        planId,
        billingPeriod,
        credits: planConfig.credits,
        status:
          subscription.status === 'active' ? 'active' : 'unpaid',
        currentPeriodStart: new Date(
          subscription.current_period_start * 1000,
        ).toISOString(),
        currentPeriodEnd: new Date(
          subscription.current_period_end * 1000,
        ).toISOString(),
        cancelAtPeriodEnd:
          subscription.cancel_at_period_end || false,
      });

      if (!result.ok) throw new Error(result.error || 'GCP checkout sync failed');
      return;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const result = await gcpApi.billing.subscriptionUpdated({
        eventId: event.id,
        subscriptionId: subscription.id,
        status:
          subscription.status === 'active'
            ? 'active'
            : subscription.status === 'past_due'
              ? 'past_due'
              : 'unpaid',
        currentPeriodStart: new Date(
          subscription.current_period_start * 1000,
        ).toISOString(),
        currentPeriodEnd: new Date(
          subscription.current_period_end * 1000,
        ).toISOString(),
        cancelAtPeriodEnd:
          subscription.cancel_at_period_end || false,
      });
      if (!result.ok)
        throw new Error(result.error || 'GCP subscription update failed');
      return;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const result = await gcpApi.billing.subscriptionDeleted({
        eventId: event.id,
        subscriptionId: subscription.id,
      });
      if (!result.ok)
        throw new Error(result.error || 'GCP subscription delete failed');
      return;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;
      if (!subscriptionId) return;

      const subscription =
        await stripe.subscriptions.retrieve(subscriptionId);
      const planId = subscription.metadata?.plan_id as
        | 'basic'
        | 'pro'
        | 'studio';
      const billingPeriod = subscription.metadata?.billing_period as
        | 'monthly'
        | 'yearly';
      const planConfig = getPlanConfig(planId, billingPeriod);

      const result = await gcpApi.billing.invoicePaymentSucceeded({
        eventId: event.id,
        subscriptionId,
        currentPeriodStart: new Date(
          subscription.current_period_start * 1000,
        ).toISOString(),
        currentPeriodEnd: new Date(
          subscription.current_period_end * 1000,
        ).toISOString(),
        cancelAtPeriodEnd:
          subscription.cancel_at_period_end || false,
        credits: planConfig.credits,
      });
      if (!result.ok)
        throw new Error(result.error || 'GCP invoice success sync failed');
      return;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;
      if (!subscriptionId) return;

      const result = await gcpApi.billing.invoicePaymentFailed({
        eventId: event.id,
        subscriptionId,
      });
      if (!result.ok)
        throw new Error(result.error || 'GCP invoice failure sync failed');
      return;
    }

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }
}
