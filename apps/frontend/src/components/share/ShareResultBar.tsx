'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { creditsAuthHeaders } from '@/lib/credits-request-headers';
import {
  REFERRAL_VERIFY_CREDITS,
} from '@/lib/referral-constants';
import {
  captionWithUrl,
  facebookShareUrl,
  nativeShareData,
  shareCaptions,
  xShareUrl,
} from '@/lib/share/captions';
import { copyTextToClipboard } from '@/lib/share/copy-text';
import { composeBrandedImageBlob, downloadShareImage } from '@/lib/share/download-image';
import {
  collectShareBeforeBase64,
  compressBase64ForShare,
  imageSourceToBase64,
  looksLikeImageBase64,
  toBase64Payload,
} from '@/lib/share/source-image';
import { getSiteUrl } from '@/lib/seo/site';
import { getSessionStoreSnapshot } from '@/hooks/useSession';

type SharePathType = 'fast' | 'full';

interface ShareResultBarProps {
  userHash?: string | null;
  imageUrl: string;
  imageBase64?: string | null;
  beforeImageUrl?: string | null;
  beforeImageBase64?: string | null;
  pathType: SharePathType;
  styleLabel?: string | null;
  roomType?: string | null;
  personalityLabels?: string[];
}

interface CreatedCard {
  slug: string;
  referralCode: string | null;
  hasBeforeImage?: boolean;
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

function FacebookLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9v-2.89h2.4V9.84c0-2.37 1.41-3.68 3.57-3.68 1.03 0 2.12.18 2.12.18v2.33h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.89h-2.22V21.95C18.34 21.2 22 17.06 22 12.07z" />
    </svg>
  );
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError';
}

function shareUrlFor(created: CreatedCard): string {
  const ref = created.referralCode ? `?ref=${encodeURIComponent(created.referralCode)}` : '';
  return `${getSiteUrl()}/s/${created.slug}${ref}`;
}

function openShareWindow(url: string, preopened?: Window | null): void {
  if (preopened && !preopened.closed) {
    preopened.location.href = url;
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function ShareResultBar({
  userHash,
  imageUrl,
  imageBase64,
  beforeImageUrl,
  beforeImageBase64,
  pathType,
  styleLabel,
  roomType,
  personalityLabels,
}: ShareResultBarProps) {
  const { language } = useLanguage();
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  const [card, setCard] = useState<CreatedCard | null>(null);
  const [cardKey, setCardKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [igHint, setIgHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createPromiseRef = useRef<Promise<CreatedCard | null> | null>(null);
  const shareKey = `${userHash || ''}|${imageUrl}|${pathType}|${beforeImageUrl || ''}`;
  const validCard = cardKey === shareKey ? card : null;
  const brandCta = t('Wygeneruj swoje na project-ida.com', 'Generate yours at project-ida.com');
  const storyLabels = {
    before: t('Przed', 'Before'),
    after: t('Po', 'After'),
  };

  const mapCreateError = useCallback(
    (status: number, raw: string): string => {
      if (raw === 'participant_not_found') {
        return t(
          'Sesja nie jest jeszcze zapisana. Odśwież stronę i spróbuj ponownie.',
          'Session is not saved yet. Refresh and try again.',
        );
      }
      if (raw === 'before_image_required' || raw === 'invalid_before_image') {
        return t(
          'Nie udało się dołączyć zdjęcia pokoju (przed). Odśwież stronę i spróbuj ponownie.',
          'Could not attach the room photo (before). Refresh and try again.',
        );
      }
      if (raw === 'before_image_save_failed') {
        return t(
          'Nie udało się zapisać zdjęcia „przed”. Spróbuj ponownie za chwilę.',
          'Could not save the before photo. Please try again in a moment.',
        );
      }
      if (status === 401 || /unauthor/i.test(raw)) {
        return t(
          'Nie udało się utworzyć publicznego linku (brak autoryzacji serwera). Spróbuj ponownie za chwilę.',
          'Could not create the public link (server unauthorized). Please try again in a moment.',
        );
      }
      return raw || t('Nie udało się utworzyć karty.', 'Could not create the share card.');
    },
    [language],
  );

  const ensureCard = useCallback(async (silent = false): Promise<CreatedCard | null> => {
    if (validCard) return validCard;
    if (createPromiseRef.current) return createPromiseRef.current;

    const run = async (): Promise<CreatedCard | null> => {
      if (!userHash) {
        if (!silent) {
          setError(
            t(
              'Sesja jeszcze się ładuje — spróbuj za chwilę.',
              'Session is still loading — try again in a moment.',
            ),
          );
        }
        return null;
      }
      const payload =
        toBase64Payload(imageUrl, imageBase64) || (await imageSourceToBase64(imageUrl));
      if (!payload) {
        if (!silent) setError(t('Brak obrazu do udostępnienia.', 'No image available to share.'));
        return null;
      }

      let beforePayload = await collectShareBeforeBase64(
        beforeImageUrl,
        beforeImageBase64,
        getSessionStoreSnapshot(),
      );
      if (!beforePayload && silent) {
        await new Promise((resolve) => window.setTimeout(resolve, 400));
        beforePayload = await collectShareBeforeBase64(
          beforeImageUrl,
          beforeImageBase64,
          getSessionStoreSnapshot(),
        );
      }
      if (!beforePayload || !looksLikeImageBase64(beforePayload)) {
        if (!silent) {
          setError(
            t(
              'Brak zdjęcia pokoju (przed). Wróć do kroku ze zdjęciem i spróbuj ponownie.',
              'The room photo (before) is missing. Return to the photo step and try again.',
            ),
          );
        }
        return null;
      }

      const [afterCompressed, beforeCompressed] = await Promise.all([
        compressBase64ForShare(payload),
        compressBase64ForShare(beforePayload),
      ]);
      setBusy(true);
      if (!silent) setError(null);
      try {
        const res = await fetch('/api/share', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            ...creditsAuthHeaders(),
          },
          body: JSON.stringify({
            userHash,
            pathType,
            base64Image: afterCompressed,
            base64BeforeImage: beforeCompressed,
            styleLabel,
            roomType,
            personalityLabels,
          }),
        });
        const json = (await res.json()) as CreatedCard & { error?: string; hasBeforeImage?: boolean };
        if (!res.ok || !json.slug) {
          if (!silent) setError(mapCreateError(res.status, json.error || ''));
          return null;
        }
        if (json.hasBeforeImage !== true) {
          if (!silent) {
            setError(
              t(
                'Karta powstała bez zdjęcia „przed”. Spróbuj ponownie.',
                'The share card was created without a before photo. Please try again.',
              ),
            );
          }
          return null;
        }
        const created = { slug: json.slug, referralCode: json.referralCode, hasBeforeImage: true };
        setCard(created);
        setCardKey(shareKey);
        return created;
      } catch {
        if (!silent) setError(t('Błąd połączenia. Spróbuj ponownie.', 'Connection error. Try again.'));
        return null;
      } finally {
        setBusy(false);
      }
    };

    const promise = run().then((created) => {
      if (!created) createPromiseRef.current = null;
      return created;
    });
    createPromiseRef.current = promise;
    return promise;
  }, [
    validCard,
    shareKey,
    userHash,
    imageUrl,
    imageBase64,
    beforeImageUrl,
    beforeImageBase64,
    pathType,
    styleLabel,
    roomType,
    personalityLabels,
    language,
    mapCreateError,
  ]);

  useEffect(() => {
    createPromiseRef.current = null;
  }, [shareKey]);

  useEffect(() => {
    if (!userHash) return;
    void ensureCard(true);
    // Prefetch once per image so clipboard / window.open stay in a user gesture.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid loops when labels arrays are recreated
  }, [shareKey, userHash]);

  const captions = shareCaptions(language === 'en' ? 'en' : 'pl');

  const copyCreatedOrInvite = async (created: CreatedCard | null): Promise<boolean> => {
    if (created) {
      return copyTextToClipboard(shareUrlFor(created));
    }
    if (!userHash) return false;
    try {
      const res = await fetch(`/api/referral/me/${encodeURIComponent(userHash)}`, {
        credentials: 'same-origin',
        headers: creditsAuthHeaders(),
      });
      const json = (await res.json()) as { invitePath?: string; code?: string };
      if (!res.ok) return false;
      const inviteUrl = json.invitePath
        ? `${getSiteUrl()}${json.invitePath}`
        : json.code
          ? `${getSiteUrl()}/?ref=${encodeURIComponent(json.code)}`
          : null;
      if (!inviteUrl) return false;
      return copyTextToClipboard(inviteUrl);
    } catch {
      return false;
    }
  };

  const handleFacebook = async () => {
    const popup = window.open('about:blank', '_blank');
    const created = await ensureCard();
    if (!created) {
      popup?.close();
      return;
    }
    openShareWindow(facebookShareUrl(shareUrlFor(created), captions.facebook), popup);
  };

  const handleX = async () => {
    const popup = window.open('about:blank', '_blank');
    const created = await ensureCard();
    if (!created) {
      popup?.close();
      return;
    }
    openShareWindow(xShareUrl(shareUrlFor(created), captions.x), popup);
  };

  const handleCopy = async () => {
    const created = await ensureCard();
    const ok = await copyCreatedOrInvite(created);
    if (!ok) {
      setError(t('Nie udało się skopiować linku.', 'Could not copy the link.'));
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      await downloadShareImage(
        imageUrl,
        'ida-interior',
        true,
        brandCta,
        beforeImageUrl,
        storyLabels,
      );
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
    try {
      const [created, blob] = await Promise.all([
        ensureCard(),
        composeBrandedImageBlob(imageUrl, brandCta, beforeImageUrl, storyLabels),
      ]);
      const shareUrl = created ? shareUrlFor(created) : null;
      if (shareUrl) {
        await copyTextToClipboard(captionWithUrl(captions.instagram, shareUrl));
      }
      const file = new File([blob], 'ida-interior.jpg', { type: blob.type || 'image/jpeg' });
      const sharePayload = shareUrl
        ? nativeShareData(captions.instagram, shareUrl)
        : { title: 'IDA', text: captions.instagram };
      const shareData: ShareData = {
        files: [file],
        ...sharePayload,
      };

      if (typeof navigator.share === 'function') {
        const canShareFiles =
          typeof navigator.canShare !== 'function' ||
          navigator.canShare({ files: [file] }) ||
          navigator.canShare(shareData);
        if (canShareFiles) {
          try {
            await navigator.share(shareData);
            return;
          } catch (err) {
            if (isAbortError(err)) return;
          }
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `ida-interior-${Date.now()}.jpg`;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      setIgHint(true);
      window.setTimeout(() => setIgHint(false), 8000);
    } catch {
      try {
        await downloadShareImage(imageUrl, 'ida-interior', true, brandCta, beforeImageUrl, storyLabels);
        setIgHint(true);
        window.setTimeout(() => setIgHint(false), 8000);
      } catch {
        setError(
          t(
            'Nie udało się przygotować obrazu do Instagrama.',
            'Could not prepare the image for Instagram.',
          ),
        );
      }
    }
  };

  const pillBtn =
    'inline-flex min-h-11 flex-1 basis-[30%] items-center justify-center gap-1.5 rounded-full border border-white/40 bg-white/45 px-3 py-2 text-xs sm:text-sm font-modern text-graphite hover:bg-white/65 transition disabled:opacity-50 sm:basis-[18%]';

  return (
    <div className="space-y-3 rounded-2xl border border-white/35 bg-white/25 p-3 backdrop-blur-sm sm:p-4">
      <div>
        <p className="font-exo2 text-base font-bold text-graphite sm:text-lg">
          {t('Pochwal się tą koncepcją', 'Show off this interior concept')}
        </p>
        <p className="mt-0.5 font-modern text-xs text-gray-600 sm:text-sm">
          {t(
            `Udostępnij, żeby zdobyć dodatkowe ${REFERRAL_VERIFY_CREDITS} kredytów, gdy znajomy założy konto. Znajomi też dostają kredyty.`,
            `Share to earn an extra ${REFERRAL_VERIFY_CREDITS} credits when a friend creates an account. Friends get credits too.`,
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={pillBtn}
          onClick={() => void handleInstagram()}
          disabled={busy}
          aria-label="Instagram"
        >
          <InstagramLogo className="h-4 w-4" />
          Instagram
        </button>
        <button
          type="button"
          className={pillBtn}
          onClick={() => void handleFacebook()}
          disabled={busy}
          aria-label="Facebook"
        >
          <FacebookLogo className="h-4 w-4" />
          Facebook
        </button>
        <button type="button" className={pillBtn} onClick={() => void handleX()} disabled={busy} aria-label="X">
          <XLogo className="h-4 w-4" />
          X
        </button>
        <button
          type="button"
          className={pillBtn}
          onClick={() => void handleCopy()}
          disabled={busy}
          aria-label={t('Kopiuj link', 'Copy link')}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          <span className="truncate">{copied ? t('Skopiowano', 'Copied') : t('Link', 'Link')}</span>
        </button>
        <button
          type="button"
          className={pillBtn}
          onClick={() => void handleDownload()}
          aria-label={t('Pobierz obrazek', 'Download image')}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span className="truncate">{t('Pobierz', 'Save')}</span>
        </button>
      </div>
      {igHint && (
        <p className="font-modern text-sm text-graphite" role="status">
          {t(
            'Zapisano Stories (9:16, przed i po) i skopiowano podpis z linkiem — wklej go w Instagramie.',
            'Saved a 9:16 before/after Story image and copied the caption with the link — paste it in Instagram.',
          )}
        </p>
      )}
      {error && (
        <p className="font-modern text-xs text-red-700" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
