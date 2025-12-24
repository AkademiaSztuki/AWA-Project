import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { allocateSubscriptionCredits } from '@/lib/credits';
import { getPlanConfig } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Supabase client z service_role key dla webhook handlera (omija RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Webhook handler requires service role key to bypass RLS.');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

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

  // Użyj service_role client dla operacji które wymagają omijania RLS
  const supabaseAdmin = getSupabaseAdmin();

  // Sprawdź czy event już został przetworzony (idempotencja)
  const { data: existingEvent } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('id, processed, retry_count')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (existingEvent?.processed) {
    console.log('[Webhook] Event already processed:', event.id);
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  // Zapisz event do bazy (użyj service_role client)
  const { error: insertError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as any,
      processed: false,
      retry_count: 0,
    });

  if (insertError && !insertError.message.includes('duplicate')) {
    console.error('[Webhook] Error saving webhook event:', insertError);
  }

  try {
    console.log('[Webhook] Processing event:', {
      eventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
    });

    // Przetwórz event
    await handleWebhookEvent(event);

    console.log('[Webhook] Event processed successfully:', event.id);

    // Oznacz jako przetworzony (użyj service_role client)
    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({ processed: true })
      .eq('stripe_event_id', event.id);

    return NextResponse.json({ received: true, processed: true });
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook event:', {
      eventId: event.id,
      eventType: event.type,
      error: error.message,
      stack: error.stack,
    });

    // Zwiększ retry_count (użyj service_role client)
    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({
        retry_count: (existingEvent?.retry_count || 0) + 1,
        error_message: error.message,
      })
      .eq('stripe_event_id', event.id);

    return NextResponse.json(
      { error: 'Error processing webhook event', details: error.message },
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
  console.log('[Webhook] handleCheckoutCompleted called:', {
    sessionId: session.id,
    subscriptionId: session.subscription,
    userHash: session.metadata?.user_hash || session.client_reference_id,
    metadata: session.metadata,
  });

  const subscriptionId = session.subscription as string;
  const userHash = session.metadata?.user_hash || session.client_reference_id;

  if (!userHash || !subscriptionId) {
    console.error('[Webhook] Missing userHash or subscriptionId:', {
      userHash,
      subscriptionId,
      metadata: session.metadata,
      clientReferenceId: session.client_reference_id,
    });
    throw new Error(`Missing userHash or subscriptionId. userHash: ${userHash}, subscriptionId: ${subscriptionId}`);
  }

  console.log('[Webhook] Retrieving subscription from Stripe:', subscriptionId);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = subscription.customer as string;

  const planId = session.metadata?.plan_id as 'basic' | 'pro' | 'studio';
  const billingPeriod = session.metadata?.billing_period as 'monthly' | 'yearly';
  // Użyj getPlanConfig zamiast metadata.credits - metadata może być niepoprawne lub podwójne
  const planConfig = getPlanConfig(planId, billingPeriod);
  const credits = planConfig.credits;

  console.log('[Webhook] Subscription details:', {
    subscriptionId,
    customerId,
    planId,
    billingPeriod,
    credits,
    status: subscription.status,
  });

  // Użyj service_role client
  const supabaseAdmin = getSupabaseAdmin();

  // Sprawdź czy subskrypcja już istnieje (aby uniknąć duplikacji kredytów)
  const { data: existingSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('id, credits_allocated, current_period_start')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (existingSubscription) {
    // Sprawdź czy to ten sam okres rozliczeniowy
    const newPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
    const existingPeriodStart = existingSubscription.current_period_start;

    if (existingPeriodStart && newPeriodStart === existingPeriodStart) {
      console.log('[Webhook] Subscription already exists for this period - skipping credit allocation to prevent duplicates');
      // Tylko zaktualizuj status i okres (bez przydzielania kredytów)
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: subscription.status === 'active' ? 'active' : 'unpaid',
          current_period_start: newPeriodStart,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
        })
        .eq('stripe_subscription_id', subscriptionId);
      return; // Nie przydzielaj kredytów ponownie
    }
  }

  // Utwórz lub zaktualizuj subskrypcję w bazie
  console.log('[Webhook] Creating/updating subscription in database...');
  const { error, data } = await supabaseAdmin
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
    console.error('[Webhook] Error creating subscription:', error);
    throw error;
  }

  console.log('[Webhook] Subscription created/updated successfully');

  // Przydziel kredyty (tylko jeśli to nowa subskrypcja lub nowy okres)
  console.log('[Webhook] Allocating subscription credits...', {
    userHash,
    planId,
    billingPeriod,
    credits,
    expiresAt: new Date(subscription.current_period_end * 1000).toISOString(),
  });

  const expiresAt = new Date(subscription.current_period_end * 1000);
  const allocationResult = await allocateSubscriptionCredits(
    userHash,
    planId,
    billingPeriod,
    credits,
    expiresAt,
    subscriptionId
  );

  if (!allocationResult) {
    console.error('[Webhook] Failed to allocate subscription credits');
    throw new Error('Failed to allocate subscription credits');
  }

  console.log('[Webhook] Credits allocated successfully:', {
    userHash,
    credits,
    subscriptionId,
  });
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

  // Użyj service_role client
  const supabaseAdmin = getSupabaseAdmin();

  // Oznacz subskrypcję jako anulowaną
  const { error } = await supabaseAdmin
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

  // Użyj service_role client
  const supabaseAdmin = getSupabaseAdmin();

  // Pobierz subskrypcję z bazy
  const { data: dbSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('user_hash, plan_id, billing_period, current_period_start, current_period_end')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!dbSubscription) {
    console.error('[Webhook] Subscription not found in database:', subscriptionId);
    return;
  }

  // Sprawdź czy to nowy okres rozliczeniowy (czy current_period_start się zmienił)
  const newPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const existingPeriodStart = dbSubscription.current_period_start;

  // Jeśli okres się nie zmienił, to znaczy że kredyty już zostały przydzielone przez checkout.session.completed
  // Przydziel kredyty tylko dla nowego okresu (kolejne płatności)
  if (existingPeriodStart && newPeriodStart === existingPeriodStart) {
    console.log('[Webhook] Invoice payment succeeded but period unchanged - credits already allocated by checkout.session.completed');
    // Tylko zaktualizuj okres (jeśli potrzebne)
    await supabaseAdmin
      .from('subscriptions')
      .update({
        current_period_start: newPeriodStart,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
      })
      .eq('stripe_subscription_id', subscriptionId);
    return;
  }

  // To jest nowy okres - przydziel kredyty
  console.log('[Webhook] New billing period detected - allocating credits for renewal');
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
  await supabaseAdmin
    .from('subscriptions')
    .update({
      current_period_start: newPeriodStart,
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

  // Użyj service_role client
  const supabaseAdmin = getSupabaseAdmin();

  // Oznacz subskrypcję jako past_due
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', subscriptionId);
}

