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

researchRouter.post('/research/survey', async (req, res) => {
  const payload = req.body as {
    userHash?: string;
    type?: 'sus' | 'clarity' | 'agency' | 'satisfaction';
    answers?: Record<string, number>;
    score?: number;
  };

  if (!payload.userHash || !payload.type || typeof payload.score !== 'number') {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  const columnMap: Record<
    NonNullable<typeof payload.type>,
    { score: string; answers: string }
  > = {
    sus: { score: 'sus_score', answers: 'sus_answers' },
    clarity: { score: 'clarity_score', answers: 'clarity_answers' },
    agency: { score: 'agency_score', answers: 'agency_answers' },
    satisfaction: { score: 'satisfaction_score', answers: 'satisfaction_answers' },
  };

  const target = columnMap[payload.type];

  try {
    const client = await pool.connect();
    try {
      await client.query(
        `
          UPDATE participants
          SET ${target.score} = $2,
              ${target.answers} = $3,
              updated_at = NOW()
          WHERE user_hash = $1
        `,
        [payload.userHash, payload.score, payload.answers || {}]
      );

      return res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('research/survey error', error);
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
    const err = error as Error & { code?: string; detail?: string };
    console.error('research/generation-feedback error', err?.message, err?.code, err?.detail, error);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      code: err?.code,
      detail:
        typeof err?.detail === 'string'
          ? err.detail.slice(0, 400)
          : (err?.message ?? String(error)).slice(0, 400),
    });
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
    const err = error as Error & { code?: string; detail?: string };
    console.error('research/regeneration-event error', err?.message, err?.code, err?.detail, error);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      code: err?.code,
      detail:
        typeof err?.detail === 'string'
          ? err.detail.slice(0, 400)
          : (err?.message ?? String(error)).slice(0, 400),
    });
  }
});

type ResearchEventInput = {
  userHash?: string;
  eventType?: string;
  payload?: Record<string, unknown>;
  sessionId?: string;
  clientTimestamp?: string;
};

// POST /research/events — batch insert fine-grained research events
researchRouter.post('/research/events', async (req, res) => {
  const body = req.body as {
    events?: ResearchEventInput[];
    userHash?: string;
    eventType?: string;
    payload?: Record<string, unknown>;
    sessionId?: string;
    clientTimestamp?: string;
  };

  let list: ResearchEventInput[] = [];
  if (Array.isArray(body.events) && body.events.length > 0) {
    list = body.events;
  } else if (body.userHash && body.eventType) {
    list = [
      {
        userHash: body.userHash,
        eventType: body.eventType,
        payload: body.payload,
        sessionId: body.sessionId,
        clientTimestamp: body.clientTimestamp,
      },
    ];
  } else {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  if (list.length > 200) {
    return res.status(400).json({ ok: false, error: 'too_many_events' });
  }

  for (const ev of list) {
    if (!ev.userHash || typeof ev.userHash !== 'string' || !ev.eventType || typeof ev.eventType !== 'string') {
      return res.status(400).json({ ok: false, error: 'invalid_event' });
    }
    if (ev.userHash.length > 256 || ev.eventType.length > 128) {
      return res.status(400).json({ ok: false, error: 'invalid_event' });
    }
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const ev of list) {
        const payload = ev.payload && typeof ev.payload === 'object' ? ev.payload : {};
        let clientTs: Date | null = null;
        if (ev.clientTimestamp) {
          const d = new Date(ev.clientTimestamp);
          if (!Number.isNaN(d.getTime())) clientTs = d;
        }
        await client.query(
          `
          INSERT INTO participant_research_events (
            user_hash,
            event_type,
            payload,
            session_id,
            client_timestamp
          )
          VALUES ($1, $2, $3::jsonb, $4, $5)
        `,
          [
            ev.userHash,
            ev.eventType,
            JSON.stringify(payload),
            ev.sessionId ?? null,
            clientTs,
          ],
        );
      }
      await client.query('COMMIT');
      return res.json({ ok: true, inserted: list.length });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('research/events error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

