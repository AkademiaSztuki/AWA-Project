import Stripe from 'stripe';

// Lazy initialization - nie rzucaj błędu podczas importu modułu
// Błąd zostanie rzucony dopiero gdy próbujemy użyć Stripe API
function createStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set. Please add it to .env.local');
  }
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
}

// Eksportuj funkcję zamiast instancji - pozwoli to na lazy loading
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = createStripeInstance();
  }
  return stripeInstance;
}

export const stripe = {
  get instance() {
    if (!stripeInstance) {
      stripeInstance = createStripeInstance();
    }
    return stripeInstance;
  },
  // Proxy dla wszystkich metod Stripe
  webhooks: {
    constructEvent: (...args: Parameters<Stripe['webhooks']['constructEvent']>) => {
      return createStripeInstance().webhooks.constructEvent(...args);
    }
  },
  checkout: {
    sessions: {
      create: (...args: Parameters<Stripe['checkout']['sessions']['create']>) => {
        return createStripeInstance().checkout.sessions.create(...args);
      }
    }
  },
  billingPortal: {
    sessions: {
      create: (...args: Parameters<Stripe['billingPortal']['sessions']['create']>) => {
        return createStripeInstance().billingPortal.sessions.create(...args);
      }
    }
  },
  subscriptions: {
    retrieve: (...args: Parameters<Stripe['subscriptions']['retrieve']>) => {
      return createStripeInstance().subscriptions.retrieve(...args);
    }
  }
} as any;

export type PlanId = 'basic' | 'pro' | 'studio';
export type BillingPeriod = 'monthly' | 'yearly';

export interface PlanConfig {
  planId: PlanId;
  billingPeriod: BillingPeriod;
  credits: number;
  priceId: string; // Stripe Price ID
}

// Mapowanie planów do kredytów (dostępne po stronie klienta)
export const PLAN_CREDITS: Record<PlanId, Record<BillingPeriod, number>> = {
  basic: {
    monthly: 2000,
    yearly: 24000,
  },
  pro: {
    monthly: 5000,
    yearly: 60000,
  },
  studio: {
    monthly: 8000,
    yearly: 96000,
  },
};

// Mapowanie planów do Stripe Price IDs (tylko po stronie serwera)
// Te wartości muszą być ustawione w zmiennych środowiskowych
function getPlanConfigs(): Record<PlanId, Record<BillingPeriod, Omit<PlanConfig, 'planId' | 'billingPeriod'>>> {
  return {
    basic: {
      monthly: {
        credits: 2000,
        priceId: process.env.STRIPE_PRICE_BASIC_MONTHLY || '',
      },
      yearly: {
        credits: 24000,
        priceId: process.env.STRIPE_PRICE_BASIC_YEARLY || '',
      },
    },
    pro: {
      monthly: {
        credits: 5000,
        priceId: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
      },
      yearly: {
        credits: 60000,
        priceId: process.env.STRIPE_PRICE_PRO_YEARLY || '',
      },
    },
    studio: {
      monthly: {
        credits: 8000,
        priceId: process.env.STRIPE_PRICE_STUDIO_MONTHLY || '',
      },
      yearly: {
        credits: 96000,
        priceId: process.env.STRIPE_PRICE_STUDIO_YEARLY || '',
      },
    },
  };
}

// Funkcja do pobierania konfiguracji planu (tylko po stronie serwera - używa Price IDs)
export function getPlanConfig(planId: PlanId, billingPeriod: BillingPeriod): PlanConfig {
  // Sprawdź czy jesteśmy po stronie serwera
  if (typeof window !== 'undefined') {
    // Po stronie klienta - zwróć tylko kredyty (bez Price ID)
    return {
      planId,
      billingPeriod,
      credits: PLAN_CREDITS[planId][billingPeriod],
      priceId: '', // Price ID nie jest dostępne po stronie klienta
    };
  }
  
  // Po stronie serwera - zwróć pełną konfigurację z Price ID
  const configs = getPlanConfigs();
  const config = configs[planId][billingPeriod];
  
  if (!config.priceId || config.priceId === '') {
    throw new Error(
      `STRIPE_PRICE_${planId.toUpperCase()}_${billingPeriod.toUpperCase()} is not set in .env.local. ` +
      `Please create the product in Stripe Dashboard and add the Price ID.`
    );
  }
  
  return {
    planId,
    billingPeriod,
    ...config,
  };
}

// Funkcja do pobierania tylko kredytów (dostępna po stronie klienta)
export function getPlanCredits(planId: PlanId, billingPeriod: BillingPeriod): number {
  return PLAN_CREDITS[planId][billingPeriod];
}

export interface CreateCheckoutSessionParams {
  userHash: string;
  planId: PlanId;
  billingPeriod: BillingPeriod;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<string> {
  const { userHash, planId, billingPeriod, successUrl, cancelUrl } = params;
  
  try {
    // Ta funkcja jest wywoływana tylko po stronie serwera (API route)
    const configs = getPlanConfigs();
    const planConfig = configs[planId][billingPeriod];
    
    if (!planConfig.priceId || planConfig.priceId === '') {
      throw new Error(
        `STRIPE_PRICE_${planId.toUpperCase()}_${billingPeriod.toUpperCase()} is not set in .env.local.`
      );
    }
    
    const stripeInstance = getStripe();
    
    const session = await stripeInstance.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userHash,
      metadata: {
        user_hash: userHash,
        plan_id: planId,
        billing_period: billingPeriod,
        credits: PLAN_CREDITS[planId][billingPeriod].toString(),
      },
      subscription_data: {
        metadata: {
          user_hash: userHash,
          plan_id: planId,
          billing_period: billingPeriod,
          credits: PLAN_CREDITS[planId][billingPeriod].toString(),
        },
      },
  });

    if (!session.url) {
      throw new Error('Stripe checkout session created but no URL returned');
    }

    return session.url;
  } catch (error: any) {
    if (error.message?.includes('STRIPE_PRICE_')) {
      throw error; // Przekaż błąd o brakującym Price ID
    }
    if (error.message?.includes('No such price')) {
      throw new Error(`Price ID does not exist in Stripe. Please check your .env.local and Stripe Dashboard.`);
    }
    throw new Error(`Failed to create Stripe checkout session: ${error.message || error}`);
  }
}

export interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export async function createPortalSession(params: CreatePortalSessionParams): Promise<string> {
  const { customerId, returnUrl } = params;

  const stripeInstance = getStripe();
  const session = await stripeInstance.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url || '';
}

