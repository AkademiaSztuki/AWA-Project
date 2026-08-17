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
    styleLabel: result.data.styleLabel ?? null,
    roomType: result.data.roomType ?? null,
    personalityLabels: result.data.personalityLabels || [],
  };
}

function ctaHref(referralCode: string | null): string {
  return referralCode ? `/?ref=${encodeURIComponent(referralCode)}` : '/';
}

function pathCopy(pathType: SharePathType, language: 'pl' | 'en'): { title: string; description: string; cta: string } {
  switch (pathType) {
    case 'fast':
      return language === 'pl'
        ? {
            title: 'Szybka wizja wnętrza',
            description: 'Wygenerowane w szybkiej ścieżce IDA — styl i zdjęcie pokoju.',
            cta: 'Wygeneruj swoje',
          }
        : {
            title: 'A quick interior vision',
            description: 'Generated on IDA’s fast path — style plus your room photo.',
            cta: 'Generate yours',
          };
    case 'full':
      return language === 'pl'
        ? {
            title: 'Wnętrze pod Twoją osobowość',
            description: 'Wizja z pełnej ścieżki IDA — gust, nastrój i profil osobowości.',
            cta: 'Wygeneruj swoje',
          }
        : {
            title: 'An interior matched to you',
            description: 'A full-path IDA vision — taste, mood, and personality profile.',
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

export default async function ShareCardPage({ params }: { params: { slug: string } }) {
  const card = await loadCard(params.slug);
  if (!card) notFound();

  const language = readLanguage();
  const copy = pathCopy(card.pathType, language);
  const imageSrc = `/api/share/${encodeURIComponent(card.slug)}/image`;
  const metaBits = [card.styleLabel, card.roomType].filter(Boolean) as string[];

  return (
    <div className="mx-auto w-full max-w-[min(32rem,calc((100dvh-7rem)*9/16))]">
      <article className="relative isolate overflow-hidden bg-[#1a1612] text-white shadow-xl sm:rounded-3xl">
        <div className="relative aspect-[9/16] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={copy.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-4 pb-16 pt-4">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-md bg-gold-500/90 font-exo2 text-sm font-bold text-white"
            >
              IDA
            </span>
            <p className="font-modern text-xs font-semibold tracking-wide text-white/90">project-ida.com</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 space-y-3 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-4 pb-6 pt-20">
            <h1 className="font-exo2 text-2xl font-bold leading-tight text-white sm:text-3xl">{copy.title}</h1>
            {metaBits.length > 0 && (
              <p className="font-modern text-sm text-white/80">{metaBits.join(' · ')}</p>
            )}
            {card.pathType === 'full' && card.personalityLabels.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {card.personalityLabels.map((label) => (
                  <li
                    key={label}
                    className="rounded-full bg-white/15 px-3 py-1 font-modern text-xs text-white"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={ctaHref(card.referralCode)}
              className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-gold-500/95 px-5 py-3 font-exo2 text-base font-bold text-white shadow-lg transition hover:scale-[1.02]"
            >
              {copy.cta}
            </Link>
            <p className="text-center font-modern text-[11px] text-white/70">
              {language === 'pl' ? 'Za darmo na project-ida.com' : 'Free at project-ida.com'}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
