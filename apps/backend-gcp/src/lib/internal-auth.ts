import type { Request } from 'express';

/** Shared secret for server-to-server calls (Next webhook → GCP billing, debug/cron). */
export function getInternalCronSecret(): string | undefined {
  return process.env.CRON_SECRET || process.env.GCP_INTERNAL_SECRET;
}

export function verifyInternalSecret(req: Request): boolean {
  const secret = getInternalCronSecret();
  if (!secret) return false;
  const auth = req.headers.authorization;
  if (auth === `Bearer ${secret}`) return true;
  const header = req.headers['x-internal-secret'];
  return typeof header === 'string' && header === secret;
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** In production always requires secret; in dev allows open access when secret unset. */
export function requireInternalSecretInProduction(req: Request): boolean {
  if (!isProductionEnv()) {
    const secret = getInternalCronSecret();
    if (!secret) return true;
    return verifyInternalSecret(req);
  }
  return verifyInternalSecret(req);
}

export function getMigrateSecret(): string | undefined {
  return process.env.MIGRATE_SECRET;
}

export function verifyMigrateSecret(req: Request): boolean {
  const secret = getMigrateSecret();
  if (!secret) {
    return !isProductionEnv();
  }
  const key = typeof req.query?.key === 'string' ? req.query.key : undefined;
  const bodyKey =
    req.body && typeof req.body === 'object' && 'key' in req.body
      ? String((req.body as { key?: unknown }).key)
      : undefined;
  return key === secret || bodyKey === secret;
}

export function requireDebugOrMigrateAccess(req: Request): boolean {
  if (!isProductionEnv()) return true;
  return verifyInternalSecret(req) || verifyMigrateSecret(req);
}
