"use client";

import { useCallback, useEffect, useState } from "react";
import { useWcagSettings } from "@/contexts/WcagSettingsContext";

/**
 * Horizontal reading band that follows the pointer (WCAG assistive pattern).
 */
export function ReadingGuide() {
  const { readingGuide } = useWcagSettings();
  const [y, setY] = useState(0);

  const onMove = useCallback((clientY: number) => {
    setY(clientY);
  }, []);

  useEffect(() => {
    if (!readingGuide) return;

    const handleMouse = (e: MouseEvent) => onMove(e.clientY);
    const handleTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onMove(t.clientY);
    };

    window.addEventListener("mousemove", handleMouse, { passive: true });
    window.addEventListener("touchmove", handleTouch, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("touchmove", handleTouch);
    };
  }, [readingGuide, onMove]);

  if (!readingGuide) return null;

  const bandHeight = 44;
  const top = Math.max(0, y - bandHeight / 2);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 z-[10050]"
      style={{
        top,
        height: bandHeight,
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(255,255,255,0.35), rgba(0,0,0,0.12))",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
      }}
    />
  );
}
