import { Router } from 'express';
import { pool } from '../db';

export const swipesRouter = Router();

// POST /participants/:userHash/swipes
swipesRouter.post('/participants/:userHash/swipes', async (req, res) => {
  const { userHash } = req.params;
  const swipes = (req.body?.swipes || []) as Array<{
    imageId: string | number;
    direction: 'left' | 'right';
    reactionTimeMs?: number;
    reactionTime?: number;
    timestamp?: string | number;
    categories?: {
      style?: string | null;
      colors?: string[];
      materials?: string[];
    };
    tags?: string[];
  }>;

  if (!userHash || !swipes.length) {
    return res.status(400).json({ ok: false, error: 'userHash and non-empty swipes are required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const rows = swipes.map((s) => ({
        user_hash: userHash,
        image_id: String(s.imageId),
        direction: s.direction,
        reaction_time_ms: s.reactionTimeMs ?? s.reactionTime ?? null,
        swipe_timestamp: s.timestamp
          ? typeof s.timestamp === 'string'
            ? s.timestamp
            : new Date(s.timestamp).toISOString()
          : new Date().toISOString(),
        image_styles: s.categories?.style ? [s.categories.style] : [],
        image_colors: s.categories?.colors ?? [],
        image_materials: s.categories?.materials ?? [],
      }));

      const insertValues: any[] = [];
      const valuePlaceholders: string[] = [];

      rows.forEach((r, idx) => {
        const offset = idx * 8;
        insertValues.push(
          r.user_hash,
          r.image_id,
          r.direction,
          r.reaction_time_ms,
          r.swipe_timestamp,
          r.image_styles,
          r.image_colors,
          r.image_materials,
        );
        valuePlaceholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`,
        );
      });

      await client.query(
        `
        INSERT INTO participant_swipes (
          user_hash,
          image_id,
          direction,
          reaction_time_ms,
          swipe_timestamp,
          image_styles,
          image_colors,
          image_materials
        )
        VALUES ${valuePlaceholders.join(', ')}
      `,
        insertValues,
      );

      // Recompute implicit aggregates for participant
      const { rows: swipeRows } = await client.query<{
        direction: string;
        image_styles: string[] | null;
        image_colors: string[] | null;
        image_materials: string[] | null;
      }>(
        `
        SELECT direction, image_styles, image_colors, image_materials
        FROM participant_swipes
        WHERE user_hash = $1
      `,
        [userHash],
      );

      interface SwipeRow {
        direction?: string;
        image_styles?: string[] | null;
        image_colors?: string[] | null;
        image_materials?: string[] | null;
      }
      const all: SwipeRow[] = swipeRows;
      const liked = all.filter((r: SwipeRow) => r.direction === 'right');

      const countMap = (vals: string[]) => {
        const m = new Map<string, number>();
        for (const v of vals) m.set(v, (m.get(v) || 0) + 1);
        return m;
      };

      const topN = (m: Map<string, number>, n: number) =>
        Array.from(m.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, n)
          .map(([k]) => k);

      const styles = liked
        .flatMap((r: SwipeRow) => (Array.isArray(r.image_styles) ? r.image_styles : []))
        .filter(Boolean);
      const colors = liked
        .flatMap((r: SwipeRow) => (Array.isArray(r.image_colors) ? r.image_colors : []))
        .filter(Boolean);
      const materials = liked
        .flatMap((r: SwipeRow) => (Array.isArray(r.image_materials) ? r.image_materials : []))
        .filter(Boolean);

      const topStyles = topN(countMap(styles), 3);
      const topColors = topN(countMap(colors), 3);
      const topMaterials = topN(countMap(materials), 3);

      const total = all.length;
      const likes = liked.length;
      const dislikes = total - likes;

      await client.query(
        `
        UPDATE participants
        SET
          implicit_dominant_style = $2,
          implicit_style_1 = $2,
          implicit_style_2 = $3,
          implicit_style_3 = $4,
          implicit_color_1 = $5,
          implicit_color_2 = $6,
          implicit_color_3 = $7,
          implicit_material_1 = $8,
          implicit_material_2 = $9,
          implicit_material_3 = $10,
          tinder_total_swipes = $11,
          tinder_likes = $12,
          tinder_dislikes = $13,
          updated_at = NOW()
        WHERE user_hash = $1
      `,
        [
          userHash,
          topStyles[0] || null,
          topStyles[1] || null,
          topStyles[2] || null,
          topColors[0] || null,
          topColors[1] || null,
          topColors[2] || null,
          topMaterials[0] || null,
          topMaterials[1] || null,
          topMaterials[2] || null,
          total,
          likes,
          dislikes,
        ],
      );

      await client.query('COMMIT');

      return res.json({
        ok: true,
        saved: swipes.length,
        aggregates: {
          total,
          likes,
          dislikes,
          topStyles,
          topColors,
          topMaterials,
        },
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('swipes insert error', error);
      return res.status(500).json({ ok: false, error: 'internal_error' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('swipes route error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

