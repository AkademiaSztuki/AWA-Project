'use client';

import { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function PhotoFrame({
  src,
  alt,
  label,
  onError,
  missing,
}: {
  src: string;
  alt: string;
  label: string;
  onError?: () => void;
  missing?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-600/30 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      {missing ? (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-champagne/50 font-exo2 text-lg font-semibold text-graphite/40">
          IDA
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="aspect-[4/3] w-full object-cover" onError={onError} />
      )}
      <span className="absolute bottom-3 left-3 rounded-full border border-gold-600/35 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
        {label}
      </span>
    </div>
  );
}

function ShareComparisonSlider({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  title,
  onBeforeError,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
  title: string;
  onBeforeError?: () => void;
}) {
  const [position, setPosition] = useState(50);
  const draggingRef = useRef(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(8, Math.min(92, next)));
  }, []);

  return (
    <div
      ref={frameRef}
      role="slider"
      tabIndex={0}
      aria-label={`${beforeLabel} / ${afterLabel}`}
      aria-valuemin={8}
      aria-valuemax={92}
      aria-valuenow={Math.round(position)}
      className="relative aspect-[4/3] cursor-ew-resize select-none overflow-hidden rounded-2xl border border-gold-600/30 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-gold-600/70"
      onPointerDown={(event) => {
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromClientX(event.clientX);
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current) return;
        updateFromClientX(event.clientX);
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          setPosition((prev) => Math.max(8, prev - 5));
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          setPosition((prev) => Math.min(92, prev + 5));
        } else if (event.key === 'Home') {
          event.preventDefault();
          setPosition(8);
        } else if (event.key === 'End') {
          event.preventDefault();
          setPosition(92);
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={beforeSrc} alt={beforeLabel} className="absolute inset-0 h-full w-full object-cover" onError={onBeforeError} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={afterSrc} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div
        className="absolute inset-y-0 z-[2] w-px bg-white/55"
        style={{ left: `${position}%` }}
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5">
          <ChevronLeft className="h-5 w-5 shrink-0 text-gold-600 drop-shadow-[0_1px_0_rgba(255,255,255,0.55),0_0_8px_rgba(0,0,0,0.35)]" strokeWidth={2.5} />
          <ChevronRight className="h-5 w-5 shrink-0 text-gold-600 drop-shadow-[0_1px_0_rgba(255,255,255,0.55),0_0_8px_rgba(0,0,0,0.35)]" strokeWidth={2.5} />
        </div>
      </div>
      <span className="absolute bottom-3 left-3 rounded-full border border-gold-600/35 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
        {beforeLabel}
      </span>
      <span className="absolute bottom-3 right-3 rounded-full border border-gold-600/35 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
        {afterLabel}
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
  const [beforeAttempt, setBeforeAttempt] = useState(0);
  const [beforeMissing, setBeforeMissing] = useState(false);
  const beforeSrc = `/api/share/${encodeURIComponent(slug)}/before?v=${beforeAttempt}`;

  const retryBefore = useCallback(() => {
    window.setTimeout(() => {
      setBeforeAttempt((n) => {
        if (n >= 4) return n;
        return n + 1;
      });
    }, 450);
  }, []);

  const handleBeforeError = useCallback(() => {
    if (beforeAttempt >= 4) {
      setBeforeMissing(true);
      return;
    }
    retryBefore();
  }, [beforeAttempt, retryBefore]);

  if (beforeMissing) {
    return (
      <div className="space-y-3">
        <PhotoFrame src={beforeSrc} alt={beforeLabel} label={beforeLabel} missing />
        <PhotoFrame src={afterSrc} alt={title} label={afterLabel} />
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <div className="space-y-3">
          <PhotoFrame
            src={beforeSrc}
            alt={beforeLabel}
            label={beforeLabel}
            onError={handleBeforeError}
          />
          <PhotoFrame src={afterSrc} alt={title} label={afterLabel} />
        </div>
      </div>
      <div className="hidden md:block">
        <ShareComparisonSlider
          beforeSrc={beforeSrc}
          afterSrc={afterSrc}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
          title={title}
          onBeforeError={handleBeforeError}
        />
      </div>
    </>
  );
}
