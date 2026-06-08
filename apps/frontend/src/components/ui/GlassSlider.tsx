"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface GlassSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  ariaLabel?: string;
  ariaValueText?: string;
  showScaleMarkers?: boolean; // Whether to show scale markers below slider
}

export const GlassSlider: React.FC<GlassSliderProps> = ({
  min,
  max,
  value,
  onChange,
  className = '',
  id,
  ariaLabel,
  ariaValueText,
  showScaleMarkers = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const span = max - min;
  const percentage = span === 0 ? 0 : ((value - min) / span) * 100;
  /** Must match thumb `w-12` (3rem) — use rem so position stays correct when WCAG font scale changes root font-size */
  const thumbWidthRem = 3;
  const ratio = span === 0 ? 0 : (value - min) / span;
  const leftPosition = `calc((100% - ${thumbWidthRem}rem) * ${ratio})`;

  const handleChange = (newValue: number) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    onChange(newValue);
  };

  // Generate value text for screen readers
  const getValueText = () => {
    if (ariaValueText) return ariaValueText;
    return `${value} z zakresu ${min} do ${max}`;
  };

  const thumbAccent = isDragging
    ? "scale-110 border-gold/85 bg-white/75 ring-2 ring-gold-400 shadow-[0_0_28px_rgba(250,204,21,0.65),0_0_0_1px_rgba(255,255,255,0.35)_inset]"
    : hasInteracted
      ? "border-gold/60 bg-white/65 ring-2 ring-gold-400/55 shadow-[0_0_22px_rgba(251,191,36,0.5),0_0_0_1px_rgba(255,255,255,0.25)_inset]"
      : "border-white/50 bg-white/40 shadow-xl";

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(parseInt(e.target.value, 10));
  };

  return (
    <div className={cn("relative min-h-[44px] w-full flex items-center", className)}>
      {/* Glass container - pill-shaped like GlassSurface buttons */}
      <div
        className={cn(
          "relative w-full h-5 sm:h-5 min-h-[20px] overflow-visible rounded-[20px] border bg-white/10 shadow-xl backdrop-blur-xl transition-[box-shadow,border-color] duration-300",
          hasInteracted
            ? "border-gold-400/35 shadow-[0_0_20px_rgba(251,191,36,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]"
            : "border-white/20",
        )}
      >
        {/* Track background */}
        <div className="absolute inset-0 rounded-[20px] bg-black/10" aria-hidden="true" />

        {/* Progress track */}
        <div
          className={cn(
            "absolute top-1/2 h-1.5 -translate-y-1/2 transform rounded-full bg-gradient-to-r transition-all duration-300 ease-in-out",
            hasInteracted
              ? "from-amber-300 via-yellow-300 to-amber-200 shadow-[0_0_14px_rgba(253,224,71,0.45)]"
              : "from-yellow-400 to-yellow-300",
          )}
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />

        {/* Decorative thumb (native thumb is invisible) */}
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 h-4 w-12 -translate-y-1/2 transform rounded-[16px] border backdrop-blur-xl transition-all duration-300 ease-in-out",
            thumbAccent,
          )}
          style={{ left: leftPosition }}
          aria-hidden="true"
        />

        {/* Accessible input */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleInput}
          onInput={handleInput}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          onPointerCancel={() => setIsDragging(false)}
          onPointerLeave={() => setIsDragging(false)}
          className="glass-slider-input absolute inset-0 z-10 h-full min-h-[44px] w-full cursor-pointer touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          style={{
            WebkitAppearance: 'none',
            appearance: 'none',
            background: 'transparent',
            outline: 'none',
            margin: 0,
            padding: 0,
          }}
          aria-label={ariaLabel || 'Suwak'}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={getValueText()}
          tabIndex={0}
        />
      </div>
    </div>
  );
};
