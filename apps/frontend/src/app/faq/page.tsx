'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { GlassButton, GlassCard } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { FAQ_SECTIONS } from '@/lib/faq/content';
import { BODY_TEXT_JUSTIFY_CLASS, joinContentOrphans } from '@/lib/typography';
import { cn } from '@/lib/utils';

const LINK_CLASS =
  'text-graphite underline-offset-4 transition-colors hover:text-gold hover:underline';

function renderAnswerWithLinks(answer: string, language: 'pl' | 'en') {
  const parts = answer.split(/(\/(?:privacy|contact|subscription\/plans))/g);

  return parts.map((part, index) => {
    if (part === '/privacy') {
      return (
        <Link key={`${part}-${index}`} href="/privacy" className={LINK_CLASS}>
          {language === 'pl' ? 'polityka prywatności' : 'privacy policy'}
        </Link>
      );
    }
    if (part === '/contact') {
      return (
        <Link key={`${part}-${index}`} href="/contact" className={LINK_CLASS}>
          {language === 'pl' ? 'formularz kontaktowy' : 'contact form'}
        </Link>
      );
    }
    if (part === '/subscription/plans') {
      return (
        <Link key={`${part}-${index}`} href="/subscription/plans" className={LINK_CLASS}>
          {language === 'pl' ? 'stronie cennika' : 'pricing page'}
        </Link>
      );
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

export default function FaqPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const lang = language === 'pl' ? 'pl' : 'en';
  const text = (value: string) => joinContentOrphans(value, lang);

  const copy = {
    pl: {
      eyebrow: 'Pomoc',
      title: 'Często zadawane pytania',
      subtitle:
        'Odpowiedzi o działaniu IDA, personalizacji wnętrz z AI, kredytach oraz udziale w badaniu naukowym.',
      moreAbout: 'Więcej o projekcie badawczym',
      contact: 'Nie znalazłeś odpowiedzi? Napisz do nas',
      back: 'Wstecz',
    },
    en: {
      eyebrow: 'Help',
      title: 'Frequently asked questions',
      subtitle:
        'Answers about how IDA works, AI interior personalization, credits, and participation in the research project.',
      moreAbout: 'More about the research project',
      contact: 'Did not find an answer? Get in touch',
      back: 'Back',
    },
  };

  const t = copy[lang];

  return (
    <div className="min-h-screen py-8 px-4 pb-28 sm:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <GlassCard className="p-8 md:p-12">
          <div className="mb-10">
            <p className="mb-3 font-modern text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-500">
              {t.eyebrow}
            </p>
            <h1 className="text-balance text-3xl font-nasalization text-graphite drop-shadow-sm mb-4 md:text-4xl">
              {t.title}
            </h1>
            <p
              lang={lang}
              className="text-pretty text-graphite/80 font-modern leading-relaxed text-justify hyphens-auto"
            >
              {text(t.subtitle)}
            </p>
          </div>

          <div className="space-y-10" lang={lang}>
            {FAQ_SECTIONS.map((section) => (
              <section key={section.id} aria-labelledby={`faq-section-${section.id}`}>
                <h2
                  id={`faq-section-${section.id}`}
                  className="text-pretty text-xl font-nasalization text-gold mb-5 md:text-2xl"
                >
                  {section[lang].title}
                </h2>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <details
                      key={item.id}
                      className="group rounded-2xl border border-white/20 bg-white/10 backdrop-blur-glass"
                    >
                      <summary
                        className={cn(
                          'flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4',
                          'font-modern text-sm font-semibold text-graphite sm:text-base',
                          '[&::-webkit-details-marker]:hidden',
                        )}
                      >
                        <span className="text-pretty">{text(item[lang].question)}</span>
                        <ChevronDown
                          className="h-5 w-5 shrink-0 text-gold/80 transition-transform group-open:rotate-180"
                          aria-hidden
                        />
                      </summary>
                      <div
                        className={cn(
                          'border-t border-white/15 px-5 pb-5 pt-4 text-sm leading-7 text-graphite/85 sm:text-base sm:leading-8',
                          BODY_TEXT_JUSTIFY_CLASS,
                        )}
                      >
                        {renderAnswerWithLinks(text(item[lang].answer), lang)}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row sm:flex-wrap">
            <Link href="/o-projecie" className={cn('font-modern text-sm', LINK_CLASS)}>
              {t.moreAbout} →
            </Link>
            <Link href="/contact" className={cn('font-modern text-sm', LINK_CLASS)}>
              {t.contact} →
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <GlassButton variant="secondary" onClick={() => router.back()}>
              ← {t.back}
            </GlassButton>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
