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
            cta: 'Wygeneruj swoje na project-ida.com',
          }
        : {
            title: 'A quick interior vision',
            description: 'Generated on IDA’s fast path — style plus your room photo.',
            cta: 'Generate yours at project-ida.com',
          };
    case 'full':
      return language === 'pl'
        ? {
            title: 'Wnętrze dopasowane do osobowości',
            description: 'Wizja z pełnej ścieżki IDA — gust, nastrój i profil osobowości.',
            cta: 'Wygeneruj swoje na project-ida.com',
          }
        : {
            title: 'An interior matched to personality',
            description: 'A full-path IDA vision — taste, mood, and personality profile.',
            cta: 'Generate yours at project-ida.com',
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

  const copy = pathCopy(card.pathType, readLanguage());
  const imageSrc = `/api/share/${encodeURIComponent(card.slug)}/image`;
  const metaBits = [card.styleLabel, card.roomType].filter(Boolean) as string[];

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-3xl flex-col items-center px-4 py-10 sm:py-14">
      <article className="w-full overflow-hidden rounded-3xl border border-white/30 bg-white/40 shadow-xl backdrop-blur-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={copy.title}
          className="h-auto w-full object-cover"
        />
        <div className="space-y-4 px-5 py-6 sm:px-8 sm:py-8">
          <h1 className="font-exo2 text-2xl font-bold text-gray-900 sm:text-3xl">{copy.title}</h1>
          {metaBits.length > 0 && (
            <p className="font-modern text-sm text-gray-700">{metaBits.join(' · ')}</p>
          )}
          {card.pathType === 'full' && card.personalityLabels.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {card.personalityLabels.map((label) => (
                <li
                  key={label}
                  className="rounded-full bg-gold-400/20 px-3 py-1 font-modern text-xs text-gray-800"
                >
                  {label}
                </li>
              ))}
            </ul>
          )}
          <p className="font-modern text-sm leading-relaxed text-gray-700">{copy.description}</p>
          <Link
            href={ctaHref(card.referralCode)}
            className="inline-flex items-center gap-3 rounded-full bg-gold-500/90 px-5 py-3 font-exo2 text-sm font-bold text-white shadow-lg transition hover:scale-[1.02]"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-md bg-white/20 text-base font-bold"
            >
              IDA
            </span>
            {copy.cta}
          </Link>
        </div>
      </article>
    </main>
  );
}
