import { Router } from 'express';
import { Storage } from '@google-cloud/storage';
import { pool } from '../db';

export const imagesRouter = Router();

// This route handles metadata insert into participant_images.
// Actual image bytes upload to GCS is handled in gcs-images.ts.

const bucketName = process.env.GCS_IMAGES_BUCKET;
let storageBucket: ReturnType<Storage['bucket']> | null = null;

if (!bucketName) {
  console.warn(
    '[backend-gcp] GCS_IMAGES_BUCKET is not set; image listing routes will not be able to generate signed URLs.',
  );
} else {
  try {
    const storage = new Storage();
    storageBucket = storage.bucket(bucketName);
  } catch (e) {
    console.error(
      '[backend-gcp] Failed to initialize Storage for images routes',
      (e as Error)?.message,
    );
  }
}

function normalizeGcsPath(rawPath: string): string | null {
  if (!rawPath) return null;

  let p = rawPath.trim();

  // If we stored a full GCS URL, strip scheme/host/bucket.
  // Examples:
  // - https://storage.googleapis.com/my-bucket/path/to/file.webp
  // - https://my-bucket.storage.googleapis.com/path/to/file.webp
  if (p.startsWith('http://') || p.startsWith('https://')) {
    try {
      const url = new URL(p);
      // Case 1: https://storage.googleapis.com/<bucket>/<path>
      if (url.hostname === 'storage.googleapis.com') {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          // [bucket, ...objectPath]
          const [, ...objectParts] = parts;
          p = objectParts.join('/');
        } else {
          return null;
        }
      } else {
        // Case 2: https://<bucket>.storage.googleapis.com/<path>
        // Hostname like "<bucket>.storage.googleapis.com"
        p = url.pathname.replace(/^\/+/, '');
      }
    } catch {
      // Fallback: treat as relative-ish path below.
    }
  }

  // Drop leading slash if any.
  p = p.replace(/^\/+/, '');

  // In case something still contains the bucket name as a prefix, strip "bucketName/".
  if (bucketName && p.startsWith(bucketName + '/')) {
    p = p.substring(bucketName.length + 1);
  }

  return p || null;
}

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
      let images: any[] = rows;

      // Attach signed URLs so the browser can load private GCS objects.
      if (storageBucket) {
        try {
          images = await Promise.all(
            rows.map(async (row: any) => {
              if (!row.storage_path) return row;

              const objectPath = normalizeGcsPath(row.storage_path);
              if (!objectPath) {
                console.warn(
                  'images signed_url skip: could not normalize storage_path',
                  row.storage_path,
                );
                return row;
              }

              try {
                const file = storageBucket!.file(objectPath);
                const [signedUrl] = await file.getSignedUrl({
                  action: 'read',
                  // 7 days should be enough for dashboard viewing
                  expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
                });
                return { ...row, signed_url: signedUrl };
              } catch (e) {
                console.error(
                  'images signed_url error',
                  (e as Error)?.message,
                  'path=',
                  row.storage_path,
                  'normalized=',
                  objectPath,
                );
                return row;
              }
            }),
          );
        } catch (e) {
          console.error('images list signed_url batch error', (e as Error)?.message);
        }
      }

      return res.json({ ok: true, images });
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

imagesRouter.get('/images/:imageId/raw', async (req, res) => {
  const { imageId } = req.params;

  if (!imageId) {
    return res.status(400).json({ ok: false, error: 'imageId is required' });
  }

  if (!storageBucket) {
    console.error('images raw error: storage bucket not initialized');
    return res.status(500).json({ ok: false, error: 'storage_not_configured' });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows, rowCount } = await client.query(
        `
          SELECT storage_path
          FROM participant_images
          WHERE id = $1
        `,
        [imageId],
      );

      if (!rowCount || !rows[0]?.storage_path) {
        return res.status(404).json({ ok: false, error: 'image_not_found' });
      }

      const objectPath = normalizeGcsPath(rows[0].storage_path);
      if (!objectPath) {
        console.error(
          'images raw error: could not normalize storage_path',
          rows[0].storage_path,
        );
        return res.status(500).json({ ok: false, error: 'invalid_storage_path' });
      }

      const file = storageBucket.file(objectPath);
      const [metadata] = await file.getMetadata();

      res.setHeader('Content-Type', metadata.contentType || 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      file
        .createReadStream()
        .on('error', (err) => {
          console.error('images raw stream error', err);
          if (!res.headersSent) {
            res.status(500).json({ ok: false, error: 'stream_error' });
          } else {
            res.end();
          }
        })
        .pipe(res);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('images raw error', error);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
    res.end();
  }
});

