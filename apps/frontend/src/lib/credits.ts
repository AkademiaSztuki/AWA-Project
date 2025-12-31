import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { PostgrestError } from '@supabase/supabase-js';

const CREDITS_PER_GENERATION = 10;
const FREE_GRANT_CREDITS = 600;

// Supabase client z service_role key dla operacji które wymagają omijania RLS
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    // W API routes (server-side) musimy mieć service_role key, inaczej RLS zablokuje zapis
    console.error('[Credits] SUPABASE_SERVICE_ROLE_KEY is not set - credit operations will fail with RLS');
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for credit operations. Please add it to Vercel environment variables.');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

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
  // Użyj service_role client dla operacji które wymagają omijania RLS
  const supabaseAdmin = getSupabaseAdmin();

  try {
    console.log('[Credits] Deducting credits:', { userHash, generationId, amount: CREDITS_PER_GENERATION });

    // generation_id miał historycznie typ UUID (FK), a w UI czasem przekazujemy string ID (np. "matrix-google-0-explicit").
    // Żeby nie blokować odejmowania kredytów w środowiskach bez migracji typu → TEXT, zapisuj generation_id tylko gdy to UUID.
    const isUuid =
      typeof generationId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(generationId);
    const safeGenerationId = isUuid ? generationId : null;
    
    const { error } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_hash: userHash,
        type: 'used',
        amount: -CREDITS_PER_GENERATION,
        source: null,
        generation_id: safeGenerationId,
        expires_at: null,
      });

    if (error) {
      // Jeśli tabela nie istnieje, to nie jest błąd krytyczny
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('[Credits] Credit transactions table does not exist yet:', error);
        return true; // Zwróć true aby nie blokować aplikacji
      }
      console.error('[Credits] Error deducting credits:', error);
      return false;
    }

    console.log('[Credits] Credits deducted successfully');
  } catch (error: any) {
    // Jeśli tabela nie istnieje, to nie jest błąd krytyczny
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.warn('[Credits] Credit transactions table does not exist yet:', error);
      return true; // Zwróć true aby nie blokować aplikacji
    }
    console.error('[Credits] Error deducting credits:', error);
    return false;
  }

  // Aktualizuj subscription_credits_remaining jeśli ma aktywną subskrypcję
  // Użyj najnowszej subskrypcji (najwyższa current_period_start) jeśli jest wiele aktywnych
  // Użyj RPC function dla atomowej aktualizacji, aby uniknąć race condition przy równoległych requestach
  try {
    const { data: activeSubscriptions, error: subscriptionQueryError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, subscription_credits_remaining, credits_used, current_period_start')
      .eq('user_hash', userHash)
      .eq('status', 'active')
      .order('current_period_start', { ascending: false })
      .limit(1);

    if (subscriptionQueryError) {
      console.warn('[Credits] Error querying subscriptions:', subscriptionQueryError);
      // Nie rzucaj błędu - to nie jest krytyczne
      return true;
    }

    const activeSubscription = activeSubscriptions && activeSubscriptions.length > 0 ? activeSubscriptions[0] : null;

    if (activeSubscription && activeSubscription.subscription_credits_remaining > 0) {
      // Użyj atomowej aktualizacji SQL, aby uniknąć race condition
      // Zamiast odczytać -> zmienić -> zapisać, używamy SQL UPDATE z wyrażeniem
      // To gwarantuje, że równoległe requesty nie nadpiszą się nawzajem
      const { data: updateResult, error: updateError } = await supabaseAdmin.rpc('deduct_subscription_credits', {
        p_subscription_id: activeSubscription.id,
        p_amount: CREDITS_PER_GENERATION
      });

      if (updateError) {
        // Fallback: jeśli RPC nie istnieje, użyj standardowego UPDATE
        // UWAGA: To może mieć race condition przy równoległych requestach!
        // Najlepiej uruchomić migrację 20251224000002_atomic_credit_deduction.sql
        console.warn('[Credits] RPC function not available, using standard update (may have race condition):', updateError);
        console.warn('[Credits] Please run migration 20251224000002_atomic_credit_deduction.sql to fix this');
        const newRemaining = Math.max(0, activeSubscription.subscription_credits_remaining - CREDITS_PER_GENERATION);
        const { error: fallbackError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            subscription_credits_remaining: newRemaining,
            credits_used: (activeSubscription.credits_used || 0) + CREDITS_PER_GENERATION,
          })
          .eq('id', activeSubscription.id);
        
        if (fallbackError) {
          console.warn('[Credits] Error updating subscription credits:', fallbackError);
        } else {
          console.log('[Credits] Subscription credits updated (fallback - may have race condition):', { 
            subscriptionId: activeSubscription.id,
            newRemaining, 
            creditsUsed: (activeSubscription.credits_used || 0) + CREDITS_PER_GENERATION 
          });
        }
      } else {
        console.log('[Credits] Subscription credits updated atomically:', { 
          subscriptionId: activeSubscription.id,
          amount: CREDITS_PER_GENERATION,
          result: updateResult
        });
      }
    }
  } catch (subscriptionError) {
    // Jeśli tabela subscriptions nie istnieje, to nie jest błąd krytyczny
    console.warn('[Credits] Error updating subscription credits (table may not exist):', subscriptionError);
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
  // Użyj service_role client dla operacji które wymagają omijania RLS
  const supabaseAdmin = getSupabaseAdmin();

  console.log('[Credits] Allocating subscription credits:', {
    userHash,
    planId,
    billingPeriod,
    credits,
    subscriptionId,
  });

  // Utwórz transakcję kredytową
  const { error: transactionError } = await supabaseAdmin
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
    console.error('[Credits] Error allocating subscription credits:', transactionError);
    return false;
  }

  console.log('[Credits] Credit transaction created successfully');

  // Pobierz aktualną subskrypcję
  const { data: currentSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('credits_allocated, subscription_credits_remaining')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  // Aktualizuj subskrypcję
  const { error: subscriptionError } = await supabaseAdmin
    .from('subscriptions')
    .update({
      credits_allocated: (currentSubscription?.credits_allocated || 0) + credits,
      subscription_credits_remaining: (currentSubscription?.subscription_credits_remaining || 0) + credits,
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (subscriptionError) {
    console.error('[Credits] Error updating subscription:', subscriptionError);
    return false;
  }

  console.log('[Credits] Subscription updated successfully');
  return true;
}

/**
 * Przyznaje darmowy grant kredytów (600 kredytów = 60 generacji)
 */
export async function grantFreeCredits(userHash: string): Promise<boolean> {
  // Użyj service_role client dla operacji które wymagają omijania RLS
  // Na serwerze (np. w API routes) używamy supabaseAdmin
  // Na kliencie ta funkcja i tak by nie zadziałała ze względu na brak klucza service_role
  let supabaseClient;
  try {
    supabaseClient = getSupabaseAdmin();
  } catch (e) {
    console.warn('[Credits] Using public supabase client for grantFreeCredits - this will likely fail due to RLS if not on server');
    supabaseClient = supabase;
  }

  // Sprawdź czy uczestnik już otrzymał grant (również przez powiązane konto auth)
  const { data: participant, error: fetchError } = await supabaseClient
    .from('participants')
    .select('free_grant_used, auth_user_id')
    .eq('user_hash', userHash)
    .maybeSingle();

  if (participant?.free_grant_used) {
    console.log('Free grant already used for user hash:', userHash);
    return false;
  }

  // Jeśli uczestnik jest zalogowany, sprawdź czy inne jego hashe już dostały grant
  if (participant?.auth_user_id) {
    const { data: otherParticipants } = await supabaseClient
      .from('participants')
      .select('free_grant_used')
      .eq('auth_user_id', participant.auth_user_id)
      .eq('free_grant_used', true)
      .maybeSingle();

    if (otherParticipants) {
      console.log('Free grant already used by another hash linked to this auth user:', participant.auth_user_id);
      
      // Zsynchronizuj flagę dla bieżącego hasha, aby nie próbować ponownie
      await supabaseClient
        .from('participants')
        .update({ free_grant_used: true, free_grant_used_at: new Date().toISOString() })
        .eq('user_hash', userHash);
        
      return false;
    }
  }

  // Jeśli uczestnik nie istnieje... (reszta kodu bez zmian)
  if (!participant) {
    console.log('Participant does not exist, creating new record for userHash:', userHash);
    const { error: insertError } = await supabaseClient
      .from('participants')
      .insert({
        user_hash: userHash,
        consent_timestamp: new Date().toISOString(),
        free_grant_used: false,
        updated_at: new Date().toISOString()
      } as any);

    if (insertError) {
      console.error('Error creating participant for credit grant:', insertError);
      return false;
    }
  }

  // Utwórz transakcję kredytową
  const { error: transactionError } = await supabaseClient
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
    // Jeśli mamy idempotencję po stronie DB (np. UNIQUE index na free_grant),
    // równoległe / powtórzone requesty mogą kończyć się konfliktem.
    // W takim przypadku traktuj to jako "już przyznane" i tylko zsynchronizuj flagę.
    const isDuplicate =
      transactionError.code === '23505' ||
      transactionError.message?.toLowerCase().includes('duplicate') ||
      transactionError.message?.toLowerCase().includes('unique');

    if (!isDuplicate) {
      console.error('Error granting free credits:', transactionError);
      return false;
    }

    console.warn('Free credits already granted (duplicate), syncing participant flag:', {
      userHash,
      code: transactionError.code,
    });

    await supabaseClient
      .from('participants')
      .update({
        free_grant_used: true,
        free_grant_used_at: new Date().toISOString(),
      })
      .eq('user_hash', userHash);

    return false;
  }

  // Oznacz grant jako użyty
  const { error: updateError } = await supabaseClient
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

