import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { gcpApi } from '@/lib/gcp-api-client';
import { getSiteUrl } from '@/lib/seo/site';

type SharePathType = 'fast' | 'full';

interface ShareCard {
  slug: string;
  referralCode: string | null;
  pathType: SharePathType;
  imagePublicUrl: string;
  hasBeforeImage: boolean;
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
    imagePublicUrl: result.data.imagePublicUrl || `/api/share/${encodeURIComponent(slug)}/image`,
    hasBeforeImage: Boolean(result.data.hasBeforeImage),
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
            title: 'Szybka wizja wnętrza',
            description: 'Przed i po — zdjęcie pokoju i wizja IDA ze szybkiej ścieżki.',
            cta: 'Wygeneruj swoje',
          }
        : {
            title: 'A quick interior vision',
            description: 'Before and after — your room photo and an IDA fast-path vision.',
            cta: 'Generate yours',
          };
    case 'full':
      return language === 'pl'
        ? {
            title: 'Wnętrze pod Twoją osobowość',
            description: 'Przed i po — Twój pokój i wizja z pełnej ścieżki IDA.',
            cta: 'Wygeneruj swoje',
          }
        : {
            title: 'An interior matched to you',
            description: 'Before and after — your room and a full-path IDA vision.',
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

  const copy = pathCopy(card.pathType, readLanguage());
  const canonical = `${siteUrl}/s/${card.slug}`;
  const imageUrl = `${siteUrl}/api/share/${encodeURIComponent(card.slug)}/image`;

  return {
    title: `${copy.title} | IDA`,
    description: copy.description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'pl_PL',
      url: canonical,
      siteName: 'IDA Interior Design Assistant',
      title: copy.title,
      description: copy.description,
      images: [{ url: imageUrl, width: 1024, height: 1024, alt: copy.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
      images: [imageUrl],
    },
  };
}

function PhotoFrame({
  src,
  alt,
  label,
}: {
  src: string;
  alt: string;
  label: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="aspect-[4/3] w-full object-cover" />
      <span className="absolute bottom-3 left-3 rounded-full border border-gold/35 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
        {label}
      </span>
    </div>
  );
}

export default async function ShareCardPage({ params }: { params: { slug: string } }) {
  const card = await loadCard(params.slug);
  if (!card) notFound();

  const language = readLanguage();
  const copy = pathCopy(card.pathType, language);
  const afterSrc = `/api/share/${encodeURIComponent(card.slug)}/image`;
  const beforeSrc = card.hasBeforeImage
    ? `/api/share/${encodeURIComponent(card.slug)}/before`
    : null;
  const metaBits = [card.styleLabel, card.roomType].filter(Boolean) as string[];
  const beforeLabel = language === 'pl' ? 'Twój pokój' : 'Your room';

  return (
    <div className="mx-auto w-full max-w-[min(32rem,calc((100dvh-7rem)*9/16))] px-3 py-6 sm:px-0">
      <article className="relative isolate overflow-hidden rounded-3xl border border-white/40 bg-white/30 p-4 text-graphite shadow-xl backdrop-blur-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/35 bg-gold-500/80 font-exo2 text-sm font-bold text-graphite"
          >
            IDA
          </span>
          <p className="font-modern text-xs font-semibold tracking-wide text-graphite/80">
            project-ida.com
          </p>
        </div>

        {beforeSrc ? (
          <div className="space-y-3">
            <PhotoFrame src={beforeSrc} alt={beforeLabel} label={beforeLabel} />
            <PhotoFrame src={afterSrc} alt={copy.title} label="IDA" />
          </div>
        ) : (
          <PhotoFrame src={afterSrc} alt={copy.title} label="IDA" />
        )}

        <div className="mt-5 space-y-3">
          <h1 className="font-exo2 text-2xl font-bold leading-tight text-graphite sm:text-3xl">
            {copy.title}
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
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gold-500/85 px-5 py-2.5 font-exo2 text-sm font-bold text-graphite shadow-sm transition hover:bg-gold-500 sm:text-base"
          >
            {copy.cta}
          </Link>
          <p className="text-center font-modern text-[11px] text-graphite/60">
            {language === 'pl' ? 'Za darmo na project-ida.com' : 'Free at project-ida.com'}
          </p>
        </div>
      </article>
    </div>
  );
}
