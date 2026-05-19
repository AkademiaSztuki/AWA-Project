const CONTACT_INBOX = 'jakub.palka@akademiasztuki.eu';

export type ContactPayload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  website?: string;
};

export type ContactValidationError =
  | 'invalid_email'
  | 'invalid_subject'
  | 'invalid_message'
  | 'invalid_name';

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

export function validateContactPayload(
  payload: ContactPayload
): { ok: true; data: Required<Pick<ContactPayload, 'email' | 'subject' | 'message'>> & { name: string } } | { ok: false; error: ContactValidationError } {
  const trimmedEmail = (payload.email ?? '').trim().toLowerCase();
  const trimmedName = (payload.name ?? '').trim();
  const trimmedSubject = (payload.subject ?? '').trim();
  const trimmedMessage = (payload.message ?? '').trim();

  if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
    return { ok: false, error: 'invalid_email' };
  }
  if (!trimmedSubject || trimmedSubject.length > 200) {
    return { ok: false, error: 'invalid_subject' };
  }
  if (!trimmedMessage || trimmedMessage.length < 10 || trimmedMessage.length > 5000) {
    return { ok: false, error: 'invalid_message' };
  }
  if (trimmedName.length > 120) {
    return { ok: false, error: 'invalid_name' };
  }

  return {
    ok: true,
    data: {
      name: trimmedName,
      email: trimmedEmail,
      subject: trimmedSubject,
      message: trimmedMessage,
    },
  };
}

export async function sendContactEmail(payload: ContactPayload): Promise<{ ok: true } | { ok: false; error: ContactValidationError | 'email_not_configured' | 'send_failed' }> {
  const validated = validateContactPayload(payload);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  if (payload.website) {
    return { ok: true };
  }

  const { name, email, subject, message } = validated.data;
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM || 'IDA <onboarding@project-ida.com>';

  if (!resendKey) {
    return { ok: false, error: 'email_not_configured' };
  }

  const displayName = name || email;
  const mailSubject = `[IDA Contact] ${subject}`;
  const text = [`From: ${displayName} <${email}>`, '', message].join('\n');
  const html = `
    <p><strong>From:</strong> ${escapeHtml(displayName)} &lt;${escapeHtml(email)}&gt;</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <hr />
    <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
  `;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({
      from: resendFrom,
      to: CONTACT_INBOX,
      subject: mailSubject,
      html,
      text,
      replyTo: email,
    });

    if (error) {
      console.error('[contact-email] Resend error:', error.message);
      return { ok: false, error: 'send_failed' };
    }

    return { ok: true };
  } catch (e) {
    console.error('[contact-email]', (e as Error)?.message);
    return { ok: false, error: 'send_failed' };
  }
}
