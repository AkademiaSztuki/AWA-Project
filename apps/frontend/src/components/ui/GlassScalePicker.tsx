"use client";

import React, {
  useId,
  useRef,
  useCallback,
  useLayoutEffect,
  useState,
  useEffect,
  useMemo,
} from "react";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

export interface GlassScalePickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  /** Accessible name for the radiogroup */
  ariaLabel?: string;
  /**
   * When this value changes (e.g. selected image id), gold “used” styling resets:
   * neutral frame until the user interacts again — keeps matrix / multi-image flows consistent.
   */
  highlightResetKey?: string | number;
}

function springOpts(reduce: boolean) {
  if (reduce) {
    return { stiffness: 8000, damping: 120, mass: 0.2 };
  }
  // Spokojniejszy ruch: podążanie za myszą i powrót po leave bez „strzału”
  return { stiffness: 200, damping: 52, mass: 0.58 };
}

/**
 * Skala 1–N: złoty pill podąża za myszą po torze; po opuszczeniu — wraca do wyboru.
 */
export const GlassScalePicker: React.FC<GlassScalePickerProps> = ({
  min,
  max,
  value,
  onChange,
  className,
  id,
  ariaLabel,
  highlightResetKey,
}) => {
  const reactId = useId();
  const groupId = id ?? `glass-scale-${reactId.replace(/:/g, "")}`;
  const count = max - min + 1;
  const options = Array.from({ length: count }, (_, i) => min + i);
  const clamped = Math.min(max, Math.max(min, value));
  const buttonRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pointerInsideRef = useRef(false);
  const lastPointerXRef = useRef<number | null>(null);
  const moveRafRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  const springConfig = useMemo(() => springOpts(!!reduceMotion), [reduceMotion]);

  const xMv = useMotionValue(0);
  const yMv = useMotionValue(0);
  const widthMv = useMotionValue(0);
  const heightMv = useMotionValue(0);

  const xSp = useSpring(xMv, springConfig);
  const ySp = useSpring(yMv, springConfig);
  const widthSp = useSpring(widthMv, springConfig);
  const heightSp = useSpring(heightMv, springConfig);

  const widthPx = useTransform(widthSp, (v) => `${Math.max(0, v)}px`);
  const heightPx = useTransform(heightSp, (v) => `${Math.max(0, v)}px`);

  const [highlightReady, setHighlightReady] = useState(false);
  /** Gold pill / glow only after the user clicks or changes value with keyboard — not on initial default. */
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const setButtonRef = (n: number, el: HTMLButtonElement | null) => {
    if (el) buttonRefs.current.set(n, el);
    else buttonRefs.current.delete(n);
  };

  const focusValue = (v: number) => {
    queueMicrotask(() => buttonRefs.current.get(v)?.focus());
  };

  const markInteracted = useCallback(() => {
    setHasUserInteracted(true);
  }, []);

  useEffect(() => {
    setHasUserInteracted(false);
  }, [highlightResetKey]);

  const handleSelect = useCallback(
    (n: number) => {
      markInteracted();
      onChange(n);
    },
    [markInteracted, onChange],
  );

  const applyPillRect = useCallback(
    (x: number, y: number, w: number, h: number) => {
      if (w < 4 || h < 4) return;
      xMv.set(x);
      yMv.set(y);
      widthMv.set(w);
      heightMv.set(h);
      setHighlightReady(true);
    },
    [heightMv, widthMv, xMv, yMv],
  );

  const updatePillFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      const bMin = buttonRefs.current.get(min);
      const bMax = buttonRefs.current.get(max);
      if (!track || !bMin || !bMax) return;

      const tr = track.getBoundingClientRect();
      const first = bMin.getBoundingClientRect();
      const last = bMax.getBoundingClientRect();

      const start = first.left - tr.left;
      const end = last.right - tr.left;
      const w = first.width;
      let maxH = first.height;
      for (let nv = min; nv <= max; nv++) {
        const el = buttonRefs.current.get(nv);
        if (!el) continue;
        const h = el.getBoundingClientRect().height;
        if (h > maxH) maxH = h;
      }

      const mxLocal = clientX - tr.left;
      const half = w / 2;
      const centerMin = start + half;
      const centerMax = end - half;
      const centerClamped =
        centerMax >= centerMin
          ? Math.max(centerMin, Math.min(centerMax, mxLocal))
          : (start + end) / 2;
      const pillX = centerClamped - half;
      const pillY = first.top - tr.top;

      applyPillRect(pillX, pillY, w, maxH);
    },
    [applyPillRect, max, min],
  );

  const measureHighlight = useCallback(() => {
    if (pointerInsideRef.current && !reduceMotion && lastPointerXRef.current != null) {
      updatePillFromPointer(lastPointerXRef.current);
      return;
    }

    const track = trackRef.current;
    const btn = buttonRefs.current.get(clamped);
    if (!track || !btn) return;
    const tr = track.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    if (br.width < 4 || br.height < 4) return;

    applyPillRect(br.left - tr.left, br.top - tr.top, br.width, br.height);
  }, [applyPillRect, clamped, reduceMotion, updatePillFromPointer]);

  const schedulePointerUpdate = useCallback(
    (clientX: number) => {
      if (reduceMotion) return;
      lastPointerXRef.current = clientX;
      pointerInsideRef.current = true;
      if (moveRafRef.current != null) return;
      moveRafRef.current = window.requestAnimationFrame(() => {
        moveRafRef.current = null;
        const x = lastPointerXRef.current;
        if (x != null) updatePillFromPointer(x);
      });
    },
    [reduceMotion, updatePillFromPointer],
  );

  const handlePointerLeave = useCallback(() => {
    pointerInsideRef.current = false;
    lastPointerXRef.current = null;
    if (moveRafRef.current != null) {
      window.cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
    measureHighlight();
  }, [measureHighlight]);

  useLayoutEffect(() => {
    measureHighlight();
  }, [measureHighlight]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => measureHighlight());
    ro.observe(track);
    window.addEventListener("resize", measureHighlight);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureHighlight);
    };
  }, [measureHighlight]);

  useEffect(() => {
    if (reduceMotion) return;
    const idRaf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(measureHighlight);
    });
    return () => window.cancelAnimationFrame(idRaf);
  }, [measureHighlight, reduceMotion, count]);

  useEffect(() => {
    if (reduceMotion) return;
    const t = window.setTimeout(measureHighlight, 560);
    return () => window.clearTimeout(t);
  }, [count, measureHighlight, reduceMotion]);

  return (
    <div
      id={groupId}
      role="radiogroup"
      aria-label={ariaLabel ?? "Scale selection"}
      className={cn("relative w-full", className)}
    >
      {!reduceMotion && hasUserInteracted ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-3 rounded-[28px] bg-gradient-to-r from-gold-500/18 via-champagne/14 to-gold-400/18 blur-2xl"
          animate={{ opacity: [0.22, 0.4, 0.22], scale: [0.995, 1.008, 0.995] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      <div
        ref={trackRef}
        onPointerMove={(e) => schedulePointerUpdate(e.clientX)}
        onPointerEnter={(e) => schedulePointerUpdate(e.clientX)}
        onPointerLeave={handlePointerLeave}
        className={cn(
          "relative flex w-full cursor-default overflow-hidden rounded-3xl p-1.5 sm:p-2",
          "border border-white/35 bg-gradient-to-b from-white/[0.14] to-pearl-100/[0.08]",
          "shadow-[0_8px_40px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.06)_inset]",
          "backdrop-blur-xl",
          count >= 7 ? "gap-1 sm:gap-1.5" : "gap-1.5 sm:gap-2",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-3 top-0 z-[3] h-px bg-gradient-to-r from-transparent to-transparent",
            hasUserInteracted ? "via-gold-400/28" : "via-white/14",
          )}
          aria-hidden
        />

        {!reduceMotion && hasUserInteracted ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-[3] h-[2px] w-[28%] max-w-[120px] bg-gradient-to-r from-transparent via-gold-200/45 to-transparent opacity-45"
            animate={{ x: ["-35%", "380%"] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "linear" }}
          />
        ) : null}

        {/* Selection pill: always visible neutral “glass frame” for current value; gold only after first use */}
        <motion.div
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0 top-0 z-[1] rounded-2xl border will-change-transform transition-[border-color,box-shadow,background-image] duration-300",
            hasUserInteracted
              ? "border-gold-400/50 bg-gradient-to-b from-gold-400/32 via-gold-500/18 to-pearl-100/14 shadow-[0_0_18px_rgba(255,196,0,0.22),0_0_0_1px_rgba(255,255,255,0.22)_inset]"
              : "border-white/55 bg-gradient-to-b from-white/[0.34] via-white/[0.16] to-pearl-100/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_14px_rgba(15,23,42,0.1),0_0_0_1px_rgba(255,255,255,0.14)_inset]",
            !highlightReady && "opacity-0",
          )}
          style={{
            x: xSp,
            y: ySp,
            width: widthPx,
            height: heightPx,
          }}
        >
          {hasUserInteracted && !reduceMotion ? (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl border border-white/18"
              initial={{ opacity: 0.45 }}
              animate={{ opacity: [0.38, 0.58, 0.38] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
        </motion.div>

        {options.map((n, index) => {
          const selected = clamped === n;
          return (
            <motion.div
              key={n}
              className="relative z-[2] min-w-0 flex-1"
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.92 }}
              animate={reduceMotion ? false : { opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 32,
                delay: reduceMotion ? 0 : index * 0.04,
              }}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                ref={(el) => setButtonRef(n, el)}
                onClick={() => handleSelect(n)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                    if (n < max) {
                      e.preventDefault();
                      markInteracted();
                      onChange(n + 1);
                      focusValue(n + 1);
                    }
                  } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                    if (n > min) {
                      e.preventDefault();
                      markInteracted();
                      onChange(n - 1);
                      focusValue(n - 1);
                    }
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    markInteracted();
                    onChange(min);
                    focusValue(min);
                  } else if (e.key === "End") {
                    e.preventDefault();
                    markInteracted();
                    onChange(max);
                    focusValue(max);
                  }
                }}
                className={cn(
                  "group relative flex h-full min-h-[48px] w-full flex-col justify-center overflow-visible rounded-2xl border border-transparent bg-transparent py-2",
                  "font-futuristic font-normal tabular-nums tracking-[0.12em]",
                  "text-xs sm:text-sm md:text-[0.95rem]",
                  "transition-[color,transform,box-shadow] duration-200",
                  "hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                  selected
                    ? hasUserInteracted
                      ? "text-graphite drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]"
                      : "text-graphite font-medium"
                    : "text-graphite/70 hover:text-graphite",
                )}
              >
                {!selected ? (
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-all duration-300",
                      "group-hover:opacity-100 group-hover:shadow-[0_0_26px_rgba(255,215,0,0.28),inset_0_0_22px_rgba(255,255,255,0.08)]",
                      "bg-[radial-gradient(ellipse_90%_140%_at_50%_0%,rgba(255,229,92,0.28),transparent_68%)]",
                    )}
                  />
                ) : null}

                <span className="relative z-10 flex w-full items-center justify-center px-0.5">
                  {n}
                </span>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
