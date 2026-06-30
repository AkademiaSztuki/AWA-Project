import type { MetadataRoute } from 'next';

export type PageSeoConfig = {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  noIndex?: boolean;
  changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority?: number;
};

export const HOME_SEO: PageSeoConfig = {
  path: '/',
  title: 'IDA — projektuj wnętrze z AI dopasowane do Twojej osobowości',
  description:
    'Zobacz swoje wnętrze zaprojektowane pod Twoją osobowość. IDA generuje spersonalizowane koncepcje wnętrz na podstawie stylu życia, nastroju i preferencji estetycznych — w kilka minut.',
  keywords: [
    'projektowanie wnętrz AI',
    'generator wnętrz',
    'personalizacja wnętrz',
    'wnętrze dopasowane do osobowości',
    'AI interior design',
  ],
  changeFrequency: 'weekly',
  priority: 1,
};

export const ABOUT_SEO: PageSeoConfig = {
  path: '/o-projecie',
  title: 'O projekcie — badania i platforma IDA',
  description:
    'IDA to eksperymentalna platforma badawcza do personalizacji koncepcji wnętrz na podstawie preferencji estetycznych wspomaganej sztuczną inteligencją. Projekt doktorski Akademii Sztuki w Szczecinie.',
  keywords: [
    'badania preferencji wnętrz',
    'psychologia środowiskowa',
    'Research Through Design',
    'personalizacja wnętrz AI',
    'Akademia Sztuki Szczecin',
  ],
  changeFrequency: 'monthly',
  priority: 0.8,
};

export const CONTACT_SEO: PageSeoConfig = {
  path: '/contact',
  title: 'Kontakt',
  description:
    'Skontaktuj się z zespołem IDA — pytania badawcze, uwagi techniczne lub współpraca. Formularz kontaktowy i e-mail autora projektu.',
  changeFrequency: 'yearly',
  priority: 0.5,
};

export const PRIVACY_SEO: PageSeoConfig = {
  path: '/privacy',
  title: 'Polityka prywatności',
  description:
    'Polityka prywatności serwisu IDA (project-ida.com) — zasady przetwarzania danych osobowych, pliki cookies i prawa użytkownika.',
  changeFrequency: 'yearly',
  priority: 0.3,
};

export const TERMS_SEO: PageSeoConfig = {
  path: '/terms',
  title: 'Regulamin serwisu',
  description:
    'Regulamin świadczenia usług drogą elektroniczną serwisu IDA — zasady korzystania, subskrypcje, kredyty i odpowiedzialność.',
  changeFrequency: 'yearly',
  priority: 0.3,
};

export const PLANS_SEO: PageSeoConfig = {
  path: '/subscription/plans',
  title: 'Plany i cennik',
  description:
    'Wybierz plan IDA — wczesny dostęp, kredyty na generowanie wnętrz i personalizację AI. Porównaj plany subskrypcji.',
  keywords: ['cennik IDA', 'plany subskrypcji', 'generator wnętrz AI cena'],
  changeFrequency: 'weekly',
  priority: 0.7,
};

export const FAQ_SEO: PageSeoConfig = {
  path: '/faq',
  title: 'FAQ — często zadawane pytania',
  description:
    'Odpowiedzi na pytania o IDA: jak działa personalizacja wnętrz z AI, tryb szybki i pełny, kredyty, dane badawcze i prywatność.',
  keywords: [
    'IDA FAQ',
    'generator wnętrz AI pytania',
    'personalizacja wnętrz AI',
    'badanie preferencji wnętrz',
  ],
  changeFrequency: 'monthly',
  priority: 0.75,
};

/** Public pages worth indexing in Google. App flows and dashboards are excluded. */
export const INDEXABLE_ROUTES: PageSeoConfig[] = [
  HOME_SEO,
  ABOUT_SEO,
  FAQ_SEO,
  CONTACT_SEO,
  PRIVACY_SEO,
  TERMS_SEO,
  PLANS_SEO,
];
