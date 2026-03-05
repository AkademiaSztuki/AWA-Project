import { Router } from 'express';
import { pool } from '../db';

export const researchRouter = Router();

// POST /research/consent
researchRouter.post('/research/consent', async (req, res) => {
  const { userId, consent, locale, consentVersion } = req.body as {
    userId: string;
    consent: {
      consentResearch: boolean;
      consentProcessing: boolean;
      acknowledgedArt13: boolean;
    };
    locale: 'pl' | 'en';
    consentVersion: string;
  };

  if (
    !userId ||
    !consent ||
    typeof consent.consentResearch !== 'boolean' ||
    typeof consent.consentProcessing !== 'boolean' ||
    typeof consent.acknowledgedArt13 !== 'boolean' ||
    !locale ||
    !consentVersion
  ) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `
        INSERT INTO research_consents (
          user_id,
          consent_version,
          consent_research,
          consent_processing,
          acknowledged_art13,
          locale
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
        [
          userId,
          consentVersion,
          consent.consentResearch,
          consent.consentProcessing,
          consent.acknowledgedArt13,
          locale,
        ],
      );

      return res.json({ ok: true, consentId: rows[0].id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('research/consent error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

// POST /research/generation-feedback
researchRouter.post('/research/generation-feedback', async (req, res) => {
  const feedback = req.body as {
    sessionId: string;
    projectId?: string;
    generatedSources: string[];
    selectedSource: string | null;
    selectionTime: number;
    hasCompleteBigFive: boolean;
    tinderSwipeCount: number;
    explicitAnswerCount: number;
    sourceQuality?: Record<string, any>;
    implicitQuality?: any;
    conflictAnalysis?: any;
    userRating?: number;
  };

  if (!feedback.sessionId || !Array.isArray(feedback.generatedSources)) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query(
        `
        INSERT INTO generation_feedback (
          session_id,
          project_id,
          generated_sources,
          selected_source,
          selection_time_ms,
          has_complete_bigfive,
          tinder_swipe_count,
          explicit_answer_count,
          source_quality,
          implicit_quality,
          conflict_analysis,
          user_rating
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12
        )
      `,
        [
          feedback.sessionId,
          feedback.projectId || null,
          feedback.generatedSources,
          feedback.selectedSource,
          feedback.selectionTime,
          feedback.hasCompleteBigFive,
          feedback.tinderSwipeCount,
          feedback.explicitAnswerCount,
          feedback.sourceQuality || {},
          feedback.implicitQuality || null,
          feedback.conflictAnalysis || null,
          feedback.userRating ?? null,
        ],
      );

      return res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('research/generation-feedback error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

// POST /research/regeneration-event
researchRouter.post('/research/regeneration-event', async (req, res) => {
  const event = req.body as {
    sessionId: string;
    projectId?: string;
    previousSources: string[];
    previousSelected: string | null;
    regenerationCount: number;
    timeSinceLastMs: number;
    interpretation: string;
    sourceQuality?: Record<string, any>;
    implicitQuality?: any;
  };

  if (!event.sessionId || !event.interpretation) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query(
        `
        INSERT INTO regeneration_events (
          session_id,
          project_id,
          previous_sources,
          previous_selected,
          regeneration_count,
          time_since_last_ms,
          interpretation,
          source_quality,
          implicit_quality
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9
        )
      `,
        [
          event.sessionId,
          event.projectId || null,
          event.previousSources || [],
          event.previousSelected,
          event.regenerationCount,
          event.timeSinceLastMs,
          event.interpretation,
          event.sourceQuality || {},
          event.implicitQuality || null,
        ],
      );

      return res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('research/regeneration-event error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

