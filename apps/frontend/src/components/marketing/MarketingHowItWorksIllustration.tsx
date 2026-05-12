"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { COLOR_PALETTE_OPTIONS } from "@/components/setup/paletteOptions";
import {
  HERO_EMPTY_ROOM_FILE,
  HERO_INTERIOR_SLIDES,
  heroInteriorImageSrc,
} from "@/lib/marketing/hero-interior-slides";
import { LIVINGROOM_MARKETING_FILENAMES } from "@/lib/tinder-livingroom-marketing-strip";

/** Same pool as Core Profile step 4 (`tinder_swipes`) — `/public/Tinder/Livingroom` via curated filenames. */
const TINDER_MARKETING_URLS = LIVINGROOM_MARKETING_FILENAMES.map(
  (filename) => `/Tinder/Livingroom/${encodeURIComponent(filename)}`
);

/** Step 02 — Tinder-style interiors; slightly offset from palette phase to avoid lockstep flicker. */
const STEP_02_TINDER_HOLD_MS = 9_200;
/** Step 02 — same 4-tile strip as Tinder; palette phase fills each tile with one swatch from `COLOR_PALETTE_OPTIONS`. */
const STEP_02_PALETTE_HOLD_MS = 5_600;
/** Step 03 (hero-style interiors) — slower cadence than step 02. */
const STEP_03_ROTATE_MS = 14_500;

const STEP_02_CROSSFADE_SEC = 1.25;
const STEP_03_CROSSFADE_SEC = 2.35;

const EASE_SOFT: [number, number, number, number] = [0.45, 0, 0.55, 1];
const EASE_STEP02: [number, number, number, number] = [0.36, 0, 0.2, 1];

export function MarketingHowItWorksIllustration({ stepIndex }: { stepIndex: number }) {
  const reduceMotion = useReducedMotion();
  const [tinderOffset, setTinderOffset] = useState(0);
  const [paletteOffset, setPaletteOffset] = useState(0);
  const [step02Panel, setStep02Panel] = useState<"tinder" | "palette">("tinder");
  const [heroIdx, setHeroIdx] = useState(0);

  const tinderCount = TINDER_MARKETING_URLS.length;
  const paletteCount = COLOR_PALETTE_OPTIONS.length;
  const heroCount = HERO_INTERIOR_SLIDES.length;

  useEffect(() => {
    if (stepIndex !== 1 || tinderCount === 0) return;

    if (reduceMotion) {
      const id = window.setInterval(() => {
        setTinderOffset((i) => (i + 1) % tinderCount);
      }, STEP_02_TINDER_HOLD_MS);
      return () => window.clearInterval(id);
    }

    if (paletteCount === 0) return;

    setStep02Panel("tinder");
    let cancelled = false;
    let timeoutId = 0;

    const schedule = (panel: "tinder" | "palette") => {
      const ms = panel === "tinder" ? STEP_02_TINDER_HOLD_MS : STEP_02_PALETTE_HOLD_MS;
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        if (panel === "tinder") {
          setTinderOffset((i) => (i + 1) % tinderCount);
          setStep02Panel("palette");
          schedule("palette");
        } else {
          setPaletteOffset((o) => (o + 1) % paletteCount);
          setStep02Panel("tinder");
          schedule("tinder");
        }
      }, ms);
    };

    schedule("tinder");
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [stepIndex, reduceMotion, tinderCount, paletteCount]);

  useEffect(() => {
    if (stepIndex !== 2 || reduceMotion || heroCount === 0) return;
    const id = window.setInterval(() => {
      setHeroIdx((i) => (i + 1) % heroCount);
    }, STEP_03_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [stepIndex, reduceMotion, heroCount]);

  if (stepIndex === 0) {
    return (
      <div className="relative h-full w-full bg-black/10">
        <Image
          src={heroInteriorImageSrc(HERO_EMPTY_ROOM_FILE)}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
          priority={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
      </div>
    );
  }

  if (stepIndex === 1) {
    const tileCount = Math.min(4, tinderCount);
    const motionKey = reduceMotion
      ? `rm-t-${tinderOffset}`
      : step02Panel === "tinder"
        ? `t-${tinderOffset}`
        : `p-${paletteOffset}`;
    const paletteColors =
      paletteCount > 0
        ? COLOR_PALETTE_OPTIONS[paletteOffset % paletteCount].colors
        : (["#888888", "#888888", "#888888", "#888888"] as const);

    return (
      <div className="relative h-full w-full overflow-hidden bg-black/10">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={motionKey}
            className="absolute inset-0 flex gap-1.5 p-1 sm:gap-2 sm:p-1.5"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : STEP_02_CROSSFADE_SEC,
              ease: EASE_STEP02,
            }}
          >
            {reduceMotion || step02Panel === "tinder"
              ? Array.from({ length: tileCount }, (_, k) => {
                  const url = TINDER_MARKETING_URLS[(tinderOffset + k) % tinderCount];
                  return (
                    <div
                      key={k}
                      className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                    >
                      <Image src={url} alt="" fill className="object-cover" sizes="120px" />
                    </div>
                  );
                })
              : Array.from({ length: tileCount }, (_, k) => {
                  const hex = paletteColors[k % paletteColors.length];
                  return (
                    <div
                      key={k}
                      className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                      style={{ backgroundColor: hex }}
                    />
                  );
                })}
          </motion.div>
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5" />
      </div>
    );
  }

  if (heroCount === 0) {
    return <div className="h-full w-full bg-champagne/25" aria-hidden />;
  }

  const slide = HERO_INTERIOR_SLIDES[heroIdx % heroCount];
  const src = heroInteriorImageSrc(slide.file);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black/10">
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={slide.file}
          className="absolute inset-0"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{
            duration: reduceMotion ? 0 : STEP_03_CROSSFADE_SEC,
            ease: EASE_SOFT,
          }}
        >
          <Image src={src} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
        </motion.div>
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
    </div>
  );
}
