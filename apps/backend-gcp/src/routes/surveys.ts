import { Router } from 'express';
import { pool } from '../db';

export const surveysRouter = Router();

// POST /research/survey
surveysRouter.post('/research/survey', async (req, res) => {
  const { sessionId, type, answers, susScore, clarityScore, agencyScore, satisfactionScore } =
    req.body as {
      sessionId: string;
      type: string;
      answers: Record<string, unknown>;
      susScore?: number;
      clarityScore?: number;
      agencyScore?: number;
      satisfactionScore?: number;
    };

  if (!sessionId || !type) {
    return res.status(400).json({ ok: false, error: 'sessionId and type are required' });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `
        INSERT INTO survey_results (
          session_id, type, answers,
          sus_score, clarity_score, agency_score, satisfaction_score
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
        [
          sessionId,
          type,
          JSON.stringify(answers || {}),
          susScore ?? null,
          clarityScore ?? null,
          agencyScore ?? null,
          satisfactionScore ?? null,
        ],
      );

      return res.json({ ok: true, surveyId: rows[0].id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('research/survey error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});
