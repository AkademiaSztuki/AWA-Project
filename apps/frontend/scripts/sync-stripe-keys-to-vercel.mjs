/**
 * Sync Stripe API keys from .env.local to Vercel (all environments).
 * Does not print secret values.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadEnv(filePath) {
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^"|"$/g, '').trim();
  }
  return out;
}

const local = loadEnv(path.join(cwd, '.env.local'));
const vars = [
  { name: 'STRIPE_SECRET_KEY', sensitive: true },
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', sensitive: false },
];
const environments = ['production', 'preview', 'development'];

function run(args, input, { allowFailure = false } = {}) {
  const result = spawnSync('npx', args, {
    cwd,
    input,
    encoding: 'utf8',
    shell: true,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status ?? 1);
  }
  return result.status === 0;
}

for (const { name, sensitive } of vars) {
  const value = local[name];
  if (!value) {
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }

  for (const environment of environments) {
    console.log(`Updating ${name} (${environment})...`);
    run(['vercel', 'env', 'rm', name, environment, '-y'], undefined, {
      allowFailure: true,
    });
    const addArgs = ['vercel', 'env', 'add', name, environment];
    const useSensitive = sensitive && environment !== 'development';
    if (useSensitive) addArgs.push('--sensitive');
    run(addArgs, value);
  }
}

console.log('Done. Redeploy production for env changes to apply.');
