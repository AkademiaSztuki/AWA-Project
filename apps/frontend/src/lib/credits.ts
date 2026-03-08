/**
 * Credits management – GCP backend only (Supabase removed).
 */

import { gcpApi } from './gcp-api-client';

const CREDITS_PER_GENERATION = 10;
const FREE_GRANT_CREDITS = 600;

export interface CreditBalance {
  balance: number;
  generationsAvailable: number;
  hasActiveSubscription: boolean;
  subscriptionCreditsRemaining: number;
}

export interface SubscriptionSummary {
  id: string;
  credits_used: number;
  credits_allocated: number;
  subscription_credits_remaining: number;
  stripe_customer_id: string | null;
  plan_id: string;
  billing_period: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface CreditOverview {
  balance: CreditBalance;
  subscription: SubscriptionSummary | null;
}

const EMPTY_BALANCE: CreditBalance = {
  balance: 0,
  generationsAvailable: 0,
  hasActiveSubscription: false,
  subscriptionCreditsRemaining: 0,
};

export async function checkCreditsAvailable(
  userHash: string,
  amount: number = CREDITS_PER_GENERATION,
): Promise<boolean> {
  try {
    const balance = await getCreditBalance(userHash);
    if (balance.hasActiveSubscription && balance.subscriptionCreditsRemaining >= amount) {
      return true;
    }
    return balance.balance >= amount;
  } catch (error) {
    console.warn('Error checking credits availability:', error);
    return true;
  }
}

export async function checkCreditsAvailableAdmin(
  userHash: string,
  amount: number = CREDITS_PER_GENERATION,
): Promise<boolean> {
  return checkCreditsAvailable(userHash, amount);
}

export async function getCreditBalance(userHash: string): Promise<CreditBalance> {
  const result = await gcpApi.credits.balance(userHash);
  if (!result.ok || !result.data) {
    return { ...EMPTY_BALANCE };
  }

  return {
    balance: result.data.balance || 0,
    generationsAvailable: result.data.generationsAvailable || 0,
    hasActiveSubscription: !!result.data.hasActiveSubscription,
    subscriptionCreditsRemaining: result.data.subscriptionCreditsRemaining || 0,
  };
}

export async function getCreditBalanceAdmin(userHash: string): Promise<CreditBalance> {
  return getCreditBalance(userHash);
}

export async function getCreditOverviewAdmin(userHash: string): Promise<CreditOverview> {
  const result = await gcpApi.credits.balance(userHash);
  if (!result.ok || !result.data) {
    return { balance: { ...EMPTY_BALANCE }, subscription: null };
  }

  return {
    balance: {
      balance: result.data.balance || 0,
      generationsAvailable: result.data.generationsAvailable || 0,
      hasActiveSubscription: !!result.data.hasActiveSubscription,
      subscriptionCreditsRemaining: result.data.subscriptionCreditsRemaining || 0,
    },
    subscription:
      (result.data.subscription as SubscriptionSummary | null) || null,
  };
}

export async function deductCredits(
  userHash: string,
  generationId: string,
): Promise<boolean> {
  const result = await gcpApi.credits.deduct({ userHash, generationId });
  return !!result.ok;
}

export async function allocateSubscriptionCredits(
  userHash: string,
  _planId: 'basic' | 'pro' | 'studio',
  _billingPeriod: 'monthly' | 'yearly',
  _credits: number,
  _expiresAt: Date,
  _subscriptionId: string,
): Promise<boolean> {
  console.warn('[Credits] allocateSubscriptionCredits not yet implemented for GCP-only mode');
  return false;
}

export async function grantFreeCredits(userHash: string): Promise<boolean> {
  const result = await gcpApi.credits.grantFree({ userHash });
  return !!result.ok && !!result.data?.granted;
}

export async function expireCredits(): Promise<number> {
  console.warn('[Credits] expireCredits not yet implemented for GCP-only mode');
  return 0;
}

export { CREDITS_PER_GENERATION, FREE_GRANT_CREDITS };
