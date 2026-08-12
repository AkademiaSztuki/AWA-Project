import { Router } from 'express';
import { pool } from '../db';
import {
  createShareCard,
  getShareCardBySlug,
  readShareImageBuffer,
  type SharePathType,
} from '../services/share-cards';

export const shareRouter = Router();

function isSharePathType(value: unknown): value is SharePathType {
  return value === 'fast' || value === 'full';
}

shareRouter.get('/share/cards/:slug', async (req, res) => {
  const { slug } = req.params;
  if (!slug) {
    return res.status(400).json({ ok: false, error: 'slug is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const card = await getShareCardBySlug(client, slug);
      if (!card) {
        return res.status(404).json({ ok: false, error: 'not_found' });
      }
      return res.json({
        ok: true,
        slug: card.slug,
        referralCode: card.referral_code,
        pathType: card.path_type,
        imagePublicUrl: card.image_public_url,
        styleLabel: card.style_label,
        roomType: card.room_type,
        personalityLabels: card.personality_labels || [],
        createdAt: card.created_at,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('share/cards get error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

shareRouter.get('/share/cards/:slug/image', async (req, res) => {
  const { slug } = req.params;
  if (!slug) {
    return res.status(400).json({ ok: false, error: 'slug is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const card = await getShareCardBySlug(client, slug);
      if (!card?.storage_path) {
        return res.status(404).json({ ok: false, error: 'not_found' });
      }
      const file = await readShareImageBuffer(card.storage_path);
      if (!file) {
        return res.status(404).json({ ok: false, error: 'not_found' });
      }
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return res.send(file.buffer);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('share/cards image error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

shareRouter.post('/share/cards', async (req, res) => {
  const { userHash, pathType, base64Image, styleLabel, roomType, personalityLabels } = req.body as {
    userHash?: string;
    pathType?: string;
    base64Image?: string;
    styleLabel?: string | null;
    roomType?: string | null;
    personalityLabels?: string[] | null;
  };

  if (!userHash || !pathType || !base64Image) {
    return res.status(400).json({ ok: false, error: 'userHash, pathType and base64Image are required' });
  }
  if (!isSharePathType(pathType)) {
    return res.status(400).json({ ok: false, error: 'invalid_path_type' });
  }

  try {
    const client = await pool.connect();
    try {
      const card = await createShareCard(client, {
        userHash,
        pathType,
        base64Image,
        styleLabel,
        roomType,
        personalityLabels,
      });
      return res.json({
        ok: true,
        slug: card.slug,
        referralCode: card.referral_code,
        pathType: card.path_type,
        imagePublicUrl: card.image_public_url,
        styleLabel: card.style_label,
        roomType: card.room_type,
        personalityLabels: card.personality_labels || [],
        reused: card.reused,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    const err = error as Error;
    if (err.message === 'gcs_not_configured') {
      return res.status(503).json({ ok: false, error: 'gcs_not_configured' });
    }
    if (err.message === 'participant_not_found') {
      return res.status(404).json({ ok: false, error: 'participant_not_found' });
    }
    if (err.message === 'invalid_image' || err.message === 'invalid_path_type') {
      return res.status(400).json({ ok: false, error: err.message });
    }
    console.error('share/cards create error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});
