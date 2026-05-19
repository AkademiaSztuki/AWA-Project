// Resend is ESM-only; import lazily when needed to avoid type issues
const resendKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || 'IDA <onboarding@project-ida.com>';
const smtpHost = process.env.SMTP_HOST;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.MAGIC_LINK_FROM || process.env.SMTP_FROM || 'noreply@project-ida.com';

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  if (!to) {
    throw new Error('missing_recipient');
  }

  if (resendKey) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: resendFrom,
        to,
        subject,
        html,
        text,
        replyTo,
      });
      if (error) {
        throw new Error(error.message || 'email_send_failed');
      }
      return;
    } catch (e) {
      console.error('Resend sendEmail error', (e as Error)?.message);
    }
  }

  if (smtpHost && smtpUser && smtpPass) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      text,
      html,
      replyTo,
    });
    return;
  }

  throw new Error('email_not_configured');
}
