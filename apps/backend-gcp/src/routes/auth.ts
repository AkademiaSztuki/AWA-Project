import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db';
import { grantFreeCredits } from '../services/billing';
import { sendEmail } from '../lib/email';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const EMAIL_VERIFY_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_MINUTES = 60;
const EMAIL_PREFIX = 'email:';

/** Prefer the row that can log in (password + verified) when duplicates share an email. */
const PARTICIPANT_BY_EMAIL_ORDER = `
  ORDER BY
    (CASE WHEN password_hash IS NOT NULL AND length(password_hash::text) > 0 THEN 0 ELSE 1 END),
    (CASE WHEN email_verified = TRUE THEN 0 ELSE 1 END),
    (CASE WHEN core_profile_complete = TRUE THEN 0 ELSE 1 END),
    updated_at DESC NULLS LAST
`;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function resolveFrontendUrl(req: { get: (name: string) => string | undefined }): string {
  return (
    (process.env.MAGIC_LINK_FRONTEND_URL || '').replace(/\/$/, '') ||
    (req.get('origin') || '').replace(/\/$/, '') ||
    (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  );
}

function buildEmailVerifyLink(
  frontendUrl: string,
  token: string,
  nextPath?: string,
): string {
  const next =
    nextPath && typeof nextPath === 'string' && nextPath.startsWith('/')
      ? encodeURIComponent(nextPath)
      : '';
  return `${frontendUrl}/auth/verify-email?token=${token}${next ? `&next=${next}` : ''}`;
}

function buildPasswordResetLink(frontendUrl: string, token: string): string {
  return `${frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

type ParticipantAuthRow = {
  user_hash: string;
  auth_user_id: string | null;
  email_verified: boolean;
  password_hash: string | null;
  email: string | null;
};

export const authRouter = Router();

/** POST /api/auth/send-magic-link – tworzy token, opcjonalnie wysyła mail */
authRouter.post('/auth/send-magic-link', async (req, res) => {
  const { email: rawEmail, nextPath } = req.body as { email?: string; nextPath?: string };
  const email = rawEmail ? normalizeEmail(rawEmail) : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'valid email required' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

  // Najpierw env, potem Origin z żądania, na końcu NEXT_PUBLIC_APP_URL (fallback).
  const frontendUrl =
    (process.env.MAGIC_LINK_FRONTEND_URL || '').replace(/\/$/, '') ||
    (req.get('origin') || '').replace(/\/$/, '') ||
    (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

  const next = nextPath ? encodeURIComponent(nextPath) : '';
  const link = frontendUrl
    ? `${frontendUrl}/auth/verify?token=${token}${next ? `&next=${next}` : ''}`
    : '';

  try {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO magic_link_tokens (token, email, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
        [token, email, 'magic_login', expiresAt]
      );
    } finally {
      client.release();
    }
  } catch (e: unknown) {
    const err = e as Error & { code?: string };
    console.error('send-magic-link insert', err?.message);
    const msg = err?.message ?? '';
    const isMissingTable = msg.includes('magic_link_tokens') || err?.code === '42P01';
    const isConnectionError = msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('connect');
    return res.status(500).json({
      ok: false,
      error: isMissingTable ? 'missing_table' : isConnectionError ? 'database_connection_failed' : 'internal_error',
      hint: isMissingTable
        ? 'Wykonaj na bazie awa_db skrypt 04_magic_link_tokens.sql (lub .\\run-magic-link-migration.ps1).'
        : isConnectionError
          ? 'Backend nie łączy się z bazą. Wdróż ponownie: infra/gcp/./deploy-backend.ps1 (CLOUD_SQL_CONNECTION_NAME + --add-cloudsql-instances).'
          : undefined,
    });
  }

    const subject = 'Zaloguj się do IDA / Sign in to IDA';
  const html = `<p>Kliknij aby się zalogować / Click to sign in:</p><p><a href="${link}">${link}</a></p><p>Link wygasa za ${MAGIC_LINK_EXPIRY_MINUTES} minut.</p>`;
  const text = `Kliknij aby się zalogować: ${link}\n\nClick to sign in: ${link}`;

  if (!link) {
    return res.status(500).json({ ok: false, error: 'link_generation_failed' });
  }

  try {
    await sendEmail({ to: email, subject, html, text });
  } catch (err) {
    console.error('send-magic-link email', (err as Error)?.message);
    return res.status(500).json({ ok: false, error: 'email_send_failed' });
  }

  return res.json({ ok: true });
});

/** POST /api/auth/verify-magic-link – wymienia token na user_hash + auth_user_id */
authRouter.post('/auth/verify-magic-link', async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ ok: false, error: 'token required' });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ email: string; used_at: string | null }>(
      `SELECT email, used_at FROM magic_link_tokens WHERE token = $1 AND purpose = 'magic_login' AND expires_at > NOW()`,
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'invalid_or_expired_token' });
    }
    if (rows[0].used_at) {
      return res.status(400).json({ ok: false, error: 'token_already_used' });
    }

    const email = normalizeEmail(rows[0].email);
    const authUserId = `${EMAIL_PREFIX}${email}`;

    await client.query(
      `UPDATE magic_link_tokens SET used_at = NOW(), used_by_auth_user_id = $2 WHERE token = $1`,
      [token, authUserId]
    );

    const existing = await client.query<{ user_hash: string }>(
      `SELECT user_hash FROM participants WHERE auth_user_id = $1`,
      [authUserId]
    );

    if (existing.rows.length > 0) {
      return res.json({
        ok: true,
        user_hash: existing.rows[0].user_hash,
        auth_user_id: authUserId,
        email,
      });
    }

    const { v4: uuidV4 } = await import('uuid');
    const userHash = uuidV4();
    await client.query(
      `INSERT INTO participants (user_hash, auth_user_id, consent_timestamp, updated_at, email, email_verified) VALUES ($1, $2, NOW(), NOW(), $3, TRUE)`,
      [userHash, authUserId, email]
    );
    const grantResult = await grantFreeCredits(client, userHash);
    console.log('[auth] google native register grant', { userHash, grantResult });

    return res.json({
      ok: true,
      user_hash: userHash,
      auth_user_id: authUserId,
      email,
    });
  } finally {
    client.release();
  }
});

/** POST /api/auth/register – rejestracja e‑mail + hasło (wymaga weryfikacji e‑maila) */
authRouter.post('/auth/register', async (req, res) => {
  const { email: rawEmail, password, link_user_hash, next_path } = req.body as {
    email?: string;
    password?: string;
    link_user_hash?: string;
    next_path?: string;
  };
  const email = rawEmail ? normalizeEmail(rawEmail) : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'valid email required' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ ok: false, error: 'password_too_weak' });
  }

  const client = await pool.connect();
  try {
    const authUserId = `${EMAIL_PREFIX}${email}`;
    const linkHash =
      typeof link_user_hash === 'string' && link_user_hash.trim().length > 0
        ? link_user_hash.trim()
        : null;

    const existing = await client.query(
      `SELECT 1 FROM participants
       WHERE (auth_user_id = $1 OR email = $2)
         AND ($3::text IS NULL OR user_hash <> $3)`,
      [authUserId, email, linkHash],
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ ok: false, error: 'email_already_exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { v4: uuidV4 } = await import('uuid');
    let userHash: string;

    if (linkHash) {
      const linkRow = await client.query<{
        user_hash: string;
        auth_user_id: string | null;
        email: string | null;
      }>(`SELECT user_hash, auth_user_id, email FROM participants WHERE user_hash = $1`, [
        linkHash,
      ]);

      if (linkRow.rows.length === 0) {
        userHash = uuidV4();
        await client.query(
          `INSERT INTO participants (user_hash, auth_user_id, email, password_hash, email_verified, consent_timestamp, updated_at)
           VALUES ($1, $2, $3, $4, FALSE, NOW(), NOW())`,
          [userHash, authUserId, email, passwordHash],
        );
      } else {
        const row = linkRow.rows[0];
        if (row.auth_user_id && row.auth_user_id !== authUserId) {
          return res.status(400).json({ ok: false, error: 'invalid_link_user_hash' });
        }
        if (row.email && normalizeEmail(row.email) !== email) {
          return res.status(400).json({ ok: false, error: 'invalid_link_user_hash' });
        }
        userHash = row.user_hash;
        await client.query(
          `UPDATE participants
           SET auth_user_id = $2, email = $3, password_hash = $4, email_verified = FALSE, updated_at = NOW()
           WHERE user_hash = $1`,
          [userHash, authUserId, email, passwordHash],
        );
      }
    } else {
      userHash = uuidV4();
      await client.query(
        `INSERT INTO participants (user_hash, auth_user_id, email, password_hash, email_verified, consent_timestamp, updated_at)
         VALUES ($1, $2, $3, $4, FALSE, NOW(), NOW())`,
        [userHash, authUserId, email, passwordHash],
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_EXPIRY_HOURS * 60 * 60 * 1000);

    const frontendUrl = resolveFrontendUrl(req);
    const safeNext =
      typeof next_path === 'string' && next_path.startsWith('/') ? next_path : undefined;
    const link = frontendUrl ? buildEmailVerifyLink(frontendUrl, token, safeNext) : '';

    await client.query(
      `INSERT INTO magic_link_tokens (token, email, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
      [token, email, 'email_verify', expiresAt],
    );

    if (!link) {
      return res.status(500).json({ ok: false, error: 'link_generation_failed' });
    }

    const subject = 'Potwierdź swój adres e‑mail w IDA / Verify your email';
    const html = `<p>Dziękujemy za rejestrację w IDA.</p><p>Kliknij, aby potwierdzić adres e‑mail:</p><p><a href="${link}">${link}</a></p><p>Link wygaśnie za ${EMAIL_VERIFY_EXPIRY_HOURS} godzin.</p>`;
    const text = `Dziękujemy za rejestrację w IDA.\n\nKliknij, aby potwierdzić adres e‑mail: ${link}\n\nLink wygaśnie za ${EMAIL_VERIFY_EXPIRY_HOURS} godzin.`;

    try {
      await sendEmail({ to: email, subject, html, text });
    } catch (err) {
      console.error('register email', (err as Error)?.message);
      return res.status(500).json({ ok: false, error: 'email_send_failed' });
    }

    return res.json({ ok: true, user_hash: userHash });
  } catch (e) {
    console.error('auth/register', (e as Error)?.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  } finally {
    client.release();
  }
});

/** POST /api/auth/verification-status – czy e‑mail został już potwierdzony (polling po rejestracji) */
authRouter.post('/auth/verification-status', async (req, res) => {
  const { email: rawEmail } = req.body as { email?: string };
  const email = rawEmail ? normalizeEmail(rawEmail) : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'valid email required' });
  }

  try {
    const authUserId = `${EMAIL_PREFIX}${email}`;
    const { rows } = await pool.query<{ email_verified: boolean }>(
      `SELECT email_verified FROM participants WHERE auth_user_id = $1 OR LOWER(TRIM(email)) = $2 ${PARTICIPANT_BY_EMAIL_ORDER} LIMIT 1`,
      [authUserId, email],
    );
    const verified = rows.length > 0 && rows[0].email_verified === true;
    return res.json({ ok: true, verified });
  } catch (e) {
    console.error('auth/verification-status', (e as Error)?.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

/** POST /api/auth/verify-email – potwierdzenie adresu e‑mail po rejestracji */
authRouter.post('/auth/verify-email', async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ ok: false, error: 'token required' });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ email: string; used_at: string | null }>(
      `SELECT email, used_at FROM magic_link_tokens WHERE token = $1 AND purpose = 'email_verify' AND expires_at > NOW()`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'invalid_or_expired_token' });
    }

    const email = normalizeEmail(rows[0].email);
    const authUserId = `${EMAIL_PREFIX}${email}`;

    const { rows: participantRows } = await client.query<{
      user_hash: string;
      email_verified: boolean;
    }>(
      `SELECT user_hash, email_verified FROM participants WHERE auth_user_id = $1 OR email = $2 ${PARTICIPANT_BY_EMAIL_ORDER}`,
      [authUserId, email]
    );

    if (participantRows.length === 0) {
      console.error('[auth.verify-email] participant_not_found for email', { email, authUserId });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '5e0063',
        },
        body: JSON.stringify({
          sessionId: '5e0063',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'routes/auth.ts:verify-email:participant-not-found',
          message: 'participant not found during email verification',
          data: { email, authUserId },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log
      return res.status(400).json({ ok: false, error: 'participant_not_found' });
    }

    const participant = participantRows[0];

    if (!rows[0].used_at) {
      // Pierwsze użycie tokenu – oznacz jako użyty i zweryfikuj e-mail
      console.log('[auth.verify-email] first time use of token, verifying email and granting credits', {
        userHash: participant.user_hash,
        email,
        authUserId,
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '5e0063',
        },
        body: JSON.stringify({
          sessionId: '5e0063',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'routes/auth.ts:verify-email:first-use',
          message: 'verify-email first use, about to call grantFreeCredits',
          data: { userHash: participant.user_hash, email, authUserId },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log
      await client.query(
        `UPDATE magic_link_tokens SET used_at = NOW(), used_by_auth_user_id = $2 WHERE token = $1`,
        [token, authUserId]
      );

      await client.query(
        `UPDATE participants SET email_verified = TRUE, email = $2, auth_user_id = $3 WHERE user_hash = $1`,
        [participant.user_hash, email, authUserId]
      );

      if (!participant.email_verified) {
        const grantResult = await grantFreeCredits(client, participant.user_hash);
        console.log('[auth.verify-email] grantFreeCredits result', {
          userHash: participant.user_hash,
          grantResult,
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '5e0063',
          },
          body: JSON.stringify({
            sessionId: '5e0063',
            runId: 'pre-fix',
            hypothesisId: 'H1',
            location: 'routes/auth.ts:verify-email:grant-result',
            message: 'grantFreeCredits result from verify-email',
            data: { userHash: participant.user_hash, grantResult },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log
      } else {
        console.log('[auth.verify-email] email already verified earlier, skipping free credits', {
          userHash: participant.user_hash,
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '5e0063',
          },
          body: JSON.stringify({
            sessionId: '5e0063',
            runId: 'pre-fix',
            hypothesisId: 'H2',
            location: 'routes/auth.ts:verify-email:already-verified',
            message: 'email already verified, skipping grantFreeCredits',
            data: { userHash: participant.user_hash },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log
      }
    }

    // Jeśli token był już użyty, traktujemy to jako poprawne ponowne wejście:
    // zwracamy istniejące dane użytkownika zamiast błędu.
    console.log('[auth.verify-email] success', {
      userHash: participant.user_hash,
      authUserId,
      email,
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '5e0063',
      },
      body: JSON.stringify({
        sessionId: '5e0063',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'routes/auth.ts:verify-email:success',
        message: 'verify-email success',
        data: { userHash: participant.user_hash, authUserId, email },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
    return res.json({
      ok: true,
      user_hash: participant.user_hash,
      auth_user_id: authUserId,
      email,
    });
  } catch (e) {
    const err = e as Error;
    console.error('auth/verify-email error', err?.message);
    return res.status(500).json({
      ok: false,
      error: err?.message || 'internal_error',
    });
  } finally {
    client.release();
  }
});

/** POST /api/auth/login – logowanie e‑mail + hasło */
authRouter.post('/auth/login', async (req, res) => {
  const { email: rawEmail, password } = req.body as { email?: string; password?: string };
  const email = rawEmail ? normalizeEmail(rawEmail) : '';

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'invalid_credentials' });
  }

  const client = await pool.connect();
  try {
    const authUserId = `${EMAIL_PREFIX}${email}`;
    const { rows } = await client.query<ParticipantAuthRow & { auth_user_id: string }>(
      `SELECT user_hash, auth_user_id, email_verified, password_hash, email
       FROM participants
       WHERE auth_user_id = $1 OR LOWER(TRIM(email)) = $2
       ${PARTICIPANT_BY_EMAIL_ORDER}
       LIMIT 1`,
      [authUserId, email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'invalid_credentials' });
    }

    const participant = rows[0];

    if (!participant.email_verified) {
      return res.status(400).json({ ok: false, error: 'email_not_verified' });
    }

    if (!participant.password_hash) {
      return res.status(400).json({
        ok: false,
        error: 'password_not_set',
        hint: 'Use magic link or reset password if you registered with email only.',
      });
    }

    const matches = await bcrypt.compare(password, participant.password_hash);
    if (!matches) {
      return res.status(400).json({ ok: false, error: 'invalid_credentials' });
    }

    return res.json({
      ok: true,
      user_hash: participant.user_hash,
      auth_user_id: participant.auth_user_id || authUserId,
      email: participant.email || email,
    });
  } catch (e) {
    console.error('auth/login', (e as Error)?.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  } finally {
    client.release();
  }
});

/** POST /api/auth/forgot-password – wyślij link do resetu hasła (nie ujawnia czy konto istnieje) */
authRouter.post('/auth/forgot-password', async (req, res) => {
  const { email: rawEmail } = req.body as { email?: string };
  const email = rawEmail ? normalizeEmail(rawEmail) : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'valid email required' });
  }

  const client = await pool.connect();
  try {
    const authUserId = `${EMAIL_PREFIX}${email}`;
    const { rows } = await client.query<ParticipantAuthRow>(
      `SELECT user_hash, auth_user_id, email_verified, password_hash, email
       FROM participants
       WHERE auth_user_id = $1 OR LOWER(TRIM(email)) = $2
       ${PARTICIPANT_BY_EMAIL_ORDER}
       LIMIT 1`,
      [authUserId, email],
    );

    if (rows.length === 0 || !rows[0].email_verified) {
      return res.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
    const frontendUrl = resolveFrontendUrl(req);
    const link = frontendUrl ? buildPasswordResetLink(frontendUrl, token) : '';

    await client.query(
      `INSERT INTO magic_link_tokens (token, email, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
      [token, email, 'password_reset', expiresAt],
    );

    if (!link) {
      return res.status(500).json({ ok: false, error: 'link_generation_failed' });
    }

    const subject = 'Reset hasła w IDA / Reset your IDA password';
    const html = `<p>Otrzymaliśmy prośbę o reset hasła do IDA.</p><p><a href="${link}">${link}</a></p><p>Link wygaśnie za ${PASSWORD_RESET_EXPIRY_MINUTES} minut. Jeśli to nie Ty — zignoruj tę wiadomość.</p>`;
    const text = `Reset hasła IDA: ${link}\n\nLink wygaśnie za ${PASSWORD_RESET_EXPIRY_MINUTES} minut.`;

    try {
      await sendEmail({ to: email, subject, html, text });
    } catch (err) {
      console.error('forgot-password email', (err as Error)?.message);
      return res.status(500).json({ ok: false, error: 'email_send_failed' });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('auth/forgot-password', (e as Error)?.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  } finally {
    client.release();
  }
});

/** POST /api/auth/reset-password – ustaw nowe hasło z tokenu z maila */
authRouter.post('/auth/reset-password', async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ ok: false, error: 'token required' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ ok: false, error: 'password_too_weak' });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ email: string; used_at: string | null }>(
      `SELECT email, used_at FROM magic_link_tokens WHERE token = $1 AND purpose = 'password_reset' AND expires_at > NOW()`,
      [token],
    );

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'invalid_or_expired_token' });
    }
    if (rows[0].used_at) {
      return res.status(400).json({ ok: false, error: 'token_already_used' });
    }

    const email = normalizeEmail(rows[0].email);
    const authUserId = `${EMAIL_PREFIX}${email}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const { rows: participantRows } = await client.query<ParticipantAuthRow>(
      `SELECT user_hash, auth_user_id, email_verified, password_hash, email
       FROM participants
       WHERE auth_user_id = $1 OR LOWER(TRIM(email)) = $2
       ${PARTICIPANT_BY_EMAIL_ORDER}
       LIMIT 1`,
      [authUserId, email],
    );

    if (participantRows.length === 0) {
      return res.status(400).json({ ok: false, error: 'participant_not_found' });
    }

    const participant = participantRows[0];

    await client.query(
      `UPDATE magic_link_tokens SET used_at = NOW(), used_by_auth_user_id = $2 WHERE token = $1`,
      [token, authUserId],
    );

    await client.query(
      `UPDATE participants
       SET password_hash = $2,
           email_verified = TRUE,
           email = $3,
           auth_user_id = $4,
           updated_at = NOW()
       WHERE user_hash = $1`,
      [participant.user_hash, passwordHash, email, authUserId],
    );

    return res.json({
      ok: true,
      user_hash: participant.user_hash,
      auth_user_id: participant.auth_user_id || authUserId,
      email,
    });
  } catch (e) {
    console.error('auth/reset-password', (e as Error)?.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  } finally {
    client.release();
  }
});

/** POST /api/auth/resend-verification – ponowne wysłanie maila weryfikacyjnego */
authRouter.post('/auth/resend-verification', async (req, res) => {
  const { email: rawEmail, next_path } = req.body as { email?: string; next_path?: string };
  const email = rawEmail ? normalizeEmail(rawEmail) : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'valid email required' });
  }

  const client = await pool.connect();
  try {
    const authUserId = `${EMAIL_PREFIX}${email}`;
    const { rows } = await client.query<{
      user_hash: string;
      email_verified: boolean;
    }>(
      `SELECT user_hash, email_verified FROM participants WHERE auth_user_id = $1 OR email = $2`,
      [authUserId, email]
    );

    if (rows.length === 0) {
      // Nie zdradzamy czy konto istnieje
      return res.json({ ok: true });
    }

    const participant = rows[0];
    if (participant.email_verified) {
      return res.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_EXPIRY_HOURS * 60 * 60 * 1000);

    const frontendUrl = resolveFrontendUrl(req);
    const safeNext =
      typeof next_path === 'string' && next_path.startsWith('/') ? next_path : undefined;
    const link = frontendUrl ? buildEmailVerifyLink(frontendUrl, token, safeNext) : '';

    await client.query(
      `INSERT INTO magic_link_tokens (token, email, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
      [token, email, 'email_verify', expiresAt]
    );

    if (!link) {
      return res.status(500).json({ ok: false, error: 'link_generation_failed' });
    }

    const subject = 'Potwierdź swój adres e‑mail w IDA / Verify your email';
    const html = `<p>Wygląda na to, że konto w IDA czeka na potwierdzenie.</p><p>Kliknij, aby potwierdzić adres e‑mail:</p><p><a href="${link}">${link}</a></p><p>Link wygaśnie za ${EMAIL_VERIFY_EXPIRY_HOURS} godzin.</p>`;
    const text = `Wygląda na to, że konto w IDA czeka na potwierdzenie.\n\nKliknij, aby potwierdzić adres e‑mail: ${link}\n\nLink wygaśnie za ${EMAIL_VERIFY_EXPIRY_HOURS} godzin.`;

    try {
      await sendEmail({ to: email, subject, html, text });
    } catch (err) {
      console.error('resend-verification email', (err as Error)?.message);
      return res.status(500).json({ ok: false, error: 'email_send_failed' });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('auth/resend-verification', (e as Error)?.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  } finally {
    client.release();
  }
});

/** POST /api/auth/set-password – ustawienie/zmiana hasła dla zalogowanego użytkownika */
authRouter.post('/auth/set-password', async (req, res) => {
  const { auth_user_id, user_hash, password } = req.body as {
    auth_user_id?: string;
    user_hash?: string;
    password?: string;
  };

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ ok: false, error: 'password_too_weak' });
  }

  if (!auth_user_id && !user_hash) {
    return res.status(400).json({ ok: false, error: 'auth_user_id_or_user_hash_required' });
  }

  const client = await pool.connect();
  try {
    const whereClause = auth_user_id
      ? 'auth_user_id = $1'
      : 'user_hash = $1';
    const idValue = auth_user_id ?? user_hash;

    const { rows } = await client.query<{
      user_hash: string;
      auth_user_id: string | null;
      email: string | null;
    }>(
      `SELECT user_hash, auth_user_id, email FROM participants WHERE ${whereClause} LIMIT 1`,
      [idValue]
    );

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'participant_not_found' });
    }

    const participant = rows[0];
    const email = participant.email || (participant.auth_user_id?.startsWith(EMAIL_PREFIX)
      ? participant.auth_user_id.slice(EMAIL_PREFIX.length)
      : null);

    if (!email) {
      return res.status(400).json({ ok: false, error: 'email_missing_for_password_auth' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const authId = participant.auth_user_id || `${EMAIL_PREFIX}${normalizeEmail(email)}`;

    await client.query(
      `UPDATE participants
       SET password_hash = $2,
           auth_user_id = $3,
           email = $4,
           updated_at = NOW()
       WHERE user_hash = $1`,
      [participant.user_hash, passwordHash, authId, normalizeEmail(email)]
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error('auth/set-password', (e as Error)?.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  } finally {
    client.release();
  }
});
