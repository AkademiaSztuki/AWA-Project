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
  created_at: string;
}

export interface CreateShareCardInput {
  userHash: string;
  pathType: SharePathType;
  base64Image: string;
  styleLabel?: string | null;
  roomType?: string | null;
  personalityLabels?: string[] | null;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled share path type: ${String(value)}`);
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

async function savePublicShareCopy(slug: string, buffer: Buffer): Promise<{
  storagePath: string;
  publicUrl: string;
}> {
  if (!bucket) {
    throw new Error('gcs_not_configured');
  }

  const storagePath = `shares/${slug}.webp`;
  const file = bucket.file(storagePath);

  try {
    await file.save(buffer, {
      contentType: 'image/webp',
      resumable: false,
      public: true,
    });
  } catch {
    await file.save(buffer, {
      contentType: 'image/webp',
      resumable: false,
      public: false,
    });
  }

  try {
    await file.makePublic();
  } catch {
    // Uniform bucket-level access may reject ACLs; proxy URL still works.
  }

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(storagePath)}`;
  return { storagePath, publicUrl };
}

export async function createShareCard(
  client: PoolClient,
  input: CreateShareCardInput,
): Promise<ShareCardRow & { reused: boolean }> {
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
  if (buffer.length < 32) {
    throw new Error('invalid_image');
  }

  const slug = shareCardSlug(input.userHash, buffer);
  const existing = await getShareCardBySlug(client, slug);
  if (existing && existing.user_hash === input.userHash) {
    return { ...existing, reused: true };
  }

  let finalSlug = slug;
  if (existing && existing.user_hash !== input.userHash) {
    finalSlug = `${slug}${generateSlug().slice(0, 4)}`;
  }

  const saved = await savePublicShareCopy(finalSlug, buffer);
  const labels = (input.personalityLabels || []).filter((label) => label.trim().length > 0).slice(0, 5);

  const { rows } = await client.query<ShareCardRow>(
    `
      INSERT INTO share_cards (
        slug, user_hash, referral_code, path_type, image_public_url, storage_path,
        style_label, room_type, personality_labels
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (slug) DO UPDATE SET
        referral_code = COALESCE(share_cards.referral_code, EXCLUDED.referral_code)
      RETURNING
        slug, user_hash, referral_code, path_type, image_public_url, storage_path,
        style_label, room_type, personality_labels, created_at
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
    ],
  );

  return { ...rows[0], reused: false };
}

export async function getShareCardBySlug(
  client: PoolClient,
  slug: string,
): Promise<ShareCardRow | null> {
  const { rows } = await client.query<ShareCardRow>(
    `
      SELECT
        slug, user_hash, referral_code, path_type, image_public_url, storage_path,
        style_label, room_type, personality_labels, created_at
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
  return { buffer, contentType: 'image/webp' };
}
