/**
 * Billing credit scale — keep in sync with apps/frontend/src/lib/stripe.ts
 * 100 credits per AI image generation; plan pools are display-scale (×10 vs legacy).
 */

export const CREDITS_PER_IMAGE = 100;

export const FREE_GRANT_CREDITS = 6000;

export const FOUNDERS_GRANT_MAX = Number(process.env.FOUNDERS_GRANT_MAX || 1000);

export const FOUNDERS_GRANT_CREDITS = Number(
  process.env.FOUNDERS_GRANT_CREDITS || FREE_GRANT_CREDITS,
);

export const PLAN_CREDITS = {
  basic: { monthly: 6000, yearly: 60000 },
  pro: { monthly: 16000, yearly: 192000 },
  studio: { monthly: 32000, yearly: 384000 },
} as const;
