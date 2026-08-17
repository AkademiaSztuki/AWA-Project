'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { shareCardProxyPath } from '@/lib/share/share-card-urls';

const SHARE_MD_BREAKPOINT = 768;
const BEFORE_RETRY_LIMIT = 4;

const imgDragGuard = {
  draggable: false as const,
  onDragStart: (event: React.DragEvent) => {
    event.preventDefault();
  },
};

const imgNoDragClass =
  'select-none [-webkit-user-drag:none] [user-drag:none]';

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

function markIfAlreadyDecoded(el: HTMLImageElement | null, onReady?: () => void): void {
  if (!el || !onReady) return;
  if (el.complete && el.naturalWidth > 0) onReady();
}

function PhotoFrame({
  src,
  alt,
  label,
  onError,
  onLoad,
}: {
  src: string;
  alt: string;
  label: string;
  onError?: () => void;
  onLoad?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-400/40 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      <div className="absolute inset-0 z-0">
        <PhotoSkeleton />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        decoding="async"
        {...imgDragGuard}
        ref={(el) => markIfAlreadyDecoded(el, onLoad)}
        className={`relative z-[1] aspect-[4/3] w-full object-cover ${imgNoDragClass}`}
        onError={onError}
        onLoad={onLoad}
      />
      <span className="pointer-events-none absolute bottom-3 left-3 z-[2] rounded-full border border-gold-400/40 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
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
  onBeforeLoad,
  onAfterLoad,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
  title: string;
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

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const startDragging = useCallback(
    (event: React.PointerEvent, captureTarget?: EventTarget | null) => {
      event.preventDefault();
      draggingRef.current = true;
      markUsed();
      const node = captureTarget instanceof Element ? captureTarget : event.currentTarget;
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        // Document listeners still drive the drag if capture is rejected.
      }
      updateFromClientX(event.clientX);
    },
    [markUsed, updateFromClientX],
  );

  useEffect(() => {
    const onMove = (event: PointerEvent | MouseEvent) => {
      if (!draggingRef.current) return;
      event.preventDefault();
      updateFromClientX(event.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [updateFromClientX]);

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
        startDragging(event, frameRef.current);
      }}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
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
      <div className="absolute inset-0 z-0">
        <PhotoSkeleton />
      </div>
      {/* After fills the frame — visible to the RIGHT of the handle (Po). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterSrc}
        alt={title}
        decoding="async"
        fetchPriority="high"
        {...imgDragGuard}
        ref={(el) => markIfAlreadyDecoded(el, onAfterLoad)}
        className={`pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover ${imgNoDragClass}`}
        onLoad={onAfterLoad}
      />
      {/* Before is clipped to the LEFT of the handle (Przed). Never reuse afterSrc. */}
      <div
        className="pointer-events-none absolute inset-0 z-[2] overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beforeSrc}
          alt={beforeLabel}
          decoding="async"
          fetchPriority="high"
          {...imgDragGuard}
          ref={(el) => markIfAlreadyDecoded(el, onBeforeLoad)}
          className={`absolute inset-0 h-full w-full object-cover ${imgNoDragClass}`}
          onError={onBeforeError}
          onLoad={onBeforeLoad}
        />
      </div>
      <div
        className="absolute inset-y-0 z-[3] w-12 -translate-x-1/2 cursor-ew-resize touch-none"
        style={{ left: `${position}%` }}
        onPointerDown={(event) => {
          event.stopPropagation();
          startDragging(event, event.currentTarget);
        }}
        aria-hidden="true"
      >
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.12)]" />
        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 shadow-xl backdrop-blur-sm ${
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
      <span className="pointer-events-none absolute bottom-3 left-3 z-[4] rounded-full border border-gold-400/40 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute bottom-3 right-3 z-[4] rounded-full border border-gold-400/40 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
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
  const [beforeFailed, setBeforeFailed] = useState(false);
  const retryTimerRef = useRef<number | null>(null);
  const beforeSrc = shareCardProxyPath(slug, 'before', beforeAttempt);
  const distinctBeforeSrc = beforeSrc === afterSrc ? '' : beforeSrc;

  useEffect(() => {
    return () => {
      if (retryTimerRef.current != null) window.clearTimeout(retryTimerRef.current);
    };
  }, []);

  const handleBeforeError = useCallback(() => {
    if (beforeAttempt >= BEFORE_RETRY_LIMIT) {
      setBeforeFailed(true);
      return;
    }
    if (retryTimerRef.current != null) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = window.setTimeout(() => {
      setBeforeAttempt((n) => Math.min(BEFORE_RETRY_LIMIT, n + 1));
    }, 400 + beforeAttempt * 250);
  }, [beforeAttempt]);

  if (isMobile) {
    return (
      <div className="space-y-3">
        {distinctBeforeSrc && !beforeFailed ? (
          <PhotoFrame
            src={distinctBeforeSrc}
            alt={beforeLabel}
            label={beforeLabel}
            onError={handleBeforeError}
          />
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-gold-400/40 bg-white/40">
            <PhotoSkeleton />
            <span className="absolute bottom-3 left-3 rounded-full border border-gold-400/40 bg-white/85 px-3 py-1 font-modern text-xs font-semibold text-graphite shadow-sm">
              {beforeLabel}
            </span>
          </div>
        )}
        <PhotoFrame src={afterSrc} alt={title} label={afterLabel} />
      </div>
    );
  }

  if (!distinctBeforeSrc || beforeFailed) {
    return <PhotoFrame src={afterSrc} alt={title} label={afterLabel} />;
  }

  return (
    <ShareComparisonSlider
      beforeSrc={distinctBeforeSrc}
      afterSrc={afterSrc}
      beforeLabel={beforeLabel}
      afterLabel={afterLabel}
      title={title}
      onBeforeError={handleBeforeError}
    />
  );
}
