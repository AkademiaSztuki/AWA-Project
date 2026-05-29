'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMotionValueEvent, type MotionValue } from 'framer-motion';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { useAnimation } from '@/contexts/AnimationContext';
import { markDialoguePlaybackUserGesture } from '@/components/ui/DialogueAudioPlayer';
import {
  APP_CONTENT_FRAME_PADDING_X,
  APP_CONTENT_MAX_WIDTH,
  APP_CONTENT_RIGHT_COLUMN,
  APP_CONTENT_XL_GRID,
} from '@/lib/app-content-grid';
import { isDialogueAudioPlaying } from '@/lib/dialogue-audio';
import { cn } from '@/lib/utils';

export const MARKETING_IDA_INTRO_SESSION_KEY = 'ida_marketing_intro_shown';
export const MARKETING_PATH_SELECTION_DIALOGUE_SESSION_KEY = 'ida_marketing_path_selection_shown';
export const MARKETING_IDA_INTRO_SETTLE_THRESHOLD = 0.92;

/** TODO: set true before release — intro once per browser session. */
export const MARKETING_IDA_INTRO_ONCE_PER_SESSION = false;

/** TODO: set true before release — path-selection dialogue once per browser session. */
export const MARKETING_PATH_SELECTION_ONCE_PER_SESSION = false;

export const HOW_IT_WORKS_SECTION_ID = 'how-it-works';
export const MARKETING_PATH_SELECTION_SECTION_ID = 'marketing-path-selection';

const HOW_IT_WORKS_VISIBLE_RATIO = 0.38;
const PATH_SELECTION_VISIBLE_RATIO = 0.45;
const CTA_OBSERVER_FALLBACK_MS = 1200;
const DIALOGUE_AUDIO_POLL_MS = 160;

type MarketingDialogueStep = 'marketing_intro' | 'path_selection';

function hasSessionFlag(key: string, oncePerSession: boolean): boolean {
  if (!oncePerSession) return false;
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function setSessionFlag(key: string, oncePerSession: boolean): void {
  if (!oncePerSession) return;
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}

function hasMarketingIntroBeenShown(): boolean {
  return hasSessionFlag(MARKETING_IDA_INTRO_SESSION_KEY, MARKETING_IDA_INTRO_ONCE_PER_SESSION);
}

function markMarketingIntroShown(): void {
  setSessionFlag(MARKETING_IDA_INTRO_SESSION_KEY, MARKETING_IDA_INTRO_ONCE_PER_SESSION);
}

function hasPathSelectionDialogueBeenShown(): boolean {
  return hasSessionFlag(
    MARKETING_PATH_SELECTION_DIALOGUE_SESSION_KEY,
    MARKETING_PATH_SELECTION_ONCE_PER_SESSION
  );
}

function markPathSelectionDialogueShown(): void {
  setSessionFlag(
    MARKETING_PATH_SELECTION_DIALOGUE_SESSION_KEY,
    MARKETING_PATH_SELECTION_ONCE_PER_SESSION
  );
}

type UseMarketingIdaIntroOptions = {
  heroSettle: MotionValue<number>;
  settleAdvanceEps: number;
};

function MarketingDialoguePortal({
  currentStep,
  onFinish,
}: {
  currentStep: MarketingDialogueStep;
  onFinish: () => void;
}) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-[100] pointer-events-none',
        'pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]'
      )}
    >
      <div className={cn('w-full', APP_CONTENT_FRAME_PADDING_X)}>
        <div className={cn(APP_CONTENT_MAX_WIDTH, APP_CONTENT_XL_GRID, 'xl:items-end')}>
          <div className="hidden min-w-0 xl:block" aria-hidden="true" />
          <div className={cn(APP_CONTENT_RIGHT_COLUMN, 'pointer-events-auto')}>
            <AwaDialogue currentStep={currentStep} autoStart autoHide onDialogueEnd={onFinish} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function useMarketingIdaIntro({ heroSettle, settleAdvanceEps }: UseMarketingIdaIntroOptions) {
  const { playAnimation } = useAnimation();
  const [activeDialogue, setActiveDialogue] = useState<MarketingDialogueStep | null>(null);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const introPendingCtaRef = useRef(false);
  const introActivatedRef = useRef(false);
  const pathSelectionShownRef = useRef(false);
  const pathSelectionQueuedRef = useRef(false);
  const prevHeroSettleRef = useRef(0);
  const audioIdlePollRef = useRef<number | null>(null);

  const clearAudioIdlePoll = useCallback(() => {
    if (audioIdlePollRef.current !== null) {
      window.clearInterval(audioIdlePollRef.current);
      audioIdlePollRef.current = null;
    }
  }, []);

  useEffect(() => {
    setPortalHost(document.body);
    return () => clearAudioIdlePoll();
  }, [clearAudioIdlePoll]);

  const tryActivatePathSelection = useCallback(() => {
    if (pathSelectionShownRef.current || hasPathSelectionDialogueBeenShown()) {
      pathSelectionQueuedRef.current = false;
      return;
    }
    if (activeDialogue !== null) {
      pathSelectionQueuedRef.current = true;
      return;
    }
    if (isDialogueAudioPlaying()) {
      pathSelectionQueuedRef.current = true;
      return;
    }

    pathSelectionQueuedRef.current = false;

    if (!introActivatedRef.current && !hasMarketingIntroBeenShown()) {
      introActivatedRef.current = true;
      markMarketingIntroShown();
    }

    pathSelectionShownRef.current = true;
    setActiveDialogue('path_selection');
  }, [activeDialogue]);

  const schedulePathSelectionWhenAudioIdle = useCallback(() => {
    if (!pathSelectionQueuedRef.current) return;
    if (!isDialogueAudioPlaying() && activeDialogue === null) {
      tryActivatePathSelection();
      return;
    }
    if (audioIdlePollRef.current !== null) return;

    audioIdlePollRef.current = window.setInterval(() => {
      if (!pathSelectionQueuedRef.current) {
        clearAudioIdlePoll();
        return;
      }
      if (activeDialogue !== null) return;
      if (!isDialogueAudioPlaying()) {
        clearAudioIdlePoll();
        tryActivatePathSelection();
      }
    }, DIALOGUE_AUDIO_POLL_MS);
  }, [activeDialogue, clearAudioIdlePoll, tryActivatePathSelection]);

  const queuePathSelectionDialogue = useCallback(() => {
    if (pathSelectionShownRef.current || hasPathSelectionDialogueBeenShown()) return;
    pathSelectionQueuedRef.current = true;
    tryActivatePathSelection();
    schedulePathSelectionWhenAudioIdle();
  }, [schedulePathSelectionWhenAudioIdle, tryActivatePathSelection]);

  const finishActiveDialogue = useCallback(() => {
    if (activeDialogue === 'marketing_intro') {
      markMarketingIntroShown();
      if (!MARKETING_IDA_INTRO_ONCE_PER_SESSION) {
        introActivatedRef.current = false;
      }
      introPendingCtaRef.current = false;
    } else if (activeDialogue === 'path_selection') {
      markPathSelectionDialogueShown();
      pathSelectionQueuedRef.current = false;
    }

    setActiveDialogue(null);
    clearAudioIdlePoll();

    if (pathSelectionQueuedRef.current) {
      window.requestAnimationFrame(() => {
        tryActivatePathSelection();
        schedulePathSelectionWhenAudioIdle();
      });
    }
  }, [
    activeDialogue,
    clearAudioIdlePoll,
    schedulePathSelectionWhenAudioIdle,
    tryActivatePathSelection,
  ]);

  const activateIntro = useCallback(
    (fromUserGesture = false) => {
      if (
        introActivatedRef.current ||
        hasMarketingIntroBeenShown() ||
        pathSelectionShownRef.current ||
        hasPathSelectionDialogueBeenShown()
      ) {
        return;
      }
      if (activeDialogue !== null) return;
      if (isDialogueAudioPlaying()) return;

      if (fromUserGesture) {
        markDialoguePlaybackUserGesture();
      }
      introActivatedRef.current = true;
      introPendingCtaRef.current = false;
      playAnimation('loading_anim');
      setActiveDialogue('marketing_intro');
    },
    [activeDialogue, playAnimation]
  );

  useMotionValueEvent(heroSettle, 'change', (value) => {
    if (
      introActivatedRef.current ||
      hasMarketingIntroBeenShown() ||
      pathSelectionShownRef.current ||
      hasPathSelectionDialogueBeenShown()
    ) {
      return;
    }
    const prev = prevHeroSettleRef.current;
    const advancing = value > prev + settleAdvanceEps;
    prevHeroSettleRef.current = value;
    if (advancing && value >= MARKETING_IDA_INTRO_SETTLE_THRESHOLD) {
      activateIntro(false);
    }
  });

  useEffect(() => {
    const el = document.getElementById(HOW_IT_WORKS_SECTION_ID);
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || !introPendingCtaRef.current) return;
        if (entry.intersectionRatio < HOW_IT_WORKS_VISIBLE_RATIO) return;
        activateIntro(false);
      },
      { threshold: [0, HOW_IT_WORKS_VISIBLE_RATIO, 0.5] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [activateIntro]);

  useEffect(() => {
    const el = document.getElementById(MARKETING_PATH_SELECTION_SECTION_ID);
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (entry.intersectionRatio < PATH_SELECTION_VISIBLE_RATIO) return;
        queuePathSelectionDialogue();
      },
      { threshold: [0, PATH_SELECTION_VISIBLE_RATIO, 0.55] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [queuePathSelectionDialogue]);

  useEffect(() => {
    if (activeDialogue !== null) {
      clearAudioIdlePoll();
      return;
    }
    if (!pathSelectionQueuedRef.current) return;
    schedulePathSelectionWhenAudioIdle();
  }, [activeDialogue, clearAudioIdlePoll, schedulePathSelectionWhenAudioIdle]);

  const scrollToHowItWorksWithIntro = useCallback(() => {
    const target = document.getElementById(HOW_IT_WORKS_SECTION_ID);
    if (!target) return;

    if (hasMarketingIntroBeenShown()) {
      target.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    activateIntro(true);
    introPendingCtaRef.current = true;
    target.scrollIntoView({ behavior: 'smooth' });

    window.setTimeout(() => {
      if (!introPendingCtaRef.current || introActivatedRef.current) return;
      const el = document.getElementById(HOW_IT_WORKS_SECTION_ID);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const visible = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
      if (visible / vh >= HOW_IT_WORKS_VISIBLE_RATIO) {
        activateIntro(false);
      }
    }, CTA_OBSERVER_FALLBACK_MS);
  }, [activateIntro]);

  const introPortal =
    activeDialogue && portalHost
      ? createPortal(
          <MarketingDialoguePortal currentStep={activeDialogue} onFinish={finishActiveDialogue} />,
          portalHost
        )
      : null;

  return { introPortal, scrollToHowItWorksWithIntro };
}
