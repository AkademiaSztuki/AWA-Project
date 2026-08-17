/**
 * Run: pnpm --filter @aura/backend-gcp build && node dist/lib/referral-constants.selftest.js
 */
import {
  REFERRAL_CREDIT_SOURCE,
  REFERRAL_FIRST_GENERATION_CREDITS,
  REFERRAL_MILESTONE_10_COUNT,
  REFERRAL_MILESTONE_10_CREDITS,
  REFERRAL_MILESTONE_3_COUNT,
  REFERRAL_MILESTONE_3_CREDITS,
  REFERRAL_VERIFY_CREDITS,
  REFERRAL_WELCOME_CREDITS,
} from './referral-constants';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

assert(REFERRAL_VERIFY_CREDITS === 500, 'verify reward should be 500');
assert(REFERRAL_FIRST_GENERATION_CREDITS === 500, 'first generation reward should be 500');
assert(REFERRAL_WELCOME_CREDITS === 2000, 'welcome grant should be 2000');
assert(REFERRAL_MILESTONE_3_COUNT === 3, 'first milestone at 3 verified invites');
assert(REFERRAL_MILESTONE_10_COUNT === 10, 'second milestone at 10 verified invites');
assert(REFERRAL_MILESTONE_3_CREDITS === 1000, 'milestone 3 credits');
assert(REFERRAL_MILESTONE_10_CREDITS === 3000, 'milestone 10 credits');
assert(REFERRAL_CREDIT_SOURCE.referrer === 'referral', 'referrer source must not be free_grant');
assert(REFERRAL_CREDIT_SOURCE.welcome === 'referral_welcome', 'welcome source must not be free_grant');
assert(REFERRAL_CREDIT_SOURCE.milestone === 'referral_milestone', 'milestone source must not be free_grant');

console.log('referral-constants.selftest: all checks passed');
