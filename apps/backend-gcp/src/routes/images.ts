import { Router } from 'express';
import { pool } from '../db';

export const imagesRouter = Router();

// This route handles metadata insert into participant_images.
// Actual image bytes upload to GCS will be wired in a later step.

// POST /participants/:userHash/images
imagesRouter.post('/participants/:userHash/images', async (req, res) => {
  const { userHash } = req.params;
  const image = req.body as {
    type: 'generated' | 'inspiration' | 'room_photo' | 'room_photo_empty';
    space_id?: string;
    storage_path: string;
    public_url?: string;
    thumbnail_url?: string;
    is_favorite?: boolean;
    tags_styles?: string[];
    tags_colors?: string[];
    tags_materials?: string[];
    tags_biophilia?: number;
    description?: string;
    source?: string;
    generation_id?: string;
  };

  if (!userHash || !image?.type || !image?.storage_path) {
    return res
      .status(400)
      .json({ ok: false, error: 'userHash, type and storage_path are required' });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows, rowCount } = await client.query(
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
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14
        )
        RETURNING id
      `,
        [
          userHash,
          image.space_id || null,
          image.type,
          image.storage_path,
          image.public_url || null,
          image.thumbnail_url || null,
          image.is_favorite ?? false,
          image.tags_styles || [],
          image.tags_colors || [],
          image.tags_materials || [],
          image.tags_biophilia ?? null,
          image.description || null,
          image.source || null,
          image.generation_id || null,
        ],
      );

      if (!rowCount) {
        return res.status(500).json({ ok: false, error: 'insert_failed' });
      }

      return res.json({ ok: true, imageId: rows[0].id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('images insert error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

