'use client';

import { useCallback, useState } from 'react';

function PhotoFrame({
  src,
  alt,
  label,
  onError,
}: {
  src: string;
  alt: string;
  label: string;
  onError?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="aspect-[4/3] w-full object-cover" onError={onError} />
      <span className="absolute bottom-3 left-3 rounded-full border border-gold/35 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
        {label}
      </span>
    </div>
  );
}

export function ShareCardPhotos({
  slug,
  title,
  beforeLabel,
  afterLabel,
}: {
  slug: string;
  title: string;
  beforeLabel: string;
  afterLabel: string;
}) {
  const afterSrc = `/api/share/${encodeURIComponent(slug)}/image`;
  const beforeSrc = `/api/share/${encodeURIComponent(slug)}/before`;
  const [showBefore, setShowBefore] = useState(true);
  const hideBefore = useCallback(() => setShowBefore(false), []);

  if (!showBefore) {
    return <PhotoFrame src={afterSrc} alt={title} label={afterLabel} />;
  }

  return (
    <div className="space-y-3">
      <PhotoFrame src={beforeSrc} alt={beforeLabel} label={beforeLabel} onError={hideBefore} />
      <PhotoFrame src={afterSrc} alt={title} label={afterLabel} />
    </div>
  );
}
