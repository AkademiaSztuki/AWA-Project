'use client';

import React from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function TermsPage() {
  const { language } = useLanguage();
  const router = useRouter();

  const content = {
    pl: {
      title: 'Regulamin Serwisu',
      subtitle: 'REGULAMIN ŚWIADCZENIA USŁUG DROGĄ ELEKTRONICZNĄ',
      service: 'Serwis: IDA (https://project-ida.com/)',
      version: 'Wersja: 2025-12-22',
      effectiveDate: 'Data obowiązywania: 2025-12-22',
      sections: [
        {
          title: '1. Postanowienia ogólne',
          content: `Niniejszy regulamin („Regulamin") określa zasady korzystania z serwisu internetowego dostępnego pod adresem https://project-ida.com/ („Serwis") oraz warunki świadczenia usług drogą elektroniczną.

Usługodawcą jest Jakub Palka, e-mail: jakub.palka@akademiasztuki.eu („Usługodawca").

Korzystanie z Serwisu oznacza akceptację Regulaminu w zakresie niezbędnym do świadczenia usług drogą elektroniczną.`
        },
        {
          title: '2. Definicje',
          content: `Użytkownik – osoba korzystająca z Serwisu.

Konto – konto Użytkownika w Serwisie.

Usługi – funkcje świadczone drogą elektroniczną w ramach Serwisu.

Generacja – pojedyncze uruchomienie funkcji generowania propozycji/obrazu/wersji w Serwisie.

Pakiet – zestaw limitów i/lub uprawnień (np. darmowy lub subskrypcyjny).

Treści Użytkownika – treści wprowadzane, przesyłane lub publikowane przez Użytkownika (np. zdjęcia wnętrz, inspiracje, odpowiedzi, opisy).`
        },
        {
          title: '3. Zakres i charakter usług',
          content: `Serwis umożliwia w szczególności:

• utworzenie i prowadzenie Konta oraz panelu (dashboard) Użytkownika,
• wypełnianie ankiet/testów i tworzenie profilu preferencji,
• przesyłanie zdjęć wnętrz/inspiracji,
• generowanie propozycji z wykorzystaniem AI,
• zapis i podgląd historii sesji oraz wyników (jeżeli funkcja jest dostępna).

Serwis ma charakter aplikacji badawczo‑rozwojowej; funkcje, ich zakres oraz sposób działania mogą ulegać zmianom (pkt 13).`
        },
        {
          title: '4. Wymagania techniczne',
          content: `Do korzystania z Serwisu wymagane są: urządzenie z dostępem do Internetu, aktualna przeglądarka internetowa, aktywny adres e‑mail.

Usługodawca nie gwarantuje poprawnego działania Serwisu na niestandardowych, przestarzałych lub zmodyfikowanych środowiskach.`
        },
        {
          title: '5. Konto i zasady korzystania',
          content: `Utworzenie Konta może wymagać podania adresu e‑mail oraz przejścia procesu onboardingu.

Użytkownik zobowiązuje się do korzystania z Serwisu zgodnie z prawem i Regulaminem, w tym do niedostarczania treści bezprawnych.

Użytkownik ponosi odpowiedzialność za działania wykonane w ramach Konta oraz za zabezpieczenie dostępu do Konta.`
        },
        {
          title: '6. Pakiety, limity i darmowy dostęp',
          content: `Serwis udostępnia jednorazowe (nieodnawialne) darmowe limity Generacji przypisane do Konta:

• Szybka ścieżka (Fast Track): 10 darmowych Generacji na Konto.
• Pełne doświadczenie (Full Experience): 50 darmowych Generacji na Konto.

Darmowe limity są przyznawane „raz na Konto" i nie resetują się miesięcznie ani rocznie.

Po wykorzystaniu darmowych limitów Użytkownik może wykupić Subskrypcję (pkt 7), aby uzyskać dostęp do dodatkowych limitów i/lub funkcji.

Limity dotyczą Konta i nie mogą być przenoszone na inne konto.

Usługodawca może stosować zabezpieczenia anty‑nadużyciowe (np. limity częstotliwości, wykrywanie automatyzacji, blokady prób obchodzenia limitów).`
        },
        {
          title: '7. Subskrypcja i płatności (Stripe)',
          content: `Serwis może oferować płatną Subskrypcję zapewniającą dostęp do dodatkowych Generacji i/lub funkcji.

Subskrypcja jest cykliczna i autoodnawialna: odnawia się automatycznie na kolejny okres rozliczeniowy, chyba że Użytkownik anuluje ją przed końcem bieżącego okresu.

Anulowanie Subskrypcji powoduje wygaśnięcie dostępu do funkcji subskrypcyjnych z końcem opłaconego okresu.

Płatności są obsługiwane przez Stripe (operator płatności).

Przed zakupem Serwis prezentuje Użytkownikowi co najmniej: cenę, okres rozliczeniowy, informację o automatycznym odnawianiu oraz sposób anulowania.

Jeśli jest to wymagane w danym modelu świadczenia usług cyfrowych, Serwis może wymagać zaznaczenia zgody na rozpoczęcie świadczenia przed upływem 14 dni oraz przyjęcia do wiadomości utraty prawa odstąpienia (zgodnie z przepisami konsumenckimi).`
        },
        {
          title: '8. Treści Użytkownika (zdjęcia, odpowiedzi)',
          content: `Użytkownik oświadcza, że posiada prawa do Treści Użytkownika oraz że ich wykorzystanie w Serwisie nie narusza praw osób trzecich.

Zabronione jest przesyłanie Treści Użytkownika:

• o charakterze bezprawnym,
• zawierających wizerunek osób, dokumenty, dane wrażliwe, dane jednoznacznie identyfikujące (np. twarze, numery dokumentów, widoczne adresy na korespondencji).

Usługodawca może usuwać Treści Użytkownika naruszające Regulamin lub prawo oraz (w uzasadnionych przypadkach) blokować Konto.`
        },
        {
          title: '9. AI i charakter wyników',
          content: `Wyniki generowane przez AI mają charakter pomocniczy/badawczy i mogą być nieprecyzyjne.

Serwis nie gwarantuje uzyskania konkretnego rezultatu projektowego ani zgodności wygenerowanych propozycji z normami/wytycznymi branżowymi.`
        },
        {
          title: '10. Badanie naukowe i zgody',
          content: `Jeżeli Serwis jest używany w ramach badania, Użytkownik akceptuje osobne zgody i informacje wyświetlane w onboardingu (w tym informację z art. 13 RODO).

Brak akceptacji wymaganych zgód może uniemożliwić korzystanie z części funkcji Serwisu.`
        },
        {
          title: '11. Reklamacje i kontakt',
          content: `Zgłoszenia, błędy i reklamacje: jakub.palka@akademiasztuki.eu (temat: „IDA – zgłoszenie/reklamacja").

Zalecane informacje: opis problemu, data/godzina, e‑mail konta, kroki odtworzenia błędu, zrzuty ekranu.`
        },
        {
          title: '12. Odpowiedzialność i dostępność',
          content: `Usługodawca dokłada starań, aby Serwis działał prawidłowo, ale dopuszcza się przerwy techniczne, błędy i czasową niedostępność.

Odpowiedzialność Usługodawcy jest ograniczona w granicach dopuszczonych przez prawo.`
        },
        {
          title: '13. Zmiany Regulaminu',
          content: `Regulamin może być aktualizowany m.in. w związku ze zmianą funkcji Serwisu, limitów, cen lub dostawców usług.

Aktualna wersja Regulaminu jest publikowana na stronie /terms wraz z numerem wersji i datą obowiązywania.`
        },
        {
          title: '14. Prawo właściwe',
          content: `Do Regulaminu stosuje się prawo polskie.`
        }
      ],
      back: 'Wstecz'
    },
    en: {
      title: 'Terms of Service',
      subtitle: 'TERMS OF SERVICE (ELECTRONIC SERVICES)',
      service: 'Service: IDA (https://project-ida.com/)',
      version: 'Version: 2025-12-22',
      effectiveDate: 'Effective date: 2025-12-22',
      sections: [
        {
          title: '1. General provisions',
          content: `These Terms ("Terms") govern access to and use of https://project-ida.com/ (the "Service") and the provision of electronic services.

The service provider is Jakub Palka, e-mail: jakub.palka@akademiasztuki.eu ("Provider").

Using the Service requires accepting these Terms to the extent necessary to provide the electronic services.`
        },
        {
          title: '2. Definitions',
          content: `User – a person using the Service.

Account – a User account in the Service.

Services – functionality provided electronically within the Service.

Generation – one AI generation run (image/proposal/version).

Package/Plan – a set of limits and/or entitlements (free or subscription).

User Content – content uploaded/submitted by the User (photos, inspirations, answers, descriptions).`
        },
        {
          title: '3. Scope of the Service',
          content: `The Service may provide:

• Account creation and a user dashboard,
• questionnaires/tests and preference profiling,
• uploads of interior photos/inspirations,
• AI-based generations,
• history/results (if available).

The Service is research and development oriented; features may change over time.`
        },
        {
          title: '4. Technical requirements',
          content: `A modern web browser, Internet access, and an active e-mail address are required.`
        },
        {
          title: '5. Account & acceptable use',
          content: `Creating an Account may require an e-mail address and completing onboarding.

The User must use the Service lawfully and must not provide unlawful content.

The User is responsible for Account security and all activity under the Account.`
        },
        {
          title: '6. Free quotas and limits',
          content: `The Service provides one-time (non-renewing) free Generation quotas per Account:

• Fast Track: 10 free Generations per Account.
• Full Experience: 50 free Generations per Account.

Free quotas are granted once per Account and do not reset monthly or yearly.

After using the free quota, the User may purchase a Subscription (Section 7) to access additional Generations and/or features.

Limits are per Account and non-transferable.

Anti-abuse measures may be applied (rate limiting, automation detection, blocking attempts to bypass limits).`
        },
        {
          title: '7. Subscription & payments (Stripe)',
          content: `The Service may offer a paid Subscription that provides additional Generations and/or features.

Subscriptions are recurring and auto-renewing unless cancelled before the end of the current billing period.

Cancelling stops future renewals and access remains until the end of the paid period.

Payments are processed by Stripe.

Before purchase, the Service displays pricing, billing period, auto-renewal information, and cancellation method.

Where required for immediate digital service delivery, the Service may request explicit consent to start delivery before the withdrawal period ends and acknowledgement of loss of withdrawal rights.`
        },
        {
          title: '8. User Content rules',
          content: `The User confirms they have the rights to upload User Content and that it does not violate laws or third-party rights.

Do not upload:

• unlawful content,
• photos with people, IDs/documents, sensitive data, or easily identifying details (faces, document numbers, visible addresses).

The Provider may remove violating content and/or suspend Accounts.`
        },
        {
          title: '9. AI output disclaimer',
          content: `AI outputs are provided for support/research purposes and may be inaccurate; no guarantee of specific outcomes or compliance with professional standards.`
        },
        {
          title: '10. Research participation',
          content: `If the Service is used as part of a research study, Users must accept separate research consent and privacy information shown during onboarding (including Art. 13 GDPR information).`
        },
        {
          title: '11. Complaints & contact',
          content: `Contact: jakub.palka@akademiasztuki.eu (subject: "IDA — support/complaint").`
        },
        {
          title: '12. Availability & liability',
          content: `Downtime and errors may occur; liability is limited to the maximum extent permitted by law.`
        },
        {
          title: '13. Changes to Terms',
          content: `These Terms may be updated; the current version is published at /terms with version/date.`
        },
        {
          title: '14. Governing law',
          content: `Polish law applies.`
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
                <p>{t.service}</p>
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

