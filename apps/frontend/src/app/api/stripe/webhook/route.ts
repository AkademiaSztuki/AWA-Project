import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { allocateSubscriptionCredits } from '@/lib/credits';
import { getPlanConfig } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Sprawdź czy event już został przetworzony (idempotencja)
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('id, processed, retry_count')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (existingEvent?.processed) {
    console.log('Event already processed:', event.id);
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  // Zapisz event do bazy
  const { error: insertError } = await supabase
    .from('stripe_webhook_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as any,
      processed: false,
      retry_count: 0,
    });

  if (insertError && !insertError.message.includes('duplicate')) {
    console.error('Error saving webhook event:', insertError);
  }

  try {
    // Przetwórz event
    await handleWebhookEvent(event);

    // Oznacz jako przetworzony
    await supabase
      .from('stripe_webhook_events')
      .update({ processed: true })
      .eq('stripe_event_id', event.id);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook event:', error);

    // Zwiększ retry_count
    await supabase
      .from('stripe_webhook_events')
      .update({
        retry_count: (existingEvent?.retry_count || 0) + 1,
        error_message: error.message,
      })
      .eq('stripe_event_id', event.id);

    return NextResponse.json(
      { error: 'Error processing webhook event' },
      { status: 500 }
    );
  }
}

async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentSucceeded(invoice);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId = session.subscription as string;
  const userHash = session.metadata?.user_hash || session.client_reference_id;

  if (!userHash || !subscriptionId) {
    console.error('Missing userHash or subscriptionId in checkout session');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = subscription.customer as string;

  const planId = session.metadata?.plan_id as 'basic' | 'pro' | 'studio';
  const billingPeriod = session.metadata?.billing_period as 'monthly' | 'yearly';
  const credits = parseInt(session.metadata?.credits || '0');

  // Utwórz lub zaktualizuj subskrypcję w bazie
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_hash: userHash,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      plan_id: planId,
      billing_period: billingPeriod,
      status: subscription.status === 'active' ? 'active' : 'unpaid',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      credits_allocated: credits,
      subscription_credits_remaining: credits,
      credits_used: 0,
    }, {
      onConflict: 'stripe_subscription_id',
    });

  if (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }

  // Przydziel kredyty
  const expiresAt = new Date(subscription.current_period_end * 1000);
  await allocateSubscriptionCredits(
    userHash,
    planId,
    billingPeriod,
    credits,
    expiresAt,
    subscriptionId
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;
  const customerId = subscription.customer as string;

  // Pobierz subskrypcję z bazy
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('user_hash, plan_id, billing_period')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!dbSubscription) {
    console.error('Subscription not found in database:', subscriptionId);
    return;
  }

  // Zaktualizuj status i okres
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status === 'active' ? 'active' : 
              subscription.status === 'past_due' ? 'past_due' : 'unpaid',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;

  // Oznacz subskrypcję jako anulowaną
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Pobierz subskrypcję z bazy
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('user_hash, plan_id, billing_period')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!dbSubscription) {
    console.error('Subscription not found in database:', subscriptionId);
    return;
  }

  // Przydziel nowe kredyty dla nowego okresu
  const planConfig = getPlanConfig(dbSubscription.plan_id, dbSubscription.billing_period);
  const expiresAt = new Date(subscription.current_period_end * 1000);

  await allocateSubscriptionCredits(
    dbSubscription.user_hash,
    dbSubscription.plan_id,
    dbSubscription.billing_period,
    planConfig.credits,
    expiresAt,
    subscriptionId
  );

  // Zaktualizuj okres subskrypcji
  await supabase
    .from('subscriptions')
    .update({
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
    })
    .eq('stripe_subscription_id', subscriptionId);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  // Oznacz subskrypcję jako past_due
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', subscriptionId);
}

