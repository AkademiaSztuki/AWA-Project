'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { shareCardProxyPath } from '@/lib/share/share-card-urls';

const SHARE_MD_BREAKPOINT = 768;
const BEFORE_RETRY_LIMIT = 4;

function PhotoSkeleton() {
  return (
    <div
      className="flex aspect-[4/3] w-full animate-pulse items-center justify-center bg-gradient-to-br from-pearl-50 via-champagne/70 to-gold-400/20 font-exo2 text-lg font-semibold text-graphite/35"
      aria-hidden="true"
    >
      IDA
    </div>
  );
}

function PhotoFrame({
  src,
  alt,
  label,
  onError,
  onLoad,
  loading,
}: {
  src: string;
  alt: string;
  label: string;
  onError?: () => void;
  onLoad?: () => void;
  loading?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-400/40 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      {loading ? <PhotoSkeleton /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        decoding="async"
        className={`aspect-[4/3] w-full object-cover ${loading ? 'absolute inset-0 h-full opacity-0' : ''}`}
        onError={onError}
        onLoad={onLoad}
      />
      <span className="absolute bottom-3 left-3 rounded-full border border-gold-400/40 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
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
  beforeLoading,
  afterLoading,
  onBeforeError,
  onBeforeLoad,
  onAfterLoad,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
  title: string;
  beforeLoading?: boolean;
  afterLoading?: boolean;
  onBeforeError?: () => void;
  onBeforeLoad?: () => void;
  onAfterLoad?: () => void;
}) {
  const [position, setPosition] = useState(50);
  const [hasUsedSlider, setHasUsedSlider] = useState(false);
  const draggingRef = useRef(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(8, Math.min(92, next)));
  }, []);

  const markUsed = useCallback(() => {
    setHasUsedSlider(true);
  }, []);

  const showPlaceholder = Boolean(beforeLoading && afterLoading);

  return (
    <div
      ref={frameRef}
      role="slider"
      tabIndex={0}
      aria-label={`${beforeLabel} / ${afterLabel}`}
      aria-valuemin={8}
      aria-valuemax={92}
      aria-valuenow={Math.round(position)}
      className="relative aspect-[4/3] cursor-ew-resize touch-none select-none overflow-hidden rounded-2xl border border-gold-400/40 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70"
      onPointerDown={(event) => {
        draggingRef.current = true;
        markUsed();
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
          markUsed();
          setPosition((prev) => Math.max(8, prev - 5));
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          markUsed();
          setPosition((prev) => Math.min(92, prev + 5));
        } else if (event.key === 'Home') {
          event.preventDefault();
          markUsed();
          setPosition(8);
        } else if (event.key === 'End') {
          event.preventDefault();
          markUsed();
          setPosition(92);
        }
      }}
    >
      {showPlaceholder ? (
        <div className="absolute inset-0">
          <PhotoSkeleton />
        </div>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeSrc}
        alt={beforeLabel}
        decoding="async"
        fetchPriority="high"
        className={`absolute inset-0 h-full w-full object-cover ${beforeLoading ? 'opacity-0' : ''}`}
        onError={onBeforeError}
        onLoad={onBeforeLoad}
      />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterSrc}
          alt={title}
          decoding="async"
          fetchPriority="high"
          className={`absolute inset-0 h-full w-full object-cover ${afterLoading ? 'opacity-0' : ''}`}
          onLoad={onAfterLoad}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 z-[2] w-1 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
        style={{ left: `${position}%` }}
        aria-hidden="true"
      >
        <div
          className={`absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 shadow-xl backdrop-blur-sm ${
            hasUsedSlider ? '' : 'animate-pulse'
          }`}
        >
          <ChevronLeft
            className="h-5 w-5 shrink-0 text-[#C79833] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]"
            strokeWidth={2.5}
          />
          <ChevronRight
            className="h-5 w-5 shrink-0 text-[#C79833] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]"
            strokeWidth={2.5}
          />
        </div>
      </div>
      <span className="absolute bottom-3 left-3 rounded-full border border-gold-400/40 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
        {beforeLabel}
      </span>
      <span className="absolute bottom-3 right-3 rounded-full border border-gold-400/40 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
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
  const isMobile = useIsMobile(SHARE_MD_BREAKPOINT);
  const afterSrc = shareCardProxyPath(slug, 'image');
  const [beforeAttempt, setBeforeAttempt] = useState(0);
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const retryTimerRef = useRef<number | null>(null);
  const beforeSrc = shareCardProxyPath(slug, 'before', beforeAttempt);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current != null) window.clearTimeout(retryTimerRef.current);
    };
  }, []);

  const handleBeforeLoad = useCallback(() => {
    setBeforeLoaded(true);
  }, []);

  const handleAfterLoad = useCallback(() => {
    setAfterLoaded(true);
  }, []);

  const handleBeforeError = useCallback(() => {
    setBeforeLoaded(false);
    if (beforeAttempt >= BEFORE_RETRY_LIMIT) return;
    if (retryTimerRef.current != null) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = window.setTimeout(() => {
      setBeforeAttempt((n) => Math.min(BEFORE_RETRY_LIMIT, n + 1));
    }, 400 + beforeAttempt * 250);
  }, [beforeAttempt]);

  if (isMobile) {
    return (
      <div className="space-y-3">
        <PhotoFrame
          src={beforeSrc}
          alt={beforeLabel}
          label={beforeLabel}
          loading={!beforeLoaded}
          onError={handleBeforeError}
          onLoad={handleBeforeLoad}
        />
        <PhotoFrame
          src={afterSrc}
          alt={title}
          label={afterLabel}
          loading={!afterLoaded}
          onLoad={handleAfterLoad}
        />
      </div>
    );
  }

  return (
    <ShareComparisonSlider
      beforeSrc={beforeSrc}
      afterSrc={afterSrc}
      beforeLabel={beforeLabel}
      afterLabel={afterLabel}
      title={title}
      beforeLoading={!beforeLoaded}
      afterLoading={!afterLoaded}
      onBeforeError={handleBeforeError}
      onBeforeLoad={handleBeforeLoad}
      onAfterLoad={handleAfterLoad}
    />
  );
}
