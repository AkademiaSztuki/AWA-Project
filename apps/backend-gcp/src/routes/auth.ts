import { Router } from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pool } from '../db';
import { grantFreeCredits } from '../services/billing';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const EMAIL_PREFIX = 'email:';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

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
  const frontendUrl = (process.env.MAGIC_LINK_FRONTEND_URL || '').replace(/\/$/, '');
  const next = nextPath ? encodeURIComponent(nextPath) : '';
  const link = frontendUrl
    ? `${frontendUrl}/auth/verify?token=${token}${next ? `&next=${next}` : ''}`
    : '';

  try {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO magic_link_tokens (token, email, expires_at) VALUES ($1, $2, $3)`,
        [token, email, expiresAt]
      );
    } finally {
      client.release();
    }
  } catch (e: unknown) {
    console.error('send-magic-link insert', (e as Error)?.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.MAGIC_LINK_FROM || process.env.SMTP_FROM || 'noreply@project-ida.com';

  if (smtpHost && smtpUser && smtpPass && link) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from,
        to: email,
        subject: 'Zaloguj się do AWA / Sign in to AWA',
        text: `Kliknij aby się zalogować: ${link}\n\nClick to sign in: ${link}`,
        html: `<p>Kliknij aby się zalogować / Click to sign in:</p><p><a href="${link}">${link}</a></p><p>Link wygasa za ${MAGIC_LINK_EXPIRY_MINUTES} minut.</p>`,
      });
    } catch (err: unknown) {
      console.error('send-magic-link email', (err as Error)?.message);
      return res.status(500).json({ ok: false, error: 'email_send_failed' });
    }
  }

  return res.json({
    ok: true,
    ...(link && !smtpHost ? { dev_link: link } : {}),
  });
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
      `SELECT email, used_at FROM magic_link_tokens WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'invalid_or_expired_token' });
    }
    if (rows[0].used_at) {
      return res.status(400).json({ ok: false, error: 'token_already_used' });
    }

    const email = normalizeEmail(rows[0].email);
    await client.query(
      `UPDATE magic_link_tokens SET used_at = NOW() WHERE token = $1`,
      [token]
    );

    const authUserId = `${EMAIL_PREFIX}${email}`;

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
      `INSERT INTO participants (user_hash, auth_user_id, consent_timestamp, updated_at) VALUES ($1, $2, NOW(), NOW())`,
      [userHash, authUserId]
    );
    await grantFreeCredits(client, userHash);

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
