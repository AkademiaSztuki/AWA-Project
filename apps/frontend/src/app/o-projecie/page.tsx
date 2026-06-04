'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { GlassCard, GlassButton } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import {
  BODY_TEXT_JUSTIFY_CLASS,
  joinContentOrphans,
  LIST_TEXT_JUSTIFY_CLASS,
} from '@/lib/typography';
import { StaticPageAwaDialogue } from '@/components/awa/StaticPageAwaDialogue';

const AUTHOR_PHOTO_SRC = '/author/jakub-palka.webp?v=3';
const AUTHOR_PHOTO_FILTER_CLASS =
  'grayscale-[18%] sepia-[0.12] contrast-[1.06] saturate-[0.92] brightness-[1.02]';
const AUTHOR_PHOTO_ALT = {
  pl: 'Jakub Palka — zdjęcie autora',
  en: 'Jakub Palka — author portrait',
} as const;

const CONTACT_EMAIL = 'jakub.palka@akademiasztuki.eu';
const AUTHOR_PROFILE_URL =
  'https://akademiasztuki.eu/Product/jakub-palka-mgr-1-68dcf899c6968';
const SUPERVISOR_PROFILE_URL =
  'https://akademiasztuki.eu/Product/andreas-guskos-prof-dr-habnbspnbsp-68dcf899c6120';

const EXTERNAL_LINK_CLASS =
  'text-graphite underline-offset-4 transition-colors hover:text-gold hover:underline';

const LIST_TEXT_CLASS = LIST_TEXT_JUSTIFY_CLASS;

const THESIS_TITLE = {
  pl: 'IDA: projekt eksperymentalnej platformy badawczej do\u00A0personalizacji koncepcji wnętrz na\u00A0podstawie preferencji estetycznych wspomaganej sztuczną\u00A0inteligencją',
  en: 'IDA: an experimental research platform for personalizing interior concepts based\u00A0on aesthetic preferences, supported\u00A0by artificial\u00A0intelligence',
};

export default function AboutProjectPage() {
  const { language } = useLanguage();
  const router = useRouter();

  const content = {
    pl: {
      title: 'O projekcie',
      subtitle:
        'IDA to projekt badawczy realizowany w\u00A0ramach pracy doktorskiej na\u00A0Akademii Sztuki w\u00A0Szczecinie.',
      sections: {
        about: {
          title: 'Projekt badawczy IDA',
          paragraphs: [
            'Ta strona jest częścią rozwijanego prototypu platformy IDA. Projekt bada, jak preferencje estetyczne, cechy osobowości (Big Five) i\u00A0sztuczna inteligencja mogą wspierać personalizację koncepcji wnętrz w\u00A0kontekście psychologii środowiskowej.',
            'IDA łączy metody Research Through Design z\u00A0produktem, który użytkownicy mogą realnie wykorzystywać — dane badawcze powstają w\u00A0naturalnym kontekście użycia, a\u00A0nie w\u00A0sztucznym środowisku laboratoryjnym.',
          ],
          thesisLabel: 'Temat pracy doktorskiej',
        },
        research: {
          title: 'Pytanie badawcze i zakres',
          intro: 'Projekt koncentruje się na\u00A0czterech obszarach:',
          items: [
            'Psychologia środowiskowa — jak percepcja przestrzeni, nastrój i\u00A0funkcja wnętrza wpływają na\u00A0preferencje użytkownika.',
            'Preferencje estetyczne — zarówno jawne (deklaracje, ankiety) jak\u00A0i\u00A0ukryte (zachowanie, czas reakcji, wybory wizualne).',
            'Personalizacja wspomagana AI — jak modele generatywne mogą tłumaczyć profil użytkownika na\u00A0spójne koncepcje wnętrz.',
            'Osobowość (Big Five, IPIP-NEO-120) — jak cechy i\u00A0facety osobowości wiążą się z\u00A0preferencjami wnętrz i\u00A0ich personalizacją.',
          ],
        },
        participation: {
          title: 'Jak udział wspiera badania',
          body:
            'Korzystając z\u00A0platformy — w\u00A0trybie szybkim lub pełnym — dostarczasz dane badawcze: odpowiedzi, interakcje z\u00A0interfejsem oraz wyniki generacji. Dane są przetwarzane zgodnie z\u00A0zasadami opisanymi w\u00A0polityce prywatności; udział wymaga świadomej zgody podczas onboardingu.',
          privacyLink: 'Polityka prywatności',
        },
        funding: {
          title: 'Finansowanie i partnerzy infrastrukturalni',
          intro:
            'Rozwój i\u00A0utrzymanie platformy IDA wspierają programy i\u00A0dostawcy infrastruktury wykorzystywani w\u00A0projekcie badawczym:',
          items: [
            'Google Cloud Research Credits — kredyty badawcze Google Cloud na infrastrukturę projektu: Cloud SQL, Cloud Run, Cloud Storage oraz Vertex AI.',
            'Google for Startups Cloud Program — kredyty chmurowe Google Cloud i Firebase na rozwój platformy.',
            'Modal for Startups — kredyty obliczeniowe na uruchamianie zadań backendowych i modeli AI.',
            'Vercel — hosting aplikacji frontendowej i analityka.',
          ],
          institution: {
            text: 'Akademia Sztuki w\u00A0Szczecinie — kontekst instytucjonalny i\u00A0nadzór nad pracą doktorską.',
            supervisorLabel: 'Promotor pracy doktorskiej',
            supervisorName: 'prof. dr hab. Andreas Guskos',
          },
          note: 'Szczegóły przetwarzania danych przez dostawców infrastruktury opisano w\u00A0polityce prywatności.',
        },
        author: {
          title: 'O autorze',
          name: 'Jakub Palka',
          role: 'Przedsiębiorca, projektant przestrzeni wirtualnych, architekt wnętrz i badacz technologii',
          paragraphs: [
            'Urodzony w\u00A01989 roku w\u00A0Koszalinie. Absolwent Akademii Sztuki w\u00A0Szczecinie, gdzie ukończył studia licencjackie i\u00A0magisterskie z\u00A0Architektury Wnętrz.',
            'Od ponad dziesięciu lat łączy projektowanie wnętrz z\u00A0zaawansowanymi technologiami. Jest współwłaścicielem spółek technologicznych specjalizujących się we\u00A0wdrożeniach medtech opartych na\u00A0VR i\u00A0AI oraz spółki realizującej współczesne projekty architektoniczno-budowlane.',
            'Jego działalność badawcza koncentruje się na\u00A0wpływie technologii immersyjnych XR i\u00A0sztucznej inteligencji na\u00A0percepcję przestrzeni oraz codzienne życie. IDA jest flagowym projektem badawczym realizowanym w\u00A0ramach jego pracy doktorskiej — łączy psychologię środowiskową, personalizację AI oraz projektowanie wnętrz.',
            'Od\u00A02016 roku pracuje na\u00A0Akademii Sztuki w\u00A0Szczecinie. Prowadził pracownie na\u00A0wydziałach Architektury Wnętrz, Wzornictwa, Gier Komputerowych oraz Przestrzeni Wirtualnej. Jest współorganizatorem Międzynarodowej Wystawy Sztuki Elektronicznej Syntopia oraz międzynarodowego Interdyscyplinarnego Sympozjum na\u00A0temat Sztuki, Nauki i\u00A0Technologii MEDEA w\u00A0Grecji.',
            'Od 2014 roku działa również jako freelancer, zajmując się projektowaniem wnętrz, wysokiej klasy wizualizacjami oraz kompleksowym opracowywaniem projektów architektonicznych i wnętrzarskich.',
          ],
        },
        contact: {
          title: 'Kontakt',
          body: 'Pytania badawcze, uwagi techniczne lub współpraca — napisz do\u00A0autora.',
          formLink: 'Formularz kontaktowy',
        },
      },
      back: 'Wstecz',
    },
    en: {
      title: 'About the project',
      subtitle:
        'IDA is a research project carried out as part of doctoral work at the Academy of Art in\u00A0Szczecin.',
      sections: {
        about: {
          title: 'IDA research project',
          paragraphs: [
            'This site is part of the evolving IDA platform prototype. The project studies how aesthetic preferences, Big Five personality traits, and artificial intelligence can support the personalization of interior concepts in the context of environmental psychology.',
            'IDA combines Research Through Design methods with a product people can actually use — research data emerges from natural usage rather than artificial laboratory settings.',
          ],
          thesisLabel: 'Doctoral research topic',
        },
        research: {
          title: 'Research question and scope',
          intro: 'The project focuses on four areas:',
          items: [
            'Environmental psychology — how spatial perception, mood, and interior function shape user preferences.',
            'Aesthetic preferences — both explicit (declarations, questionnaires) and implicit (behaviour, response times, visual choices).',
            'AI-assisted personalization — how generative models can translate a user profile into coherent interior concepts.',
            'Personality (Big Five, IPIP-NEO-120) — how trait and facet scores relate to interior preferences and their personalization.',
          ],
        },
        participation: {
          title: 'How participation supports research',
          body:
            'By using the platform — in quick or full mode — you contribute research data: answers, interface interactions, and generation outcomes. Data is processed according to the privacy policy; participation requires informed consent during onboarding.',
          privacyLink: 'Privacy policy',
        },
        funding: {
          title: 'Funding and infrastructure partners',
          intro:
            'Development and operation of the IDA platform are supported by programs and infrastructure providers used in this research project:',
          items: [
            'Google Cloud Research Credits — Google Cloud research credits for project infrastructure: Cloud SQL, Cloud Run, Cloud Storage, and Vertex AI.',
            'Google for Startups Cloud Program — Google Cloud and Firebase credits for platform development.',
            'Modal for Startups — compute credits for backend jobs and AI model execution.',
            'Vercel — frontend hosting and analytics.',
          ],
          institution: {
            text: 'Academy of Art in\u00A0Szczecin — institutional context and doctoral supervision.',
            supervisorLabel: 'Doctoral supervisor',
            supervisorName: 'Prof. Dr. Hab. Andreas Guskos',
          },
          note: 'Details on data processing by infrastructure providers are described in the privacy policy.',
        },
        author: {
          title: 'About the author',
          name: 'Jakub Palka',
          role: 'Entrepreneur, Virtual Space Designer, Interior Architect, and Technology Researcher',
          paragraphs: [
            'Born in\u00A01989 in\u00A0Koszalin. Graduate of the Academy of Art in\u00A0Szczecin, where he completed bachelor\'s and master\'s degrees in Interior Architecture.',
            'For over ten years he has been combining interior design with advanced technologies. He is a co-owner of technology companies specializing in medtech implementations based\u00A0on VR and\u00A0AI, as well as a company delivering contemporary architectural and construction projects.',
            'His research focuses on the impact of immersive XR technologies and artificial intelligence on spatial perception and everyday life. IDA is his flagship research project carried out as part of his doctoral work — it combines environmental psychology, AI personalization, and interior design.',
            'Since\u00A02016 he has been working at the Academy of Art in\u00A0Szczecin, where he led studios at the faculties of Interior Architecture, Design, Computer Games, and Virtual Space. He is a co-organizer of the International Exhibition of Electronic Art Syntopia and the international interdisciplinary symposium on Art, Science and\u00A0Technology MEDEA in\u00A0Greece.',
            'Since 2014 he has also worked as a freelancer, specializing in interior design, high-end visualizations, and comprehensive development of architectural and interior projects.',
          ],
        },
        contact: {
          title: 'Contact',
          body: 'Research questions, technical feedback, or collaboration — get in touch with the author.',
          formLink: 'Contact form',
        },
      },
      back: 'Back',
    },
  };

  const t = content[language];
  const thesisTitle = THESIS_TITLE[language];
  const text = (s: string) => joinContentOrphans(s, language);

  return (
    <div className="min-h-screen py-8 px-4 pb-28 sm:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <GlassCard className="p-8 md:p-12">
          <div className="mb-8">
            <p className="mb-3 font-modern text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-500">
              {language === 'pl' ? 'Projekt doktorski' : 'Doctoral research project'}
            </p>
            <h1 className="text-balance text-3xl font-nasalization text-graphite drop-shadow-sm mb-4 md:text-4xl">
              {t.title}
            </h1>
            <p
              lang={language}
              className="text-pretty text-graphite/80 font-modern leading-relaxed text-justify hyphens-auto"
            >
              {text(t.subtitle)}
            </p>
          </div>

          <div className="space-y-10" lang={language}>
            <section className="border-b border-white/10 pb-8">
              <h2 className="text-pretty text-xl font-nasalization text-gold mb-4 md:text-2xl">
                {t.sections.about.title}
              </h2>
              {t.sections.about.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 40)}
                  className={`mb-4 last:mb-0 ${BODY_TEXT_JUSTIFY_CLASS}`}
                >
                  {text(paragraph)}
                </p>
              ))}
              <dl className="mt-6 border-t border-white/10 pt-6">
                <dt className="mb-2 font-modern text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-500">
                  {t.sections.about.thesisLabel}
                </dt>
                <dd
                  className={`text-pretty text-sm leading-7 sm:text-base sm:leading-8 ${BODY_TEXT_JUSTIFY_CLASS}`}
                >
                  {text(thesisTitle)}
                </dd>
              </dl>
            </section>

            <section className="border-b border-white/10 pb-8">
              <h2 className="text-pretty text-xl font-nasalization text-gold mb-4 md:text-2xl">
                {t.sections.research.title}
              </h2>
              <p className={`mb-4 ${BODY_TEXT_JUSTIFY_CLASS}`}>{text(t.sections.research.intro)}</p>
              <ul className="grid gap-3">
                {t.sections.research.items.map((item) => (
                  <li key={item.slice(0, 48)} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
                    <span className={LIST_TEXT_CLASS}>{text(item)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="border-b border-white/10 pb-8">
              <h2 className="text-pretty text-xl font-nasalization text-gold mb-4 md:text-2xl">
                {t.sections.participation.title}
              </h2>
              <p className={BODY_TEXT_JUSTIFY_CLASS}>{text(t.sections.participation.body)}</p>
              <p className="mt-4">
                <Link
                  href="/privacy"
                  className="font-modern text-graphite underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  {t.sections.participation.privacyLink} →
                </Link>
              </p>
            </section>

            <section className="border-b border-white/10 pb-8">
              <h2 className="text-pretty text-xl font-nasalization text-gold mb-4 md:text-2xl">
                {t.sections.funding.title}
              </h2>
              <p className={`mb-4 ${BODY_TEXT_JUSTIFY_CLASS}`}>{text(t.sections.funding.intro)}</p>
              <ul className="grid gap-3">
                {t.sections.funding.items.map((item) => (
                  <li key={item.slice(0, 48)} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
                    <span className={LIST_TEXT_CLASS}>{text(item)}</span>
                  </li>
                ))}
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
                  <span className={LIST_TEXT_CLASS}>
                    {text(t.sections.funding.institution.text)}
                    <span className="mt-1 block">
                      {t.sections.funding.institution.supervisorLabel}:{' '}
                      <a
                        href={SUPERVISOR_PROFILE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={EXTERNAL_LINK_CLASS}
                      >
                        {t.sections.funding.institution.supervisorName}
                      </a>
                    </span>
                  </span>
                </li>
              </ul>
              <p className={`mt-4 text-sm text-graphite/70 ${BODY_TEXT_JUSTIFY_CLASS}`}>
                {text(t.sections.funding.note)}
              </p>
            </section>

            <section className="border-b border-white/10 pb-8">
              <h2 className="text-pretty text-xl font-nasalization text-gold mb-6 md:text-2xl">
                {t.sections.author.title}
              </h2>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <figure className="relative h-32 w-32 shrink-0">
                  <div
                    className="absolute inset-0 rounded-2xl border border-white/30 bg-gradient-to-br from-white/12 via-pearl-100/8 to-gold-400/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_10px_36px_-8px_rgba(31,38,135,0.42)] backdrop-blur-glass ring-1 ring-white/20"
                    aria-hidden
                  />
                  <div className="absolute inset-[3px] overflow-hidden rounded-[0.85rem] border border-white/30 bg-transparent">
                    <Image
                      src={AUTHOR_PHOTO_SRC}
                      alt={AUTHOR_PHOTO_ALT[language]}
                      width={128}
                      height={128}
                      unoptimized
                      className={`h-full w-full object-cover object-top ${AUTHOR_PHOTO_FILTER_CLASS}`}
                      sizes="128px"
                    />
                  </div>
                </figure>
                <div className="min-w-0">
                  <a
                    href={AUTHOR_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-nasalization text-xl ${EXTERNAL_LINK_CLASS}`}
                  >
                    {t.sections.author.name}
                  </a>
                  <p className="mt-1 text-pretty font-modern text-sm text-graphite/75">
                    {text(t.sections.author.role)}
                  </p>
                  <div className="mt-4 space-y-4">
                    {t.sections.author.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 40)}
                        className={`text-sm leading-7 sm:text-base sm:leading-8 ${BODY_TEXT_JUSTIFY_CLASS}`}
                      >
                        {text(paragraph)}
                      </p>
                    ))}
                  </div>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="mt-4 inline-flex items-center gap-2 font-modern text-sm text-graphite underline-offset-4 transition-colors hover:text-gold hover:underline"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-gold/80" aria-hidden />
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-pretty text-xl font-nasalization text-gold mb-4 md:text-2xl">
                {t.sections.contact.title}
              </h2>
              <p className={`mb-4 ${BODY_TEXT_JUSTIFY_CLASS}`}>{text(t.sections.contact.body)}</p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/contact"
                  className="font-modern text-graphite underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  {t.sections.contact.formLink} →
                </Link>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-2 font-modern text-graphite underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0 text-gold/80" aria-hidden />
                  {CONTACT_EMAIL}
                </a>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <GlassButton variant="secondary" onClick={() => router.back()}>
              ← {t.back}
            </GlassButton>
          </div>
        </GlassCard>
      </motion.div>
      <StaticPageAwaDialogue currentStep="about_project" />
    </div>
  );
}
