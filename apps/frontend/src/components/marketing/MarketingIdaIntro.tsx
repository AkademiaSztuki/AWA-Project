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
export const MARKETING_PERSONALIZATION_DIALOGUE_SESSION_KEY = 'ida_marketing_personalization_shown';
export const MARKETING_RESEARCH_DIALOGUE_SESSION_KEY = 'ida_marketing_research_shown';
export const MARKETING_EARLY_ACCESS_DIALOGUE_SESSION_KEY = 'ida_marketing_early_access_shown';
export const MARKETING_IDA_INTRO_SETTLE_THRESHOLD = 0.92;

/** Intro + scroll dialogues replay on each visit (no persistence). */
export const MARKETING_IDA_INTRO_ONCE_PER_SESSION = false;
export const MARKETING_SCROLL_DIALOGUE_ONCE_PER_SESSION = false;

export const HOW_IT_WORKS_SECTION_ID = 'how-it-works';
export const MARKETING_PATH_SELECTION_SECTION_ID = 'marketing-path-selection';
export const MARKETING_WHY_SECTION_ID = 'marketing-why';
export const MARKETING_RESEARCH_SECTION_ID = 'research-project';
export const MARKETING_FINAL_CTA_SECTION_ID = 'marketing-final-cta';

const HOW_IT_WORKS_VISIBLE_RATIO = 0.38;
const PATH_SELECTION_VISIBLE_RATIO = 0.45;
const WHY_SECTION_VISIBLE_RATIO = 0.4;
const RESEARCH_SECTION_VISIBLE_RATIO = 0.4;
const FINAL_CTA_VISIBLE_RATIO = 0.45;
const CTA_OBSERVER_FALLBACK_MS = 1200;
const DIALOGUE_AUDIO_POLL_MS = 160;

type MarketingDialogueStep =
  | 'marketing_intro'
  | 'marketing_path_selection'
  | 'marketing_personalization'
  | 'marketing_research'
  | 'marketing_early_access';

type ScrollDialogueConfig = {
  step: Exclude<MarketingDialogueStep, 'marketing_intro'>;
  sectionId: string;
  sessionKey: string;
  visibleRatio: number;
};

const SCROLL_DIALOGUES: ScrollDialogueConfig[] = [
  {
    step: 'marketing_path_selection',
    sectionId: MARKETING_PATH_SELECTION_SECTION_ID,
    sessionKey: MARKETING_PATH_SELECTION_DIALOGUE_SESSION_KEY,
    visibleRatio: PATH_SELECTION_VISIBLE_RATIO,
  },
  {
    step: 'marketing_personalization',
    sectionId: MARKETING_WHY_SECTION_ID,
    sessionKey: MARKETING_PERSONALIZATION_DIALOGUE_SESSION_KEY,
    visibleRatio: WHY_SECTION_VISIBLE_RATIO,
  },
  {
    step: 'marketing_research',
    sectionId: MARKETING_RESEARCH_SECTION_ID,
    sessionKey: MARKETING_RESEARCH_DIALOGUE_SESSION_KEY,
    visibleRatio: RESEARCH_SECTION_VISIBLE_RATIO,
  },
  {
    step: 'marketing_early_access',
    sectionId: MARKETING_FINAL_CTA_SECTION_ID,
    sessionKey: MARKETING_EARLY_ACCESS_DIALOGUE_SESSION_KEY,
    visibleRatio: FINAL_CTA_VISIBLE_RATIO,
  },
];

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

function hasScrollDialogueBeenShown(sessionKey: string): boolean {
  return hasSessionFlag(sessionKey, MARKETING_SCROLL_DIALOGUE_ONCE_PER_SESSION);
}

function markScrollDialogueShown(sessionKey: string): void {
  setSessionFlag(sessionKey, MARKETING_SCROLL_DIALOGUE_ONCE_PER_SESSION);
}

function getScrollConfig(step: Exclude<MarketingDialogueStep, 'marketing_intro'>) {
  return SCROLL_DIALOGUES.find((c) => c.step === step);
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
  const shownScrollStepsRef = useRef<Set<MarketingDialogueStep>>(new Set());
  const pendingScrollStepsRef = useRef<MarketingDialogueStep[]>([]);
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

  const tryActivateNextInQueue = useCallback(() => {
    if (activeDialogue !== null) return;
    if (isDialogueAudioPlaying()) return;

    while (pendingScrollStepsRef.current.length > 0) {
      const next = pendingScrollStepsRef.current[0];
      const config = getScrollConfig(next as Exclude<MarketingDialogueStep, 'marketing_intro'>);
      if (!config) {
        pendingScrollStepsRef.current.shift();
        continue;
      }
      if (shownScrollStepsRef.current.has(next) || hasScrollDialogueBeenShown(config.sessionKey)) {
        pendingScrollStepsRef.current.shift();
        continue;
      }

      pendingScrollStepsRef.current.shift();
      shownScrollStepsRef.current.add(next);

      if (!introActivatedRef.current && !hasMarketingIntroBeenShown()) {
        introActivatedRef.current = true;
        markMarketingIntroShown();
      }

      setActiveDialogue(next);
      return;
    }
  }, [activeDialogue]);

  const scheduleQueueWhenAudioIdle = useCallback(() => {
    if (pendingScrollStepsRef.current.length === 0) return;
    if (!isDialogueAudioPlaying() && activeDialogue === null) {
      tryActivateNextInQueue();
      return;
    }
    if (audioIdlePollRef.current !== null) return;

    audioIdlePollRef.current = window.setInterval(() => {
      if (pendingScrollStepsRef.current.length === 0) {
        clearAudioIdlePoll();
        return;
      }
      if (activeDialogue !== null) return;
      if (!isDialogueAudioPlaying()) {
        clearAudioIdlePoll();
        tryActivateNextInQueue();
      }
    }, DIALOGUE_AUDIO_POLL_MS);
  }, [activeDialogue, clearAudioIdlePoll, tryActivateNextInQueue]);

  const queueScrollDialogue = useCallback(
    (step: Exclude<MarketingDialogueStep, 'marketing_intro'>) => {
      const config = getScrollConfig(step);
      if (!config) return;
      if (shownScrollStepsRef.current.has(step) || hasScrollDialogueBeenShown(config.sessionKey)) {
        return;
      }
      if (!pendingScrollStepsRef.current.includes(step)) {
        pendingScrollStepsRef.current.push(step);
      }
      tryActivateNextInQueue();
      scheduleQueueWhenAudioIdle();
    },
    [scheduleQueueWhenAudioIdle, tryActivateNextInQueue]
  );

  const finishActiveDialogue = useCallback(() => {
    if (activeDialogue === 'marketing_intro') {
      markMarketingIntroShown();
      if (!MARKETING_IDA_INTRO_ONCE_PER_SESSION) {
        introActivatedRef.current = false;
      }
      introPendingCtaRef.current = false;
    } else if (activeDialogue) {
      const config = getScrollConfig(
        activeDialogue as Exclude<MarketingDialogueStep, 'marketing_intro'>
      );
      if (config) {
        markScrollDialogueShown(config.sessionKey);
      }
    }

    setActiveDialogue(null);
    clearAudioIdlePoll();

    window.requestAnimationFrame(() => {
      tryActivateNextInQueue();
      scheduleQueueWhenAudioIdle();
    });
  }, [activeDialogue, clearAudioIdlePoll, scheduleQueueWhenAudioIdle, tryActivateNextInQueue]);

  const activateIntro = useCallback(
    (fromUserGesture = false) => {
      if (introActivatedRef.current || hasMarketingIntroBeenShown()) {
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

  const hasAnyScrollDialoguePendingOrShown = useCallback(() => {
    return SCROLL_DIALOGUES.some(
      (c) => shownScrollStepsRef.current.has(c.step) || hasScrollDialogueBeenShown(c.sessionKey)
    );
  }, []);

  useMotionValueEvent(heroSettle, 'change', (value) => {
    if (introActivatedRef.current || hasMarketingIntroBeenShown() || hasAnyScrollDialoguePendingOrShown()) {
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
    const observers: IntersectionObserver[] = [];

    for (const config of SCROLL_DIALOGUES) {
      const el = document.getElementById(config.sectionId);
      if (!el) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry?.isIntersecting) return;
          if (entry.intersectionRatio < config.visibleRatio) return;
          queueScrollDialogue(config.step);
        },
        { threshold: [0, config.visibleRatio, 0.55] }
      );

      observer.observe(el);
      observers.push(observer);
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, [queueScrollDialogue]);

  useEffect(() => {
    if (activeDialogue !== null) {
      clearAudioIdlePoll();
      return;
    }
    if (pendingScrollStepsRef.current.length === 0) return;
    scheduleQueueWhenAudioIdle();
  }, [activeDialogue, clearAudioIdlePoll, scheduleQueueWhenAudioIdle]);

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
