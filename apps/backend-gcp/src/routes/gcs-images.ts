import { Router } from 'express';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';

const bucketName = process.env.GCS_IMAGES_BUCKET;

if (!bucketName) {
  // We don't throw here to allow local dev without GCS, but routes will error if used.
  console.warn('[backend-gcp] GCS_IMAGES_BUCKET is not set; image upload routes will fail.');
}

const storage = new Storage();
const bucket = bucketName ? storage.bucket(bucketName) : null;

export const gcsImagesRouter = Router();

// POST /images/upload-and-register
// Body: { userHash, type, base64Image, space_id?, tags_styles?, tags_colors?, tags_materials?, tags_biophilia?, description?, source?, generation_id? }
gcsImagesRouter.post('/images/upload-and-register', async (req, res) => {
  const {
    userHash,
    type,
    base64Image,
    space_id,
    tags_styles,
    tags_colors,
    tags_materials,
    tags_biophilia,
    description,
    source,
    generation_id,
  } = req.body as {
    userHash: string;
    type: 'generated' | 'inspiration' | 'room_photo' | 'room_photo_empty';
    base64Image: string;
    space_id?: string;
    tags_styles?: string[];
    tags_colors?: string[];
    tags_materials?: string[];
    tags_biophilia?: number;
    description?: string;
    source?: string;
    generation_id?: string;
  };

  if (!userHash || !type || !base64Image) {
    return res
      .status(400)
      .json({ ok: false, error: 'userHash, type and base64Image are required' });
  }

  if (!bucket) {
    return res.status(500).json({ ok: false, error: 'GCS bucket not configured' });
  }

  try {
    // Clean data URL prefix if present
    let cleanBase64 = base64Image;
    const commaIndex = cleanBase64.indexOf(',');
    if (commaIndex !== -1) {
      cleanBase64 = cleanBase64.slice(commaIndex + 1);
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    const imageId = uuidv4();

    const date = new Date();
    const datePrefix = `${date.getFullYear()}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;

    const storagePath = `participants/${userHash}/${type}/${datePrefix}/${imageId}.webp`;

    const file = bucket.file(storagePath);

    await file.save(buffer, {
      contentType: 'image/webp',
      resumable: false,
      public: false,
    });

    const [metadata] = await file.getMetadata();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(
      storagePath,
    )}`;

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `
        INSERT INTO participant_images (
          user_hash,
          space_id,
          type,
          storage_path,
          public_url,
          thumbnail_url,
          is_favorite,
          tags_styles,
          tags_colors,
          tags_materials,
          tags_biophilia,
          description,
          source,
          generation_id
        )
        VALUES (
          $1, $2, $3, $4, $5, NULL, FALSE,
          $6, $7, $8, $9, $10, $11, $12
        )
        RETURNING id
      `,
        [
          userHash,
          space_id || null,
          type,
          storagePath,
          publicUrl,
          tags_styles || [],
          tags_colors || [],
          tags_materials || [],
          tags_biophilia ?? null,
          description || null,
          source || null,
          generation_id || null,
        ],
      );

      return res.json({
        ok: true,
        imageId: rows[0].id,
        storage_path: storagePath,
        public_url: publicUrl,
        size_bytes: metadata.size,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('gcs upload-and-register error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

