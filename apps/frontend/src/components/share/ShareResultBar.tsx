'use client';

import React, { useCallback, useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadShareImage } from '@/lib/share/download-image';
import { getSiteUrl } from '@/lib/seo/site';

type SharePathType = 'fast' | 'full';

interface ShareResultBarProps {
  userHash?: string | null;
  imageUrl: string;
  imageBase64?: string | null;
  pathType: SharePathType;
  styleLabel?: string | null;
  roomType?: string | null;
  personalityLabels?: string[];
}

interface CreatedCard {
  slug: string;
  referralCode: string | null;
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </svg>
  );
}

function toBase64Payload(imageUrl: string, imageBase64?: string | null): string | null {
  if (imageBase64 && imageBase64.length > 32) return imageBase64;
  const comma = imageUrl.indexOf(',');
  if (imageUrl.startsWith('data:') && comma !== -1) {
    return imageUrl.slice(comma + 1);
  }
  return null;
}

export function ShareResultBar({
  userHash,
  imageUrl,
  imageBase64,
  pathType,
  styleLabel,
  roomType,
  personalityLabels,
}: ShareResultBarProps) {
  const { language } = useLanguage();
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  const [card, setCard] = useState<CreatedCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [igHint, setIgHint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureCard = useCallback(async (): Promise<CreatedCard | null> => {
    if (card) return card;
    if (!userHash) {
      setError(t('Zaloguj się, aby udostępnić kartę.', 'Sign in to share your card.'));
      return null;
    }
    const payload = toBase64Payload(imageUrl, imageBase64);
    if (!payload) {
      setError(t('Brak obrazu do udostępnienia.', 'No image available to share.'));
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userHash,
          pathType,
          base64Image: payload,
          styleLabel,
          roomType,
          personalityLabels,
        }),
      });
      const json = (await res.json()) as CreatedCard & { error?: string };
      if (!res.ok || !json.slug) {
        setError(json.error || t('Nie udało się utworzyć karty.', 'Could not create the share card.'));
        return null;
      }
      const created = { slug: json.slug, referralCode: json.referralCode };
      setCard(created);
      return created;
    } catch {
      setError(t('Błąd połączenia. Spróbuj ponownie.', 'Connection error. Try again.'));
      return null;
    } finally {
      setBusy(false);
    }
  }, [card, userHash, imageUrl, imageBase64, pathType, styleLabel, roomType, personalityLabels, language]);

  const shareUrlFor = (created: CreatedCard): string => {
    const ref = created.referralCode ? `?ref=${encodeURIComponent(created.referralCode)}` : '';
    return `${getSiteUrl()}/s/${created.slug}${ref}`;
  };

  const tweetText = t(
    'Zobacz wnętrze, które IDA zaprojektowała pod mój gust.',
    'See the interior IDA designed around my taste.',
  );

  const handleX = async () => {
    const created = await ensureCard();
    if (!created) return;
    const url = shareUrlFor(created);
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(tweetText)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleCopy = async () => {
    const created = await ensureCard();
    if (!created) return;
    try {
      await navigator.clipboard.writeText(shareUrlFor(created));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('Nie udało się skopiować linku.', 'Could not copy the link.'));
    }
  };

  const handleDownload = async () => {
    try {
      await downloadShareImage(imageUrl, 'ida-interior');
    } catch {
      setError(
        t(
          'Nie udało się pobrać obrazu. Spróbuj ponownie za chwilę.',
          'Could not download the image. Please try again in a moment.',
        ),
      );
    }
  };

  const handleInstagram = async () => {
    const created = await ensureCard();
    if (created) {
      try {
        await navigator.clipboard.writeText(shareUrlFor(created));
      } catch {
        // download still proceeds
      }
    }
    try {
      await downloadShareImage(imageUrl, 'ida-interior');
      setIgHint(true);
      window.setTimeout(() => setIgHint(false), 6000);
    } catch {
      setError(
        t(
          'Nie udało się przygotować obrazu do Instagrama.',
          'Could not prepare the image for Instagram.',
        ),
      );
    }
  };

  const btnClass =
    'inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/40 px-3 py-2 text-xs sm:text-sm font-modern text-gray-800 hover:bg-white/60 transition disabled:opacity-50';

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-graphite font-modern">
        {t('Udostępnij', 'Share')}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnClass} onClick={() => void handleX()} disabled={busy} aria-label="X">
          <XLogo className="h-4 w-4" />
          X
        </button>
        <button type="button" className={btnClass} onClick={() => void handleInstagram()} disabled={busy} aria-label="Instagram">
          <InstagramLogo className="h-4 w-4" />
          Instagram
        </button>
        <button type="button" className={btnClass} onClick={() => void handleCopy()} disabled={busy} aria-label={t('Kopiuj link', 'Copy link')}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? t('Skopiowano', 'Copied') : t('Kopiuj link', 'Copy link')}
        </button>
        <button type="button" className={btnClass} onClick={() => void handleDownload()} aria-label={t('Pobierz obrazek', 'Download image')}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {t('Pobierz obrazek', 'Download image')}
        </button>
      </div>
      {igHint && (
        <p className="text-xs font-modern text-gray-700" role="status">
          {t(
            'Obraz zapisany, link w schowku — wklej go w Stories lub poście.',
            'Image saved and link copied — paste it in your Story or post.',
          )}
        </p>
      )}
      {error && (
        <p className="text-xs font-modern text-red-700" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
