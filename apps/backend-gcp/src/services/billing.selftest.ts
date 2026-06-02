/**
 * Run: pnpm --filter @aura/backend-gcp build && node dist/services/billing.selftest.js
 */
import {
  CREDITS_PER_IMAGE,
  FOUNDERS_GRANT_CREDITS,
  FREE_GRANT_CREDITS,
  PLAN_CREDITS,
} from '../lib/billing-constants';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

assert(CREDITS_PER_IMAGE === 100, 'CREDITS_PER_IMAGE should be 100');
assert(FREE_GRANT_CREDITS === 6000, 'FREE_GRANT_CREDITS should be 6000');
assert(FOUNDERS_GRANT_CREDITS === 6000, 'FOUNDERS_GRANT_CREDITS should match Basic plan grant');
assert(PLAN_CREDITS.basic.monthly === 6000, 'Basic monthly should be 6000 credits');
assert(PLAN_CREDITS.basic.yearly === 60000, 'Basic yearly should be 60000 credits');
assert(
  PLAN_CREDITS.basic.monthly / CREDITS_PER_IMAGE === 60,
  'Basic monthly should equal ~60 generations at default cost',
);

console.log('billing.selftest: all checks passed');
