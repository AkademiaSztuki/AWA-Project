import { Router } from 'express';
import { sendEmail } from '../lib/email';

const CONTACT_INBOX = 'jakub.palka@akademiasztuki.eu';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const contactRouter = Router();

contactRouter.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message, website } = req.body as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      website?: string;
    };

    if (website) {
      return res.json({ ok: true });
    }

    const trimmedEmail = (email ?? '').trim().toLowerCase();
    const trimmedName = (name ?? '').trim();
    const trimmedSubject = (subject ?? '').trim();
    const trimmedMessage = (message ?? '').trim();

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'invalid_email' });
    }
    if (!trimmedSubject || trimmedSubject.length > 200) {
      return res.status(400).json({ error: 'invalid_subject' });
    }
    if (!trimmedMessage || trimmedMessage.length < 10 || trimmedMessage.length > 5000) {
      return res.status(400).json({ error: 'invalid_message' });
    }
    if (trimmedName.length > 120) {
      return res.status(400).json({ error: 'invalid_name' });
    }

    const displayName = trimmedName || trimmedEmail;
    const mailSubject = `[IDA Contact] ${trimmedSubject}`;
    const text = [
      `From: ${displayName} <${trimmedEmail}>`,
      '',
      trimmedMessage,
    ].join('\n');
    const html = `
      <p><strong>From:</strong> ${escapeHtml(displayName)} &lt;${escapeHtml(trimmedEmail)}&gt;</p>
      <p><strong>Subject:</strong> ${escapeHtml(trimmedSubject)}</p>
      <hr />
      <p style="white-space: pre-wrap;">${escapeHtml(trimmedMessage)}</p>
    `;

    await sendEmail({
      to: CONTACT_INBOX,
      subject: mailSubject,
      text,
      html,
      replyTo: trimmedEmail,
    });

    return res.json({ ok: true });
  } catch (e) {
    const err = e as Error;
    console.error('contact route error', err?.message);
    if (err?.message === 'email_not_configured') {
      return res.status(503).json({ error: 'email_not_configured' });
    }
    return res.status(500).json({ error: 'send_failed' });
  }
});
