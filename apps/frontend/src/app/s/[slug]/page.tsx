import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ShareCardPhotos } from '@/components/share/ShareCardPhotos';
import { gcpApi } from '@/lib/gcp-api-client';
import { getSiteUrl } from '@/lib/seo/site';
import { SHARE_SIGNUP_CREDITS, shareOgCopy } from '@/lib/share/captions';
import { shareCardProxyPath } from '@/lib/share/share-card-urls';

type SharePathType = 'fast' | 'full';

interface ShareCard {
  slug: string;
  referralCode: string | null;
  pathType: SharePathType;
  styleLabel: string | null;
  roomType: string | null;
  personalityLabels: string[];
}

async function loadCard(slug: string): Promise<ShareCard | null> {
  const result = await gcpApi.share.getCard(slug);
  if (!result.ok || !result.data?.slug || !result.data.pathType) return null;
  const pathType = result.data.pathType;
  if (pathType !== 'fast' && pathType !== 'full') return null;
  return {
    slug: result.data.slug,
    referralCode: result.data.referralCode ?? null,
    pathType,
    styleLabel: result.data.styleLabel ?? null,
    roomType: result.data.roomType ?? null,
    personalityLabels: result.data.personalityLabels || [],
  };
}

function ctaHref(referralCode: string | null): string {
  return referralCode ? `/?ref=${encodeURIComponent(referralCode)}` : '/';
}

function pathCopy(
  pathType: SharePathType,
  language: 'pl' | 'en',
): { title: string; description: string; cta: string } {
  switch (pathType) {
    case 'fast':
      return language === 'pl'
        ? {
            title: 'Koncepcja z szybkiej ścieżki',
            description: 'Przed i po — zdjęcie pokoju i koncepcja wnętrza IDA ze szybkiej ścieżki.',
            cta: 'Wygeneruj swoją koncepcję',
          }
        : {
            title: 'A fast-path interior concept',
            description: 'Before and after — your room photo and an IDA fast-path interior concept.',
            cta: 'Generate yours',
          };
    case 'full':
      return language === 'pl'
        ? {
            title: 'Wnętrze pod Twoją osobowość',
            description: 'Przed i po — Twój pokój i koncepcja wnętrza z pełnej ścieżki IDA.',
            cta: 'Wygeneruj swoją koncepcję',
          }
        : {
            title: 'An interior matched to you',
            description: 'Before and after — your room and a full-path IDA interior concept.',
            cta: 'Generate yours',
          };
    default: {
      const _exhaustive: never = pathType;
      return _exhaustive;
    }
  }
}

function readLanguage(): 'pl' | 'en' {
  const value = cookies().get('app_language')?.value;
  return value === 'en' ? 'en' : 'pl';
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const card = await loadCard(params.slug);
  const siteUrl = getSiteUrl();
  if (!card) {
    return { title: 'IDA', robots: { index: false, follow: false } };
  }

  const og = shareOgCopy(readLanguage());
  const canonical = `${siteUrl}/s/${card.slug}`;
  // Absolute /s/... URL (not /api/) so Twitterbot is not blocked by robots.txt Disallow: /api/.
  // X may cache the first Card crawl; old tweets can keep a gray preview until cache expires.
  const ogImageUrl = `${siteUrl}/s/${card.slug}/opengraph-image`;

  return {
    title: `${og.title} | IDA`,
    description: og.description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'pl_PL',
      url: canonical,
      siteName: 'IDA Interior Design Assistant',
      title: og.title,
      description: og.description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: og.title, type: 'image/png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: og.title,
      description: og.description,
      images: [ogImageUrl],
    },
  };
}

export default async function ShareCardPage({ params }: { params: { slug: string } }) {
  const card = await loadCard(params.slug);
  if (!card) notFound();

  const language = readLanguage();
  const copy = pathCopy(card.pathType, language);
  const og = shareOgCopy(language);
  const metaBits = [card.styleLabel, card.roomType].filter(Boolean) as string[];
  const beforeLabel = language === 'pl' ? 'Przed' : 'Before';
  const afterLabel = language === 'pl' ? 'Po' : 'After';

  const afterSrc = shareCardProxyPath(card.slug, 'image');
  const beforeSrc = shareCardProxyPath(card.slug, 'before');

  return (
    <div className="mx-auto w-full px-3 py-6 sm:px-0">
      <link rel="preload" as="image" href={beforeSrc} />
      <link rel="preload" as="image" href={afterSrc} />
      <article className="relative isolate overflow-hidden rounded-3xl border border-white/40 bg-white/30 p-4 text-graphite shadow-xl backdrop-blur-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-400/50 bg-gradient-to-br from-gold-400/55 via-champagne/80 to-gold-400/35 font-exo2 text-sm font-bold text-graphite shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
          >
            IDA
          </span>
          <p className="font-modern text-xs font-semibold tracking-wide text-graphite/80">
            project-ida.com
          </p>
        </div>

        <ShareCardPhotos
          slug={card.slug}
          title={copy.title}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
        />

        <div className="mt-5 space-y-3">
          <h1 className="font-exo2 text-2xl font-bold leading-tight text-graphite sm:text-3xl">
            {og.title}
          </h1>
          {metaBits.length > 0 && (
            <p className="font-modern text-sm text-graphite/70">{metaBits.join(' · ')}</p>
          )}
          {card.pathType === 'full' && card.personalityLabels.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {card.personalityLabels.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-white/40 bg-white/45 px-3 py-1 font-modern text-xs text-graphite"
                >
                  {label}
                </li>
              ))}
            </ul>
          )}
          <Link
            href={ctaHref(card.referralCode)}
            className="glass-button glass-button-emphasis inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-2.5 font-exo2 text-sm font-semibold text-graphite sm:text-base"
          >
            {copy.cta}
          </Link>
          <p className="text-center font-modern text-[11px] text-graphite/60">
            {language === 'pl'
              ? `${SHARE_SIGNUP_CREDITS} darmowych kredytów po założeniu konta · project-ida.com`
              : `${SHARE_SIGNUP_CREDITS} free credits when you create an account · project-ida.com`}
          </p>
        </div>
      </article>
    </div>
  );
}
