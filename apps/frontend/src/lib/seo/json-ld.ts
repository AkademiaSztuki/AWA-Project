import {
  DEFAULT_DESCRIPTION,
  SITE_FULL_NAME,
  SITE_NAME,
  absoluteUrl,
  getSiteUrl,
} from './site';

type JsonLdObject = Record<string, unknown>;

export function buildWebsiteJsonLd(): JsonLdObject {
  const url = getSiteUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}/#website`,
    name: SITE_FULL_NAME,
    alternateName: SITE_NAME,
    url,
    description: DEFAULT_DESCRIPTION,
    inLanguage: ['pl-PL', 'en-US'],
    publisher: { '@id': `${url}/#organization` },
  };
}

export function buildOrganizationJsonLd(): JsonLdObject {
  const url = getSiteUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}/#organization`,
    name: SITE_FULL_NAME,
    alternateName: SITE_NAME,
    url,
    logo: absoluteUrl('/icon'),
    founder: {
      '@type': 'Person',
      name: 'Jakub Palka',
      email: 'jakub.palka@akademiasztuki.eu',
      url: 'https://akademiasztuki.eu/Product/jakub-palka-mgr-1-68dcf899c6968',
    },
    sameAs: [
      'https://akademiasztuki.eu/Product/jakub-palka-mgr-1-68dcf899c6968',
    ],
  };
}

export function buildSoftwareApplicationJsonLd(): JsonLdObject {
  const url = getSiteUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${url}/#software`,
    name: SITE_FULL_NAME,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    url,
    description: DEFAULT_DESCRIPTION,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'PLN',
      description: 'Wczesny dostęp z planem Basic i kredytami startowymi',
      url: absoluteUrl('/subscription/plans'),
    },
    featureList: [
      'Personalizacja wnętrz na podstawie osobowości Big Five',
      'Generowanie koncepcji wnętrz z AI',
      'Analiza preferencji estetycznych jawnych i ukrytych',
      'Modyfikacja koloru, światła i detali',
    ],
    inLanguage: ['pl-PL', 'en-US'],
    publisher: { '@id': `${url}/#organization` },
  };
}

export function buildResearchProjectJsonLd(): JsonLdObject {
  const url = getSiteUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'ResearchProject',
    '@id': `${url}/o-projecie#research`,
    name: 'IDA: personalizacja koncepcji wnętrz na podstawie preferencji estetycznych wspomaganej AI',
    url: absoluteUrl('/o-projecie'),
    description:
      'Eksperymentalna platforma badawcza łącząca psychologię środowiskową, Big Five, preferencje estetyczne i generatywną sztuczną inteligencję.',
    funder: {
      '@type': 'CollegeOrUniversity',
      name: 'Akademia Sztuki w Szczecinie',
      url: 'https://akademiasztuki.eu',
    },
    author: {
      '@type': 'Person',
      name: 'Jakub Palka',
      email: 'jakub.palka@akademiasztuki.eu',
    },
  };
}

export function buildRootJsonLd(): JsonLdObject[] {
  return [buildWebsiteJsonLd(), buildOrganizationJsonLd(), buildSoftwareApplicationJsonLd()];
}

type FaqJsonLdItem = {
  question: string;
  answer: string;
};

export function buildFaqPageJsonLd(items: FaqJsonLdItem[]): JsonLdObject {
  const url = absoluteUrl('/faq');

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    url,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
