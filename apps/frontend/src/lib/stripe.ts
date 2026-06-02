import Stripe from 'stripe';

// Lazy initialization - nie rzucaj błędu podczas importu modułu
// Błąd zostanie rzucony dopiero gdy próbujemy użyć Stripe API
function createStripeInstance(): Stripe {
  let secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set. Please add it to .env.local');
  }
  
  // Usuń białe znaki i znaki nowej linii (częsty problem w Vercel env vars)
  secretKey = secretKey.trim().replace(/\r?\n/g, '');
  
  // Sprawdź format klucza
  if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
    console.warn('[Stripe] Warning: STRIPE_SECRET_KEY does not start with sk_test_ or sk_live_');
  }
  
  console.log('[Stripe] Using Stripe key:', secretKey.substring(0, 12) + '...' + secretKey.substring(secretKey.length - 4));
  
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
export type PricingCurrency = 'pln' | 'usd';

export interface PlanConfig {
  planId: PlanId;
  billingPeriod: BillingPeriod;
  currency: PricingCurrency;
  credits: number;
  priceId: string; // Stripe Price ID
}

/** SYNC with apps/backend-gcp/src/lib/billing-constants.ts */
export const CREDITS_PER_IMAGE = 100;
export const FREE_PLAN_CREDITS = 6000;

// Mapowanie planów do kredytów (dostępne po stronie klienta)
export const PLAN_CREDITS: Record<PlanId, Record<BillingPeriod, number>> = {
  basic: {
    monthly: 6000,
    yearly: 60000,
  },
  pro: {
    monthly: 16000,
    yearly: 192000,
  },
  studio: {
    monthly: 32000,
    yearly: 384000,
  },
};

export const PLAN_PRICES: Record<PricingCurrency, Record<PlanId, Record<BillingPeriod, number>>> = {
  pln: {
    basic: {
      monthly: 29,
      yearly: 290,
    },
    pro: {
      monthly: 59,
      yearly: 590,
    },
    studio: {
      monthly: 119,
      yearly: 1190,
    },
  },
  usd: {
    basic: {
      monthly: 9,
      yearly: 90,
    },
    pro: {
      monthly: 19,
      yearly: 190,
    },
    studio: {
      monthly: 39,
      yearly: 390,
    },
  },
};

function cleanStripePriceId(priceId: string | undefined): string {
  if (!priceId) return '';
  const trimmed = priceId.trim().replace(/\r?\n/g, '');
  return trimmed.startsWith('=') ? trimmed.substring(1) : trimmed;
}

/** Primary: STRIPE_PRICE_BASIC_MONTHLY_PLN. Legacy (Vercel prod): STRIPE_PRICE_BASIC_MONTHLY */
export function resolveStripePriceId(
  planId: PlanId,
  billingPeriod: BillingPeriod,
  currency: PricingCurrency,
): string {
  const withCurrency = `STRIPE_PRICE_${planId.toUpperCase()}_${billingPeriod.toUpperCase()}_${currency.toUpperCase()}`;
  const fromCurrency = cleanStripePriceId(process.env[withCurrency]);
  if (fromCurrency) return fromCurrency;

  const legacy = `STRIPE_PRICE_${planId.toUpperCase()}_${billingPeriod.toUpperCase()}`;
  const fromLegacy = cleanStripePriceId(process.env[legacy]);
  if (fromLegacy) {
    if (currency !== 'pln') {
      console.warn(
        `[Stripe] ${withCurrency} is not set; using legacy ${legacy} for ${currency} checkout`,
      );
    }
    return fromLegacy;
  }

  return '';
}

export function stripePriceEnvVarName(
  planId: PlanId,
  billingPeriod: BillingPeriod,
  currency: PricingCurrency,
): string {
  return `STRIPE_PRICE_${planId.toUpperCase()}_${billingPeriod.toUpperCase()}_${currency.toUpperCase()}`;
}

// Mapowanie planów do Stripe Price IDs (tylko po stronie serwera)
function getPlanConfigs(currency: PricingCurrency): Record<PlanId, Record<BillingPeriod, Omit<PlanConfig, 'planId' | 'billingPeriod' | 'currency'>>> {
  const getPriceId = (planId: PlanId, billingPeriod: BillingPeriod): string =>
    resolveStripePriceId(planId, billingPeriod, currency);

  return {
    basic: {
      monthly: {
        credits: PLAN_CREDITS.basic.monthly,
        priceId: getPriceId('basic', 'monthly'),
      },
      yearly: {
        credits: PLAN_CREDITS.basic.yearly,
        priceId: getPriceId('basic', 'yearly'),
      },
    },
    pro: {
      monthly: {
        credits: PLAN_CREDITS.pro.monthly,
        priceId: getPriceId('pro', 'monthly'),
      },
      yearly: {
        credits: PLAN_CREDITS.pro.yearly,
        priceId: getPriceId('pro', 'yearly'),
      },
    },
    studio: {
      monthly: {
        credits: PLAN_CREDITS.studio.monthly,
        priceId: getPriceId('studio', 'monthly'),
      },
      yearly: {
        credits: PLAN_CREDITS.studio.yearly,
        priceId: getPriceId('studio', 'yearly'),
      },
    },
  };
}

// Funkcja do pobierania konfiguracji planu (tylko po stronie serwera - używa Price IDs)
export function getPlanConfig(planId: PlanId, billingPeriod: BillingPeriod, currency: PricingCurrency = 'pln'): PlanConfig {
  // Sprawdź czy jesteśmy po stronie serwera
  if (typeof window !== 'undefined') {
    // Po stronie klienta - zwróć tylko kredyty (bez Price ID)
    return {
      planId,
      billingPeriod,
      currency,
      credits: PLAN_CREDITS[planId][billingPeriod],
      priceId: '', // Price ID nie jest dostępne po stronie klienta
    };
  }
  
  // Po stronie serwera - zwróć pełną konfigurację z Price ID
  const configs = getPlanConfigs(currency);
  const config = configs[planId][billingPeriod];
  
  if (!config.priceId || config.priceId === '') {
    const envVarName = stripePriceEnvVarName(planId, billingPeriod, currency);
    const legacyVarName = `STRIPE_PRICE_${planId.toUpperCase()}_${billingPeriod.toUpperCase()}`;
    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    const envLocation = isProduction ? 'Vercel environment variables' : '.env.local';

    console.error(`[Stripe] Missing environment variable: ${envVarName} (and legacy ${legacyVarName})`);
    console.error(`[Stripe] Environment: ${process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'}`);
    console.error(`[Stripe] Available STRIPE_* env vars:`, Object.keys(process.env).filter(k => k.startsWith('STRIPE_')).join(', '));

    throw new Error(
      `${envVarName} is not set in ${envLocation}. ` +
        `Add it (or legacy ${legacyVarName}) in Vercel → Environment Variables or .env.local.`,
    );
  }
  
  return {
    planId,
    billingPeriod,
    currency,
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
  currency: PricingCurrency;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<string> {
  const { userHash, planId, billingPeriod, currency, successUrl, cancelUrl } = params;
  
  try {
    // Ta funkcja jest wywoływana tylko po stronie serwera (API route)
    console.log('[Stripe] Creating checkout session:', { planId, billingPeriod, currency, userHash: userHash.substring(0, 8) + '...' });
    console.log('[Stripe] Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL: process.env.VERCEL,
    });
    
    const envVarName = stripePriceEnvVarName(planId, billingPeriod, currency);
    const resolvedPriceId = resolveStripePriceId(planId, billingPeriod, currency);
    console.log(
      `[Stripe] Resolved price for ${envVarName}:`,
      resolvedPriceId ? `${resolvedPriceId.substring(0, 20)}...` : 'NOT SET',
    );
    console.log('[Stripe] All STRIPE_* env vars:', Object.keys(process.env).filter(k => k.startsWith('STRIPE_')).sort());

    const configs = getPlanConfigs(currency);
    const planConfig = configs[planId][billingPeriod];

    console.log('[Stripe] Plan config:', {
      planId, 
      billingPeriod, 
      currency,
      credits: planConfig.credits,
      priceId: planConfig.priceId ? planConfig.priceId.substring(0, 20) + '...' : 'MISSING',
      priceIdLength: planConfig.priceId?.length || 0
    });
    
    if (!planConfig.priceId || planConfig.priceId === '') {
      const legacyVarName = `STRIPE_PRICE_${planId.toUpperCase()}_${billingPeriod.toUpperCase()}`;
      console.error(`[Stripe] Missing environment variable: ${envVarName} (and legacy ${legacyVarName})`);
      console.error(`[Stripe] Available env vars:`, Object.keys(process.env).filter(k => k.startsWith('STRIPE_')));
      throw new Error(
        `${envVarName} is not set. Add it or legacy ${legacyVarName} in Vercel environment variables or .env.local.`,
      );
    }
    
    // Sprawdź czy Stripe secret key jest ustawiony
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Stripe] STRIPE_SECRET_KEY is not set');
      throw new Error('STRIPE_SECRET_KEY is not set. Please add it to Vercel environment variables.');
    }
    
    console.log('[Stripe] Stripe secret key present:', process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...');
    
    const stripeInstance = getStripe();
    
    console.log('[Stripe] Calling Stripe API to create checkout session...');
    console.log('[Stripe] Request params:', {
      mode: 'subscription',
      price: planConfig.priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    
    try {
      const session = await stripeInstance.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        allow_promotion_codes: true,
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
          currency,
          credits: PLAN_CREDITS[planId][billingPeriod].toString(),
        },
        subscription_data: {
          metadata: {
            user_hash: userHash,
            plan_id: planId,
            billing_period: billingPeriod,
            currency,
            credits: PLAN_CREDITS[planId][billingPeriod].toString(),
          },
        },
      });

      console.log('[Stripe] Checkout session created:', { 
        sessionId: session.id, 
        url: session.url ? 'present' : 'MISSING',
        status: session.status 
      });

      if (!session.url) {
        console.error('[Stripe] Session created but no URL:', session);
        throw new Error('Stripe checkout session created but no URL returned');
      }

      return session.url;
    } catch (stripeError: any) {
      // Log szczegółowy błąd Stripe
      console.error('[Stripe] Stripe API error:', {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message,
        statusCode: stripeError.statusCode,
        raw: stripeError.raw ? JSON.stringify(stripeError.raw, null, 2) : 'N/A',
      });
      
      // Sprawdź czy to problem z Price ID
      if (stripeError.code === 'resource_missing' || stripeError.message?.includes('No such price')) {
        throw new Error(`Price ID "${planConfig.priceId}" not found in Stripe. Please check if the Price is active in Stripe Dashboard.`);
      }
      
      // Sprawdź czy to problem z API key
      if (stripeError.code === 'api_key_expired' || stripeError.message?.includes('Invalid API Key')) {
        throw new Error('Invalid Stripe API key. Please check STRIPE_SECRET_KEY in Vercel environment variables.');
      }
      
      // Sprawdź czy to problem z mode (test vs live)
      if (stripeError.message?.includes('test mode') || stripeError.message?.includes('live mode')) {
        throw new Error(`Stripe mode mismatch: You're using ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live'} keys but Price ID might be from ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'live' : 'test'} mode.`);
      }
      
      throw stripeError;
    }
  } catch (error: any) {
    if (error.message?.includes('STRIPE_PRICE_')) {
      throw error; // Przekaż błąd o brakującym Price ID
    }
    
    console.error('[Stripe] Error creating checkout session:', error);
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

