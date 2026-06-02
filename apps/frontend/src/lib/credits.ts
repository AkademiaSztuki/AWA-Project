/**
 * Credits management – GCP backend only (Supabase removed).
 */

import { gcpApi } from './gcp-api-client';

/** SYNC with apps/backend-gcp/src/lib/billing-constants.ts */
const CREDITS_PER_GENERATION = 100;
const FREE_GRANT_CREDITS = 6000;

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

export type GrantFreeCreditsReason =
  | 'granted'
  | 'already_used'
  | 'program_full'
  | 'not_eligible'
  | 'no_participant';

export interface GrantFreeCreditsResponse {
  success: boolean;
  reason: GrantFreeCreditsReason | 'error';
}

export async function grantFreeCredits(userHash: string): Promise<GrantFreeCreditsResponse> {
  const result = await gcpApi.credits.grantFree({ userHash });
  if (!result.ok || !result.data) {
    return { success: false, reason: 'error' };
  }
  const reason = (result.data.reason as GrantFreeCreditsReason) || 'error';
  return { success: !!result.data.granted, reason };
}

export interface FoundersProgramStatus {
  max: number;
  claimed: number;
  remaining: number;
  open: boolean;
}

export async function getFoundersProgramStatus(): Promise<FoundersProgramStatus> {
  const result = await gcpApi.credits.foundersStatus();
  if (!result.ok || !result.data) {
    return { max: 1000, claimed: 0, remaining: 1000, open: true };
  }
  return {
    max: result.data.max ?? 1000,
    claimed: result.data.claimed ?? 0,
    remaining: result.data.remaining ?? 0,
    open: !!result.data.open,
  };
}

export type RedeemPromoReason =
  | 'granted'
  | 'already_redeemed'
  | 'invalid_code'
  | 'expired'
  | 'exhausted'
  | 'inactive'
  | 'error';

export async function redeemPromoCode(
  userHash: string,
  code: string,
): Promise<{ success: boolean; reason: RedeemPromoReason; credits?: number }> {
  const result = await gcpApi.credits.redeemPromo({ userHash, code });
  if (!result.ok || !result.data) {
    return { success: false, reason: 'error' };
  }
  return {
    success: !!result.data.granted,
    reason: (result.data.reason as RedeemPromoReason) || 'error',
    credits: result.data.credits,
  };
}

export async function expireCredits(): Promise<number> {
  console.warn('[Credits] expireCredits not yet implemented for GCP-only mode');
  return 0;
}

export { CREDITS_PER_GENERATION, FREE_GRANT_CREDITS };
