'use client';

import React, { useState } from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { joinContentOrphans } from '@/lib/typography';
import { StaticPageAwaDialogue } from '@/components/awa/StaticPageAwaDialogue';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 text-graphite placeholder:text-silver-dark/60 font-modern focus:border-gold-500/50 focus:ring-2 focus:ring-gold-400/30 outline-none transition-all shadow-glass-inset';

const CONTACT_EMAIL = 'jakub.palka@akademiasztuki.eu';

export default function ContactPage() {
  const { language } = useLanguage();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const content = {
    pl: {
      title: 'Kontakt',
      subtitle: 'Masz pytanie, uwagę lub problem techniczny? Napisz do nas.',
      emailsTitle: 'Adres e-mail',
      formTitle: 'Formularz kontaktowy',
      name: 'Imię i nazwisko (opcjonalnie)',
      namePlaceholder: 'Jan Kowalski',
      email: 'Adres e-mail',
      emailPlaceholder: 'twoj@email.com',
      subject: 'Temat',
      subjectPlaceholder: 'Np. problem z logowaniem',
      message: 'Wiadomość',
      messagePlaceholder: 'Opisz swoją sprawę…',
      submit: 'Wyślij wiadomość',
      submitting: 'Wysyłanie…',
      success:
        'Dziękujemy! Wiadomość została wysłana. Odpowiemy tak szybko, jak to możliwe.',
      errors: {
        invalid_email: 'Podaj prawidłowy adres e-mail.',
        invalid_subject: 'Temat jest wymagany (maks. 200 znaków).',
        invalid_message: 'Wiadomość musi mieć od 10 do 5000 znaków.',
        invalid_name: 'Imię i nazwisko może mieć maks. 120 znaków.',
        email_not_configured:
          'Wysyłka formularza jest tymczasowo niedostępna. Napisz bezpośrednio na jeden z adresów powyżej.',
        send_failed: 'Nie udało się wysłać wiadomości. Spróbuj ponownie lub napisz na e-mail.',
        network: 'Błąd połączenia. Sprawdź internet i spróbuj ponownie.',
      },
      back: 'Wstecz',
    },
    en: {
      title: 'Contact',
      subtitle: 'Questions, feedback, or a technical issue? Get in touch.',
      emailsTitle: 'Email address',
      formTitle: 'Contact form',
      name: 'Name (optional)',
      namePlaceholder: 'Jane Doe',
      email: 'Email address',
      emailPlaceholder: 'you@email.com',
      subject: 'Subject',
      subjectPlaceholder: 'e.g. login issue',
      message: 'Message',
      messagePlaceholder: 'Describe your request…',
      submit: 'Send message',
      submitting: 'Sending…',
      success: 'Thank you! Your message has been sent. We will reply as soon as possible.',
      errors: {
        invalid_email: 'Please enter a valid email address.',
        invalid_subject: 'Subject is required (max 200 characters).',
        invalid_message: 'Message must be between 10 and 5000 characters.',
        invalid_name: 'Name can be at most 120 characters.',
        email_not_configured:
          'Form delivery is temporarily unavailable. Please email us directly using the addresses above.',
        send_failed: 'Could not send your message. Please try again or email us directly.',
        network: 'Connection error. Check your network and try again.',
      },
      back: 'Back',
    },
  };

  const t = content[language];
  const lang = language === 'pl' ? 'pl' : 'en';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          website,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        const code = data.error ?? 'send_failed';
        setSubmitError(
          t.errors[code as keyof typeof t.errors] ?? t.errors.send_failed
        );
        return;
      }

      setSubmitSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setWebsite('');
    } catch {
      setSubmitError(t.errors.network);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 pb-28 sm:pb-32" lang={lang}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <GlassCard className="p-8 md:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8">
              <h1 className="text-balance text-3xl md:text-4xl font-nasalization text-graphite drop-shadow-sm mb-4">
                {t.title}
              </h1>
              <p className="text-pretty text-graphite/80 font-modern leading-relaxed">
                {joinContentOrphans(t.subtitle, lang)}
              </p>
            </div>

            <section className="mb-10 border-b border-white/10 pb-8">
              <h2 className="text-xl md:text-2xl font-nasalization text-gold mb-4">
                {t.emailsTitle}
              </h2>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 font-modern text-graphite underline-offset-4 transition-colors hover:text-gold hover:underline"
              >
                <Mail className="h-4 w-4 shrink-0 text-gold/80" aria-hidden />
                {CONTACT_EMAIL}
              </a>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-nasalization text-gold mb-6">
                {t.formTitle}
              </h2>

              {submitSuccess ? (
                <p
                  role="status"
                  className="rounded-2xl border border-emerald-400/30 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-800 font-modern"
                >
                  {t.success}
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="sr-only" aria-hidden>
                    <label htmlFor="contact-website">Website</label>
                    <input
                      id="contact-website"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-sm font-semibold text-graphite mb-2 font-modern"
                    >
                      {t.name}
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.namePlaceholder}
                      maxLength={120}
                      className={INPUT_CLASS}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-sm font-semibold text-graphite mb-2 font-modern"
                    >
                      {t.email}
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      required
                      className={INPUT_CLASS}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-subject"
                      className="block text-sm font-semibold text-graphite mb-2 font-modern"
                    >
                      {t.subject}
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={t.subjectPlaceholder}
                      required
                      maxLength={200}
                      className={INPUT_CLASS}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-sm font-semibold text-graphite mb-2 font-modern"
                    >
                      {t.message}
                    </label>
                    <textarea
                      id="contact-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t.messagePlaceholder}
                      required
                      minLength={10}
                      maxLength={5000}
                      rows={6}
                      className={`${INPUT_CLASS} resize-y min-h-[140px]`}
                      disabled={isSubmitting}
                    />
                  </div>

                  {submitError && (
                    <p role="alert" className="text-sm text-red-600 font-modern">
                      {submitError}
                    </p>
                  )}

                  <GlassButton
                    type="submit"
                    disabled={isSubmitting || !email || !subject || message.length < 10}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? t.submitting : t.submit}
                  </GlassButton>
                </form>
              )}
            </section>

            <div className="mt-8 pt-6 border-t border-white/10">
              <GlassButton variant="secondary" onClick={() => router.back()}>
                ← {t.back}
              </GlassButton>
            </div>
          </motion.div>
        </GlassCard>
      </motion.div>
      <StaticPageAwaDialogue currentStep="contact_page" />
    </div>
  );
}
