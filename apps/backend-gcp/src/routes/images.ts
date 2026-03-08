import { Router } from 'express';
import { pool } from '../db';

export const imagesRouter = Router();

// This route handles metadata insert into participant_images.
// Actual image bytes upload to GCS will be wired in a later step.

imagesRouter.get('/participants/:userHash/images', async (req, res) => {
  const { userHash } = req.params;

  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `
          SELECT *
          FROM participant_images
          WHERE user_hash = $1
          ORDER BY created_at DESC
        `,
        [userHash]
      );

      return res.json({ ok: true, images: rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('images list error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

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

imagesRouter.patch('/images/:imageId', async (req, res) => {
  const { imageId } = req.params;
  const patch = req.body as {
    userHash?: string;
    is_favorite?: boolean;
    tags_styles?: string[];
    tags_colors?: string[];
    tags_materials?: string[];
    tags_biophilia?: number | null;
    description?: string | null;
    space_id?: string | null;
  };

  if (!imageId || !patch?.userHash) {
    return res.status(400).json({ ok: false, error: 'imageId and userHash are required' });
  }

  try {
    const client = await pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [imageId, patch.userHash];
      let idx = 3;

      if (patch.is_favorite !== undefined) {
        updates.push(`is_favorite = $${idx++}`);
        values.push(!!patch.is_favorite);
      }
      if (patch.tags_styles !== undefined) {
        updates.push(`tags_styles = $${idx++}`);
        values.push(patch.tags_styles || []);
      }
      if (patch.tags_colors !== undefined) {
        updates.push(`tags_colors = $${idx++}`);
        values.push(patch.tags_colors || []);
      }
      if (patch.tags_materials !== undefined) {
        updates.push(`tags_materials = $${idx++}`);
        values.push(patch.tags_materials || []);
      }
      if (patch.tags_biophilia !== undefined) {
        updates.push(`tags_biophilia = $${idx++}`);
        values.push(patch.tags_biophilia);
      }
      if (patch.description !== undefined) {
        updates.push(`description = $${idx++}`);
        values.push(patch.description);
      }
      if (patch.space_id !== undefined) {
        updates.push(`space_id = $${idx++}`);
        values.push(patch.space_id);
      }

      if (updates.length === 0) {
        return res.json({ ok: true });
      }

      await client.query(
        `
          UPDATE participant_images
          SET ${updates.join(', ')}
          WHERE id = $1 AND user_hash = $2
        `,
        values
      );

      return res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('images patch error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

imagesRouter.delete('/images/:imageId', async (req, res) => {
  const { imageId } = req.params;
  const userHash =
    typeof req.query.userHash === 'string'
      ? req.query.userHash
      : typeof req.body?.userHash === 'string'
        ? req.body.userHash
        : '';

  if (!imageId || !userHash) {
    return res.status(400).json({ ok: false, error: 'imageId and userHash are required' });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `
          DELETE FROM participant_images
          WHERE id = $1 AND user_hash = $2
          RETURNING storage_path
        `,
        [imageId, userHash]
      );

      return res.json({ ok: true, storagePath: rows[0]?.storage_path || null });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('images delete error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

