'use client';

import React from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function PrivacyPage() {
  const { language } = useLanguage();
  const router = useRouter();

  const content = {
    pl: {
      title: 'Polityka Prywatności',
      subtitle: 'POLITYKA PRYWATNOŚCI — IDA (project-ida.com)',
      version: 'Wersja: 2025-12-22',
      effectiveDate: 'Data obowiązywania: 2025-12-22',
      sections: [
        {
          title: '1. Administrator danych',
          content: `Administratorem danych osobowych jest Jakub Palka, e-mail: jakub.palka@akademiasztuki.eu.`
        },
        {
          title: '2. Jakie dane przetwarzamy',
          content: `Możemy przetwarzać w szczególności:

• dane konta: e‑mail, identyfikator użytkownika,
• dane badawcze: odpowiedzi w ankietach/testach, wyniki, preferencje, metadane interakcji (np. czasy reakcji),
• treści przesłane: zdjęcia wnętrz/inspiracje oraz powiązane metadane,
• dane techniczne/analityczne: informacje o działaniu Serwisu, dane o urządzeniu/przeglądarce, zdarzenia analityczne oraz logi.`
        },
        {
          title: '3. Cele i podstawy prawne',
          content: `Dane przetwarzamy w celach:

• prowadzenia konta i świadczenia usług elektronicznych w Serwisie,
• realizacji badania (analizy wyników i opracowania zbiorczego),
• bezpieczeństwa i zapobiegania nadużyciom,
• obsługi płatności i subskrypcji (jeśli dotyczy).

Podstawy prawne są wskazywane w procesie onboardingu oraz w kontekście danej funkcji (np. zgoda na udział w badaniu).`
        },
        {
          title: '4. Odbiorcy danych (dostawcy usług)',
          content: `Dane mogą być przetwarzane przez dostawców infrastruktury i narzędzi używanych do działania Serwisu, w szczególności:

• Vercel (hosting/analityka/telemetria),
• Supabase (uwierzytelnianie, baza danych, storage),
• Google Cloud (infrastruktura/obliczenia),
• Modal (uruchamianie backendowych zadań/AI),
• Stripe (płatności i subskrypcje).`
        },
        {
          title: '5. Płatności (Stripe)',
          content: `Płatności w Serwisie obsługuje Stripe; dane płatnicze (np. numer karty) są przetwarzane bezpośrednio przez Stripe, a Serwis może otrzymywać ograniczone informacje o płatności (np. status i identyfikator transakcji).`
        },
        {
          title: '6. Przekazywanie danych poza EOG',
          content: `Jeżeli w związku z użyciem dostawców infrastruktury dochodzi do przekazywania danych poza Europejski Obszar Gospodarczy, przekazywanie odbywa się na podstawie odpowiednich mechanizmów prawnych (np. standardowych klauzul umownych).`
        },
        {
          title: '7. Okres przechowywania',
          content: `Dane przechowujemy:

• przez czas korzystania z Konta i działania Serwisu,
• przez czas realizacji badań i opracowania wyników oraz okres niezbędny do archiwizacji danych badawczych,
• do czasu wycofania zgody (jeśli podstawą jest zgoda) – o ile nie istnieje inna podstawa do dalszego przechowywania.`
        },
        {
          title: '8. Prawa użytkownika',
          content: `Przysługuje prawo: dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania oraz prawo wniesienia skargi do Prezesa UODO.

W sprawach prywatności skontaktuj się: jakub.palka@akademiasztuki.eu.`
        },
        {
          title: '9. Ważna informacja o zdjęciach',
          content: `Nie przesyłaj zdjęć osób, dokumentów ani danych wrażliwych; przesyłaj wyłącznie zdjęcia wnętrz.`
        }
      ],
      back: 'Wstecz'
    },
    en: {
      title: 'Privacy Policy',
      subtitle: 'PRIVACY POLICY — IDA (project-ida.com)',
      version: 'Version: 2025-12-22',
      effectiveDate: 'Effective date: 2025-12-22',
      sections: [
        {
          title: '1. Data controller',
          content: `The data controller is Jakub Palka, e-mail: jakub.palka@akademiasztuki.eu.`
        },
        {
          title: '2. Personal data we process',
          content: `We may process:

• account data: e-mail, user identifier,
• research data: questionnaire/test answers, results, preferences, interaction metadata (e.g., response times),
• uploaded content: interior photos/inspirations and related metadata,
• technical/analytics data: service performance data, device/browser information, analytics events and logs.`
        },
        {
          title: '3. Purposes and legal bases',
          content: `We process data to:

• provide accounts and electronic services within the Service,
• conduct the research study and aggregate analysis,
• ensure security and prevent abuse,
• handle payments/subscriptions (if applicable).

Legal bases are provided during onboarding and in context (e.g., consent for research participation).`
        },
        {
          title: '4. Service providers / recipients',
          content: `Data may be processed by infrastructure providers used to run the Service, including:

• Vercel (hosting/analytics/telemetry),
• Supabase (auth, database, storage),
• Google Cloud (infrastructure/compute),
• Modal (backend jobs/AI execution),
• Stripe (payments and subscriptions).`
        },
        {
          title: '5. Payments (Stripe)',
          content: `Payments are processed by Stripe; payment card details are processed directly by Stripe and the Service may receive limited payment information (e.g., status and transaction identifiers).`
        },
        {
          title: '6. International transfers',
          content: `Where transfers outside the EEA occur, we rely on appropriate legal mechanisms (e.g., standard contractual clauses).`
        },
        {
          title: '7. Data retention',
          content: `We retain data for the duration of account/service use, the duration of research and necessary research archiving, and until consent is withdrawn (where consent is the legal basis), unless another legal basis applies.`
        },
        {
          title: '8. Your rights',
          content: `You may have rights of access, rectification, erasure, restriction, and the right to lodge a complaint with the relevant data protection authority; contact: jakub.palka@akademiasztuki.eu.`
        },
        {
          title: '9. Photos',
          content: `Do not upload photos containing people, IDs/documents, or sensitive information; upload interior-only images.`
        }
      ],
      back: 'Back'
    }
  };

  const t = content[language];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <GlassCard className="p-8 md:p-12">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-nasalization text-graphite drop-shadow-sm mb-4">
                {t.title}
              </h1>
              <div className="space-y-2 text-sm text-graphite/80 font-modern mb-6">
                <p className="font-semibold text-gold">{t.subtitle}</p>
                <p>{t.version}</p>
                <p>{t.effectiveDate}</p>
              </div>
            </div>

            <div className="space-y-8">
              {t.sections.map((section, index) => (
                <div key={index} className="border-b border-white/10 pb-6 last:border-b-0">
                  <h2 className="text-xl md:text-2xl font-nasalization text-gold mb-4">
                    {section.title}
                  </h2>
                  <div className="text-graphite font-modern whitespace-pre-line leading-relaxed">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <GlassButton
                variant="secondary"
                onClick={() => router.back()}
              >
                ← {t.back}
              </GlassButton>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}

