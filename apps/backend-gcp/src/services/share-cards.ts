import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import { PoolClient } from 'pg';
import { ensureReferralCode } from './referral';
import { shareCardSlug } from '../lib/share-card-id';

const bucketName = process.env.GCS_IMAGES_BUCKET;
const storage = new Storage();
const bucket = bucketName ? storage.bucket(bucketName) : null;

export type SharePathType = 'fast' | 'full';

export interface ShareCardRow {
  slug: string;
  user_hash: string;
  referral_code: string | null;
  path_type: SharePathType;
  image_public_url: string;
  storage_path: string | null;
  style_label: string | null;
  room_type: string | null;
  personality_labels: string[] | null;
  language: 'pl' | 'en';
  created_at: string;
}

export interface CreateShareCardInput {
  userHash: string;
  pathType: SharePathType;
  base64Image: string;
  /** Original room photo (before). Required for new cards; stored as GCS sibling. */
  base64BeforeImage?: string | null;
  styleLabel?: string | null;
  roomType?: string | null;
  personalityLabels?: string[] | null;
  language?: 'pl' | 'en' | null;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled share path type: ${String(value)}`);
}

function normalizeShareLanguage(raw: unknown): 'pl' | 'en' {
  return raw === 'en' ? 'en' : 'pl';
}

function normalizePathType(raw: string): SharePathType {
  switch (raw) {
    case 'fast':
    case 'full':
      return raw;
    default:
      return assertNever(raw as never);
  }
}

function generateSlug(): string {
  return crypto.randomBytes(8).toString('base64url').replace(/=/g, '').slice(0, 10);
}

function decodeBase64Image(base64Image: string): Buffer {
  let clean = base64Image;
  const commaIndex = clean.indexOf(',');
  if (commaIndex !== -1) {
    clean = clean.slice(commaIndex + 1);
  }
  return Buffer.from(clean, 'base64');
}

export function beforeStoragePathForSlug(slug: string): string {
  return `shares/${slug}-before.webp`;
}

function sniffImageContentType(buffer: Buffer): string {
  return detectImageContentType(buffer) || 'image/jpeg';
}

export function detectImageContentType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 6 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  return null;
}

export function shareImageContentHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function assertDistinctBeforeImage(beforeBase64: string, afterBuffer: Buffer): Buffer {
  const beforeBuffer = decodeBase64Image(beforeBase64);
  if (beforeBuffer.length < 32 || !detectImageContentType(beforeBuffer)) {
    throw new Error('invalid_before_image');
  }
  if (shareImageContentHash(beforeBuffer) === shareImageContentHash(afterBuffer)) {
    throw new Error('before_after_identical');
  }
  return beforeBuffer;
}

async function savePublicShareCopy(
  storagePath: string,
  buffer: Buffer,
): Promise<{
  storagePath: string;
  publicUrl: string;
}> {
  if (!bucket) {
    throw new Error('gcs_not_configured');
  }

  const contentType = sniffImageContentType(buffer);
  const file = bucket.file(storagePath);

  try {
    await file.save(buffer, {
      contentType,
      resumable: false,
      public: true,
    });
  } catch {
    await file.save(buffer, {
      contentType,
      resumable: false,
      public: false,
    });
  }

  try {
    await file.makePublic();
  } catch {
    // Uniform bucket-level access may reject ACLs; proxy URL still works.
  }

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return { storagePath, publicUrl };
}

export async function shareBeforeImageExists(slug: string): Promise<boolean> {
  if (!bucket) return false;
  const [exists] = await bucket.file(beforeStoragePathForSlug(slug)).exists();
  return exists;
}

export async function createShareCard(
  client: PoolClient,
  input: CreateShareCardInput,
): Promise<ShareCardRow & { reused: boolean; hasBeforeImage: boolean }> {
  const pathType = normalizePathType(input.pathType);

  const existingParticipant = await client.query(
    `SELECT 1 FROM participants WHERE user_hash = $1 LIMIT 1`,
    [input.userHash],
  );
  if ((existingParticipant.rowCount ?? 0) === 0) {
    throw new Error('participant_not_found');
  }

  const referralCode = await ensureReferralCode(client, input.userHash);

  const buffer = decodeBase64Image(input.base64Image);
  if (buffer.length < 32 || !detectImageContentType(buffer)) {
    throw new Error('invalid_image');
  }

  const language = normalizeShareLanguage(input.language);

  const slug = shareCardSlug(input.userHash, buffer);
  const existing = await getShareCardBySlug(client, slug);
  if (existing && existing.user_hash === input.userHash) {
    if (input.base64BeforeImage) {
      try {
        const beforeBuffer = decodeBase64Image(input.base64BeforeImage);
        if (beforeBuffer.length < 32 || !detectImageContentType(beforeBuffer)) {
          throw new Error('invalid_before_image');
        }
        if (shareImageContentHash(beforeBuffer) === shareImageContentHash(buffer)) {
          if (!(await shareBeforeImageExists(existing.slug))) {
            throw new Error('before_after_identical');
          }
        } else {
          await savePublicShareCopy(beforeStoragePathForSlug(existing.slug), beforeBuffer);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (
          message === 'before_after_identical' ||
          message === 'invalid_before_image' ||
          message === 'gcs_not_configured'
        ) {
          throw error;
        }
        console.error('share before image save failed', { slug: existing.slug, error });
        if (!(await shareBeforeImageExists(existing.slug))) {
          throw new Error('before_image_save_failed');
        }
      }
    } else if (!(await shareBeforeImageExists(existing.slug))) {
      throw new Error('before_image_required');
    }
    if (existing.language !== language) {
      await client.query(`UPDATE share_cards SET language = $2 WHERE slug = $1`, [
        existing.slug,
        language,
      ]);
      existing.language = language;
    }
    return { ...existing, reused: true, hasBeforeImage: true };
  }

  if (!input.base64BeforeImage) {
    throw new Error('before_image_required');
  }
  const beforeBuffer = assertDistinctBeforeImage(input.base64BeforeImage, buffer);

  let finalSlug = slug;
  if (existing && existing.user_hash !== input.userHash) {
    finalSlug = `${slug}${generateSlug().slice(0, 4)}`;
  }

  const saved = await savePublicShareCopy(`shares/${finalSlug}.webp`, buffer);
  try {
    await savePublicShareCopy(beforeStoragePathForSlug(finalSlug), beforeBuffer);
  } catch (error) {
    console.error('share before image save failed', { slug: finalSlug, error });
    throw new Error('before_image_save_failed');
  }
  const labels = (input.personalityLabels || []).filter((label) => label.trim().length > 0).slice(0, 5);

  const { rows } = await client.query<ShareCardRow>(
    `
      INSERT INTO share_cards (
        slug, user_hash, referral_code, path_type, image_public_url, storage_path,
        style_label, room_type, personality_labels, language
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE SET
        referral_code = COALESCE(share_cards.referral_code, EXCLUDED.referral_code),
        language = EXCLUDED.language
      RETURNING
        slug, user_hash, referral_code, path_type, image_public_url, storage_path,
        style_label, room_type, personality_labels, language, created_at
    `,
    [
      finalSlug,
      input.userHash,
      referralCode,
      pathType,
      saved.publicUrl,
      saved.storagePath,
      input.styleLabel || null,
      input.roomType || null,
      labels.length > 0 ? labels : null,
      language,
    ],
  );

  return { ...rows[0], reused: false, hasBeforeImage: true };
}

export async function getShareCardBySlug(
  client: PoolClient,
  slug: string,
): Promise<ShareCardRow | null> {
  const { rows } = await client.query<ShareCardRow>(
    `
      SELECT
        slug, user_hash, referral_code, path_type, image_public_url, storage_path,
        style_label, room_type, personality_labels, language, created_at
      FROM share_cards
      WHERE slug = $1
      LIMIT 1
    `,
    [slug],
  );
  return rows[0] || null;
}

export async function readShareImageBuffer(storagePath: string): Promise<{
  buffer: Buffer;
  contentType: string;
} | null> {
  if (!bucket) return null;
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buffer] = await file.download();
  return { buffer, contentType: sniffImageContentType(buffer) };
}

export async function readShareBeforeImageBuffer(slug: string): Promise<{
  buffer: Buffer;
  contentType: string;
} | null> {
  return readShareImageBuffer(beforeStoragePathForSlug(slug));
}
