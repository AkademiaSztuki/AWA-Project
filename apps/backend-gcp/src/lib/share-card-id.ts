import crypto from 'crypto';

/** Stable public slug for the same owner + image bytes. */
export function shareCardSlug(userHash: string, buffer: Buffer): string {
  return crypto.createHash('sha256').update(userHash).update(buffer).digest('base64url').slice(0, 16);
}
