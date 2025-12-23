import { supabase } from './supabase';

const CREDITS_PER_GENERATION = 10;
const FREE_GRANT_CREDITS = 600;

export interface CreditBalance {
  balance: number;
  generationsAvailable: number;
  hasActiveSubscription: boolean;
  subscriptionCreditsRemaining: number;
}

/**
 * Sprawdza dostępność kredytów dla użytkownika
 */
export async function checkCreditsAvailable(userHash: string, amount: number = CREDITS_PER_GENERATION): Promise<boolean> {
  try {
    const balance = await getCreditBalance(userHash);
    return balance.balance >= amount;
  } catch (error) {
    // Jeśli tabele nie istnieją, zwróć true aby nie blokować aplikacji
    console.warn('Error checking credits availability (tables may not exist):', error);
    return true; // Pozwól na generację jeśli nie można sprawdzić kredytów
  }
}

/**
 * Pobiera aktualny bilans kredytów użytkownika
 */
export async function getCreditBalance(userHash: string): Promise<CreditBalance> {
  try {
    // Użyj funkcji SQL do obliczenia bilansu (jeśli istnieje)
    const { data, error } = await supabase.rpc('get_credit_balance', {
      p_user_hash: userHash,
    });

    if (error) {
      // Fallback: oblicz bilans bezpośrednio z tabeli
      console.warn('RPC function not available, using direct query:', error);
      const { data: transactions, error: queryError } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('user_hash', userHash)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      if (queryError) {
        console.error('Error getting credit balance:', queryError);
        return {
          balance: 0,
          generationsAvailable: 0,
          hasActiveSubscription: false,
          subscriptionCreditsRemaining: 0,
        };
      }

      const balance = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
      const generationsAvailable = Math.floor(balance / CREDITS_PER_GENERATION);

      // Sprawdź aktywną subskrypcję
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('subscription_credits_remaining, credits_used')
        .eq('user_hash', userHash)
        .eq('status', 'active')
        .maybeSingle();

      return {
        balance,
        generationsAvailable,
        hasActiveSubscription: !!subscription,
        subscriptionCreditsRemaining: subscription?.subscription_credits_remaining || 0,
      };
    }

    const balance = data || 0;
  const generationsAvailable = Math.floor(balance / CREDITS_PER_GENERATION);

  // Sprawdź aktywną subskrypcję
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('subscription_credits_remaining, credits_used')
    .eq('user_hash', userHash)
    .eq('status', 'active')
    .maybeSingle();

  return {
    balance,
    generationsAvailable,
    hasActiveSubscription: !!subscription,
    subscriptionCreditsRemaining: subscription?.subscription_credits_remaining || 0,
  };
  } catch (error) {
    console.error('Error in getCreditBalance:', error);
    return {
      balance: 0,
      generationsAvailable: 0,
      hasActiveSubscription: false,
      subscriptionCreditsRemaining: 0,
    };
  }
}

/**
 * Odejmuje kredyty po udanej generacji
 */
export async function deductCredits(userHash: string, generationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('credit_transactions')
      .insert({
        user_hash: userHash,
        type: 'used',
        amount: -CREDITS_PER_GENERATION,
        source: null,
        generation_id: generationId,
        expires_at: null,
      });

    if (error) {
      // Jeśli tabela nie istnieje, to nie jest błąd krytyczny
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Credit transactions table does not exist yet:', error);
        return true; // Zwróć true aby nie blokować aplikacji
      }
      console.error('Error deducting credits:', error);
      return false;
    }
  } catch (error: any) {
    // Jeśli tabela nie istnieje, to nie jest błąd krytyczny
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.warn('Credit transactions table does not exist yet:', error);
      return true; // Zwróć true aby nie blokować aplikacji
    }
    console.error('Error deducting credits:', error);
    return false;
  }

  // Aktualizuj subscription_credits_remaining jeśli ma aktywną subskrypcję
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, subscription_credits_remaining')
      .eq('user_hash', userHash)
      .eq('status', 'active')
      .maybeSingle(); // Użyj maybeSingle zamiast single aby nie rzucać błędu gdy nie ma subskrypcji

    // Aktualizuj subscription_credits_remaining jeśli ma aktywną subskrypcję
    const { data: activeSubscription } = await supabase
      .from('subscriptions')
      .select('id, subscription_credits_remaining, credits_used')
      .eq('user_hash', userHash)
      .eq('status', 'active')
      .maybeSingle();

    if (activeSubscription && activeSubscription.subscription_credits_remaining > 0) {
      const newRemaining = Math.max(0, activeSubscription.subscription_credits_remaining - CREDITS_PER_GENERATION);
      await supabase
        .from('subscriptions')
        .update({
          subscription_credits_remaining: newRemaining,
          credits_used: (activeSubscription.credits_used || 0) + CREDITS_PER_GENERATION,
        })
        .eq('id', activeSubscription.id);
    }
  } catch (subscriptionError) {
    // Jeśli tabela subscriptions nie istnieje, to nie jest błąd krytyczny
    console.warn('Error updating subscription credits (table may not exist):', subscriptionError);
  }

  return true;
}

/**
 * Przydziela kredyty z subskrypcji
 */
export async function allocateSubscriptionCredits(
  userHash: string,
  planId: 'basic' | 'pro' | 'studio',
  billingPeriod: 'monthly' | 'yearly',
  credits: number,
  expiresAt: Date,
  subscriptionId: string
): Promise<boolean> {
  // Utwórz transakcję kredytową
  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_hash: userHash,
      type: 'subscription_allocated',
      amount: credits,
      source: `subscription_${planId}`,
      generation_id: null,
      expires_at: expiresAt.toISOString(),
    });

  if (transactionError) {
    console.error('Error allocating subscription credits:', transactionError);
    return false;
  }

  // Pobierz aktualną subskrypcję
  const { data: currentSubscription } = await supabase
    .from('subscriptions')
    .select('credits_allocated, subscription_credits_remaining')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  // Aktualizuj subskrypcję
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .update({
      credits_allocated: (currentSubscription?.credits_allocated || 0) + credits,
      subscription_credits_remaining: (currentSubscription?.subscription_credits_remaining || 0) + credits,
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (subscriptionError) {
    console.error('Error updating subscription:', subscriptionError);
    return false;
  }

  return true;
}

/**
 * Przyznaje darmowy grant kredytów (600 kredytów = 60 generacji)
 */
export async function grantFreeCredits(userHash: string): Promise<boolean> {
  // Sprawdź czy grant już został użyty
  const { data: participant } = await supabase
    .from('participants')
    .select('free_grant_used')
    .eq('user_hash', userHash)
    .single();

  if (participant?.free_grant_used) {
    console.log('Free grant already used for user:', userHash);
    return false;
  }

  // Utwórz transakcję kredytową
  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_hash: userHash,
      type: 'grant',
      amount: FREE_GRANT_CREDITS,
      source: 'free_grant',
      generation_id: null,
      expires_at: null, // Free grant nie wygasa
    });

  if (transactionError) {
    console.error('Error granting free credits:', transactionError);
    return false;
  }

  // Oznacz grant jako użyty
  const { error: updateError } = await supabase
    .from('participants')
    .update({
      free_grant_used: true,
      free_grant_used_at: new Date().toISOString(),
    })
    .eq('user_hash', userHash);

  if (updateError) {
    console.error('Error updating participant free_grant_used:', updateError);
    return false;
  }

  return true;
}

/**
 * Wygasza kredyty z wygasłymi expires_at
 */
export async function expireCredits(): Promise<number> {
  // Znajdź wszystkie aktywne kredyty subskrypcyjne które wygasły
  const now = new Date().toISOString();
  const { data: expiredCredits, error: selectError } = await supabase
    .from('credit_transactions')
    .select('user_hash, amount, id')
    .eq('type', 'subscription_allocated')
    .not('expires_at', 'is', null)
    .lt('expires_at', now);

  if (selectError) {
    console.error('Error fetching expired credits:', selectError);
    return 0;
  }

  if (!expiredCredits || expiredCredits.length === 0) {
    return 0;
  }

  // Grupuj po user_hash i oblicz sumę wygasających kredytów
  const expiredByUser = expiredCredits.reduce((acc, tx) => {
    if (!acc[tx.user_hash]) {
      acc[tx.user_hash] = { totalAmount: 0, transactionIds: [] };
    }
    acc[tx.user_hash].totalAmount += tx.amount;
    acc[tx.user_hash].transactionIds.push(tx.id);
    return acc;
  }, {} as Record<string, { totalAmount: number; transactionIds: string[] }>);

  let expiredCount = 0;

  // Utwórz transakcje expired dla każdego użytkownika
  for (const [userHash, { totalAmount }] of Object.entries(expiredByUser)) {
    if (totalAmount > 0) {
      const { error } = await supabase
        .from('credit_transactions')
        .insert({
          user_hash: userHash,
          type: 'expired',
          amount: -totalAmount,
          source: null,
          generation_id: null,
          expires_at: null,
        });

      if (!error) {
        expiredCount++;
      } else {
        console.error(`Error expiring credits for user ${userHash}:`, error);
      }
    }
  }

  return expiredCount;
}

export { CREDITS_PER_GENERATION, FREE_GRANT_CREDITS };

