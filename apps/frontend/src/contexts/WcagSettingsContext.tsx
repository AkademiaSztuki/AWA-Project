"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { safeLocalStorage } from "@/lib/gcp-data";

export type FontScale = "xs" | "sm" | "md" | "lg" | "xl";
export type ContrastMode = "normal" | "high" | "negative" | "grayscale";

export interface WcagSettingsState {
  fontScale: FontScale;
  contrastMode: ContrastMode;
  textSpacing: boolean;
  readableFont: boolean;
  underlineLinks: boolean;
  bigCursor: boolean;
  reducedMotion: boolean;
  readingGuide: boolean;
  focusHighlight: boolean;
}

interface WcagSettingsContextType extends WcagSettingsState {
  setFontScale: (v: FontScale) => void;
  setContrastMode: (v: ContrastMode) => void;
  setTextSpacing: (v: boolean) => void;
  setReadableFont: (v: boolean) => void;
  setUnderlineLinks: (v: boolean) => void;
  setBigCursor: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setReadingGuide: (v: boolean) => void;
  setFocusHighlight: (v: boolean) => void;
  reset: () => void;
  isAdjusted: boolean;
}

const WcagSettingsContext = createContext<WcagSettingsContextType | undefined>(
  undefined
);

const WCAG_STORAGE_KEY = "wcag_settings";

const DEFAULT_SETTINGS: WcagSettingsState = {
  fontScale: "sm",
  contrastMode: "normal",
  textSpacing: false,
  readableFont: false,
  underlineLinks: false,
  bigCursor: false,
  reducedMotion: false,
  readingGuide: false,
  focusHighlight: false,
};

const FONT_SCALE_CSS: Record<FontScale, string> = {
  xs: "0.875",
  sm: "1",
  md: "1.125",
  lg: "1.25",
  xl: "1.5",
};

const CONTRAST_CLASS_MAP: Record<Exclude<ContrastMode, "normal">, string> = {
  high: "a11y-contrast-high",
  negative: "a11y-contrast-negative",
  grayscale: "a11y-contrast-grayscale",
};

interface StoredWcag extends Partial<WcagSettingsState> {}

function isFontScale(v: unknown): v is FontScale {
  return v === "xs" || v === "sm" || v === "md" || v === "lg" || v === "xl";
}

function isContrastMode(v: unknown): v is ContrastMode {
  return (
    v === "normal" ||
    v === "high" ||
    v === "negative" ||
    v === "grayscale"
  );
}

const getStoredWcagSettings = (): WcagSettingsState | null => {
  if (typeof window === "undefined") return null;
  const raw = safeLocalStorage.getItem(WCAG_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredWcag;
    return {
      fontScale: isFontScale(parsed.fontScale)
        ? parsed.fontScale
        : DEFAULT_SETTINGS.fontScale,
      contrastMode: isContrastMode(parsed.contrastMode)
        ? parsed.contrastMode
        : DEFAULT_SETTINGS.contrastMode,
      textSpacing:
        typeof parsed.textSpacing === "boolean"
          ? parsed.textSpacing
          : DEFAULT_SETTINGS.textSpacing,
      readableFont:
        typeof parsed.readableFont === "boolean"
          ? parsed.readableFont
          : DEFAULT_SETTINGS.readableFont,
      underlineLinks:
        typeof parsed.underlineLinks === "boolean"
          ? parsed.underlineLinks
          : DEFAULT_SETTINGS.underlineLinks,
      bigCursor:
        typeof parsed.bigCursor === "boolean"
          ? parsed.bigCursor
          : DEFAULT_SETTINGS.bigCursor,
      reducedMotion:
        typeof parsed.reducedMotion === "boolean"
          ? parsed.reducedMotion
          : DEFAULT_SETTINGS.reducedMotion,
      readingGuide:
        typeof parsed.readingGuide === "boolean"
          ? parsed.readingGuide
          : DEFAULT_SETTINGS.readingGuide,
      focusHighlight:
        typeof parsed.focusHighlight === "boolean"
          ? parsed.focusHighlight
          : DEFAULT_SETTINGS.focusHighlight,
    };
  } catch (e) {
    console.warn("[WcagSettingsContext] Failed to parse stored settings:", e);
    return null;
  }
};

function persistWcag(settings: WcagSettingsState): void {
  if (typeof window === "undefined") return;
  try {
    safeLocalStorage.setItem(WCAG_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("[WcagSettingsContext] Failed to persist:", e);
  }
}

export function WcagSettingsProvider({ children }: { children: ReactNode }) {
  const stored = getStoredWcagSettings();
  const hasStored = stored !== null;

  const [fontScale, setFontScale] = useState<FontScale>(
    stored?.fontScale ?? DEFAULT_SETTINGS.fontScale
  );
  const [contrastMode, setContrastMode] = useState<ContrastMode>(
    stored?.contrastMode ?? DEFAULT_SETTINGS.contrastMode
  );
  const [textSpacing, setTextSpacing] = useState(
    stored?.textSpacing ?? DEFAULT_SETTINGS.textSpacing
  );
  const [readableFont, setReadableFont] = useState(
    stored?.readableFont ?? DEFAULT_SETTINGS.readableFont
  );
  const [underlineLinks, setUnderlineLinks] = useState(
    stored?.underlineLinks ?? DEFAULT_SETTINGS.underlineLinks
  );
  const [bigCursor, setBigCursor] = useState(
    stored?.bigCursor ?? DEFAULT_SETTINGS.bigCursor
  );
  const [reducedMotion, setReducedMotion] = useState(
    stored?.reducedMotion ?? DEFAULT_SETTINGS.reducedMotion
  );
  const [readingGuide, setReadingGuide] = useState(
    stored?.readingGuide ?? DEFAULT_SETTINGS.readingGuide
  );
  const [focusHighlight, setFocusHighlight] = useState(
    stored?.focusHighlight ?? DEFAULT_SETTINGS.focusHighlight
  );

  // If nothing stored, sync reduced motion with OS preference once (client only)
  useEffect(() => {
    if (hasStored || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReducedMotion(true);
    }
  }, [hasStored]);

  const isAdjusted = useMemo(() => {
    return (
      fontScale !== DEFAULT_SETTINGS.fontScale ||
      contrastMode !== DEFAULT_SETTINGS.contrastMode ||
      textSpacing !== DEFAULT_SETTINGS.textSpacing ||
      readableFont !== DEFAULT_SETTINGS.readableFont ||
      underlineLinks !== DEFAULT_SETTINGS.underlineLinks ||
      bigCursor !== DEFAULT_SETTINGS.bigCursor ||
      reducedMotion !== DEFAULT_SETTINGS.reducedMotion ||
      readingGuide !== DEFAULT_SETTINGS.readingGuide ||
      focusHighlight !== DEFAULT_SETTINGS.focusHighlight
    );
  }, [
    fontScale,
    contrastMode,
    textSpacing,
    readableFont,
    underlineLinks,
    bigCursor,
    reducedMotion,
    readingGuide,
    focusHighlight,
  ]);

  useEffect(() => {
    const html = document.documentElement;
    html.style.setProperty("--a11y-font-scale", FONT_SCALE_CSS[fontScale]);

    Object.values(CONTRAST_CLASS_MAP).forEach((c) => html.classList.remove(c));
    if (contrastMode !== "normal") {
      html.classList.add(CONTRAST_CLASS_MAP[contrastMode]);
    }

    const toggle = (cls: string, on: boolean) => {
      if (on) html.classList.add(cls);
      else html.classList.remove(cls);
    };

    toggle("a11y-text-spacing", textSpacing);
    toggle("a11y-readable-font", readableFont);
    toggle("a11y-underline-links", underlineLinks);
    toggle("a11y-big-cursor", bigCursor);
    toggle("a11y-reduced-motion", reducedMotion);
    toggle("a11y-focus-highlight", focusHighlight);

    return () => {
      html.style.removeProperty("--a11y-font-scale");
      Object.values(CONTRAST_CLASS_MAP).forEach((c) => html.classList.remove(c));
      html.classList.remove(
        "a11y-text-spacing",
        "a11y-readable-font",
        "a11y-underline-links",
        "a11y-big-cursor",
        "a11y-reduced-motion",
        "a11y-focus-highlight"
      );
    };
  }, [
    fontScale,
    contrastMode,
    textSpacing,
    readableFont,
    underlineLinks,
    bigCursor,
    reducedMotion,
    focusHighlight,
  ]);

  useEffect(() => {
    persistWcag({
      fontScale,
      contrastMode,
      textSpacing,
      readableFont,
      underlineLinks,
      bigCursor,
      reducedMotion,
      readingGuide,
      focusHighlight,
    });
  }, [
    fontScale,
    contrastMode,
    textSpacing,
    readableFont,
    underlineLinks,
    bigCursor,
    reducedMotion,
    readingGuide,
    focusHighlight,
  ]);

  const reset = useCallback(() => {
    setFontScale(DEFAULT_SETTINGS.fontScale);
    setContrastMode(DEFAULT_SETTINGS.contrastMode);
    setTextSpacing(DEFAULT_SETTINGS.textSpacing);
    setReadableFont(DEFAULT_SETTINGS.readableFont);
    setUnderlineLinks(DEFAULT_SETTINGS.underlineLinks);
    setBigCursor(DEFAULT_SETTINGS.bigCursor);
    setReducedMotion(DEFAULT_SETTINGS.reducedMotion);
    setReadingGuide(DEFAULT_SETTINGS.readingGuide);
    setFocusHighlight(DEFAULT_SETTINGS.focusHighlight);
  }, []);

  const value = useMemo<WcagSettingsContextType>(
    () => ({
      fontScale,
      contrastMode,
      textSpacing,
      readableFont,
      underlineLinks,
      bigCursor,
      reducedMotion,
      readingGuide,
      focusHighlight,
      setFontScale,
      setContrastMode,
      setTextSpacing,
      setReadableFont,
      setUnderlineLinks,
      setBigCursor,
      setReducedMotion,
      setReadingGuide,
      setFocusHighlight,
      reset,
      isAdjusted,
    }),
    [
      fontScale,
      contrastMode,
      textSpacing,
      readableFont,
      underlineLinks,
      bigCursor,
      reducedMotion,
      readingGuide,
      focusHighlight,
      reset,
      isAdjusted,
    ]
  );

  return (
    <WcagSettingsContext.Provider value={value}>
      {children}
    </WcagSettingsContext.Provider>
  );
}

export function useWcagSettings() {
  const ctx = useContext(WcagSettingsContext);
  if (ctx === undefined) {
    throw new Error("useWcagSettings must be used within a WcagSettingsProvider");
  }
  return ctx;
}
