/** Referral rewards — additive grants; never counted as founders free_grant. */

export const REFERRAL_CODE_PREFIX = 'IDA-';

export const REFERRAL_VERIFY_CREDITS = 500;

export const REFERRAL_FIRST_GENERATION_CREDITS = 500;

export const REFERRAL_WELCOME_CREDITS = 2000;

export const REFERRAL_MILESTONE_3_CREDITS = 1000;

export const REFERRAL_MILESTONE_10_CREDITS = 3000;

export const REFERRAL_MILESTONE_3_COUNT = 3;

export const REFERRAL_MILESTONE_10_COUNT = 10;

export const REFERRAL_CREDIT_SOURCE = {
  referrer: 'referral',
  welcome: 'referral_welcome',
  milestone: 'referral_milestone',
} as const;

export type ReferralCreditSource =
  (typeof REFERRAL_CREDIT_SOURCE)[keyof typeof REFERRAL_CREDIT_SOURCE];

export type ReferralEventKind =
  | 'verified'
  | 'first_generation'
  | 'milestone_3'
  | 'milestone_10';
