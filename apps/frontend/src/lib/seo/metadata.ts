import type { Metadata } from 'next';
import { SITE_FULL_NAME, SITE_NAME, getSiteUrl } from './site';
import type { PageSeoConfig } from './routes';

/** Social preview image (Facebook, LinkedIn, iMessage, etc.) */
export const DEFAULT_OG_IMAGE = {
  url: '/og/ida-sociale.jpg',
  width: 1024,
  height: 1024,
  alt: 'IDA — Interior Design Assistant',
  type: 'image/jpeg',
} as const;

export function buildPageMetadata(seo: PageSeoConfig): Metadata {
  const siteUrl = getSiteUrl();
  const canonical = seo.path === '/' ? siteUrl : `${siteUrl}${seo.path}`;
  const title = seo.path === '/' ? seo.title : `${seo.title} | ${SITE_NAME}`;

  return {
    title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical,
    },
    robots: seo.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    openGraph: {
      type: 'website',
      locale: 'pl_PL',
      alternateLocale: ['en_US'],
      url: canonical,
      siteName: SITE_FULL_NAME,
      title,
      description: seo.description,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: seo.description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}

export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    applicationName: SITE_NAME,
    authors: [{ name: 'Jakub Palka', url: 'https://akademiasztuki.eu/Product/jakub-palka-mgr-1-68dcf899c6968' }],
    creator: 'Jakub Palka',
    publisher: SITE_FULL_NAME,
    category: 'technology',
    other: {
      'facebook-domain-verification': '4leb5c5mmgp7xb9z6xll1exrx0d0bs',
    },
    ...buildPageMetadata({
      path: '/',
      title: 'IDA — projektuj wnętrze z AI dopasowane do Twojej osobowości',
      description:
        'Zobacz swoje wnętrze zaprojektowane pod Twoją osobowość. IDA generuje spersonalizowane koncepcje wnętrz na podstawie stylu życia, nastroju i preferencji estetycznych.',
      keywords: [
        'projektowanie wnętrz AI',
        'generator wnętrz',
        'personalizacja wnętrz',
        'AI interior design',
      ],
    }),
  };
}
