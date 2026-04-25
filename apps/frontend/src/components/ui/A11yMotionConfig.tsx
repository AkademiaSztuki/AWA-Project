"use client";

import { MotionConfig } from "framer-motion";
import { useWcagSettings } from "@/contexts/WcagSettingsContext";
import type { ReactNode } from "react";

/**
 * Aligns Framer Motion with the same reduced-motion switch as
 * <html class="a11y-reduced-motion" /> (see globals.css + WcagSettingsContext).
 */
export function A11yMotionConfig({ children }: { children: ReactNode }) {
  const { reducedMotion } = useWcagSettings();
  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
      {children}
    </MotionConfig>
  );
}
