/**
 * Compare PLAN_PRICES (stripe.ts) to Stripe Price objects; optionally create new recurring prices.
 *
 * Usage:
 *   node scripts/stripe-sync-prices.mjs              # compare only
 *   node scripts/stripe-sync-prices.mjs --create     # create missing / mismatched prices
 *
 * Reads STRIPE_SECRET_KEY and STRIPE_PRICE_* from apps/frontend/.env.local or repo root .env.local.
 * Does not print secret keys.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendDir, '../..');

const PLAN_PRICES = {
  pln: {
    basic: { monthly: 29, yearly: 290 },
    pro: { monthly: 59, yearly: 590 },
    studio: { monthly: 119, yearly: 1190 },
  },
  usd: {
    basic: { monthly: 9, yearly: 90 },
    pro: { monthly: 19, yearly: 190 },
    studio: { monthly: 39, yearly: 390 },
  },
};

const PLANS = ['basic', 'pro', 'studio'];
const PERIODS = ['monthly', 'yearly'];
const CURRENCIES = ['pln', 'usd'];

function loadEnv() {
  for (const file of [
    path.join(frontendDir, '.env.local'),
    path.join(repoRoot, '.env.local'),
  ]) {
    if (!fs.existsSync(file)) continue;
    const out = {};
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      out[m[1].trim()] = m[2].trim().replace(/^=/, '');
    }
    return out;
  }
  throw new Error('No .env.local found');
}

function envVarName(plan, period, currency) {
  return `STRIPE_PRICE_${plan.toUpperCase()}_${period.toUpperCase()}_${currency.toUpperCase()}`;
}

function legacyEnvVarName(plan, period) {
  return `STRIPE_PRICE_${plan.toUpperCase()}_${period.toUpperCase()}`;
}

function toMinor(currency, major) {
  return Math.round(major * 100);
}

function resolvePriceId(env, plan, period, currency) {
  const primary = env[envVarName(plan, period, currency)];
  if (primary) return primary.trim();
  if (currency === 'pln') {
    const legacy = env[legacyEnvVarName(plan, period)];
    if (legacy) return legacy.trim();
  }
  return '';
}

async function main() {
  const create = process.argv.includes('--create');
  const env = loadEnv();
  const sk = env.STRIPE_SECRET_KEY?.trim();
  if (!sk) {
    console.error('STRIPE_SECRET_KEY missing in .env.local');
    process.exit(1);
  }
  console.log('Stripe key:', `${sk.slice(0, 12)}...${sk.slice(-4)}`);

  const stripe = new Stripe(sk, { apiVersion: '2023-10-16' });
  const productId =
    process.env.STRIPE_PRODUCT_ID ||
    env.STRIPE_PRODUCT_ID ||
    'prod_Tetb8Uln1YGFHi';

  const mismatches = [];
  const created = [];

  for (const currency of CURRENCIES) {
    for (const plan of PLANS) {
      for (const period of PERIODS) {
        const expectedMajor = PLAN_PRICES[currency][plan][period];
        const expectedMinor = toMinor(currency, expectedMajor);
        const priceId = resolvePriceId(env, plan, period, currency);
        const interval = period === 'monthly' ? 'month' : 'year';
        const envName = envVarName(plan, period, currency);

        let stripeMajor = null;
        let stripeCurrency = null;
        let active = null;

        if (priceId) {
          try {
            const p = await stripe.prices.retrieve(priceId);
            stripeMajor = p.unit_amount / 100;
            stripeCurrency = p.currency;
            active = p.active;
            const ok =
              p.currency === currency &&
              p.unit_amount === expectedMinor &&
              p.recurring?.interval === interval;
            if (!ok) {
              mismatches.push({
                plan,
                period,
                currency,
                envVar: envName,
                priceId,
                appExpects: `${expectedMajor} ${currency.toUpperCase()}`,
                stripeHas: `${stripeMajor} ${String(stripeCurrency).toUpperCase()} (${interval})`,
                active,
              });
            } else {
              console.log(`OK ${envName} → ${priceId}`);
            }
          } catch (e) {
            mismatches.push({
              plan,
              period,
              currency,
              envVar: envName,
              priceId,
              appExpects: `${expectedMajor} ${currency.toUpperCase()}`,
              stripeHas: `(error: ${e.message})`,
            });
          }
        } else {
          mismatches.push({
            plan,
            period,
            currency,
            envVar: envName,
            priceId: '(not set)',
            appExpects: `${expectedMajor} ${currency.toUpperCase()}`,
            stripeHas: '(no env var)',
          });
        }

        if (create && (!priceId || mismatches.some((m) => m.envVar === envName))) {
          const p = await stripe.prices.create({
            product: productId,
            currency,
            unit_amount: expectedMinor,
            recurring: { interval },
            nickname: `IDA ${plan} ${period} ${currency}`,
          });
          created.push({ envVar: envName, priceId: p.id, amount: expectedMajor, currency });
          console.log(`CREATED ${envName}=${p.id} (${expectedMajor} ${currency})`);
        }
      }
    }
  }

  if (mismatches.length) {
    console.log('\n--- Mismatches / missing ---');
    console.table(mismatches);
  } else {
    console.log('\nAll configured prices match PLAN_PRICES.');
  }

  if (created.length) {
    console.log('\n--- Paste into .env.local / Vercel ---');
    for (const { envVar, priceId } of created) {
      console.log(`${envVar}=${priceId}`);
    }
    console.log(
      '\nArchive old Price objects in Stripe Dashboard (Prices are immutable; set active=false).',
    );
  }

  if (create && !created.length && mismatches.length) {
    console.log('Re-run with --create after fixing STRIPE_PRODUCT_ID if needed.');
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
