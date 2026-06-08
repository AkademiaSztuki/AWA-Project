"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useColorAdjustment } from "@/contexts/ColorAdjustmentContext";
import { useWcagSettings, type ContrastMode, type FontScale } from "@/contexts/WcagSettingsContext";
import { GlassSlider } from "./GlassSlider";
import { Settings, X, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { a11yStrings } from "@/lib/a11y-i18n";
import { getA11yPanelUi } from "@/lib/a11y-panel-ui";
import {
  isMobileGlassSheetViewport,
  MOBILE_GLASS_SHEET_BACKDROP,
  MOBILE_GLASS_SHEET_BREAKPOINT,
  MOBILE_GLASS_SHEET_CLOSE_BUTTON,
  MOBILE_GLASS_SHEET_CLOSE_ICON_SIZE,
  MOBILE_GLASS_SHEET_HEADER,
  MOBILE_GLASS_SHEET_ROOT,
  MOBILE_GLASS_SHEET_SCROLL,
  MOBILE_GLASS_SHEET_SHELL,
} from "@/lib/mobile-glass-sheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

type PanelTab = "wcag" | "advanced";

const FONT_OPTIONS: { value: FontScale; label: string; ariaKey: keyof typeof a11yStrings }[] = [
  { value: "xs", label: "A−", ariaKey: "fontScaleXs" },
  { value: "sm", label: "A", ariaKey: "fontScaleSm" },
  { value: "md", label: "A+", ariaKey: "fontScaleMd" },
  { value: "lg", label: "A++", ariaKey: "fontScaleLg" },
  { value: "xl", label: "A+++", ariaKey: "fontScaleXl" },
];

const CONTRAST_OPTIONS: { value: ContrastMode; labelKey: keyof typeof a11yStrings }[] = [
  { value: "normal", labelKey: "contrastNormal" },
  { value: "high", labelKey: "contrastHigh" },
  { value: "negative", labelKey: "contrastNegative" },
  { value: "grayscale", labelKey: "contrastGrayscale" },
];

type PanelLayoutMode = "sheet" | "anchored";

function resolvePanelLayout(
  rect: DOMRect,
  options?: { forceSheet?: boolean }
): {
  mode: PanelLayoutMode;
  position: { top: number; right: number };
} {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const margin = 16;
  const panelW = Math.min(360, viewportW * 0.92);
  const panelH = Math.min(viewportH * 0.85, viewportH - margin * 2);

  if (options?.forceSheet || isMobileGlassSheetViewport()) {
    return { mode: "sheet", position: { top: 0, right: 0 } };
  }

  const topBelow = rect.bottom + 8;
  const topAbove = rect.top - 8 - panelH;
  const fitsBelow = topBelow + panelH <= viewportH - margin;
  const fitsAbove = topAbove >= margin;

  if (!fitsBelow && !fitsAbove) {
    return { mode: "sheet", position: { top: 0, right: 0 } };
  }

  const top = fitsBelow ? topBelow : topAbove;
  const idealRight = viewportW - rect.right;
  const maxRight = Math.max(0, viewportW - panelW - margin);
  const right = Math.max(0, Math.min(idealRight, maxRight));

  return { mode: "anchored", position: { top, right } };
}

type ColorAdjustmentPanelProps = {
  /** When rendered inside the mobile nav drawer, always use the full glass sheet layout. */
  preferSheetLayout?: boolean;
};

export function ColorAdjustmentPanel({
  preferSheetLayout = false,
}: ColorAdjustmentPanelProps = {}) {
  const { t } = useLanguage();
  const {
    saturation,
    hue,
    contrast,
    hideModel3D,
    setSaturation,
    setHue,
    setContrast,
    setHideModel3D,
    reset: resetColor,
    isAdjusted: isColorAdjusted,
  } = useColorAdjustment();

  const {
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
    reset: resetWcag,
    isAdjusted: isWcagAdjusted,
  } = useWcagSettings();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("wcag");
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const wcagTabRef = useRef<HTMLButtonElement>(null);
  const advancedTabRef = useRef<HTMLButtonElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isMobileSheetViewport = useIsMobile(MOBILE_GLASS_SHEET_BREAKPOINT);
  const [panelLayout, setPanelLayout] = useState<PanelLayoutMode>("anchored");
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 0 });

  const applyPanelLayout = useCallback(() => {
    if (!buttonRef.current) return;
    const { mode, position } = resolvePanelLayout(buttonRef.current.getBoundingClientRect(), {
      forceSheet: preferSheetLayout,
    });
    setPanelLayout(mode);
    setPanelPosition(position);
  }, [preferSheetLayout]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (preferSheetLayout || isMobileGlassSheetViewport()) {
      setPanelLayout("sheet");
      setPanelPosition({ top: 0, right: 0 });
      return;
    }

    applyPanelLayout();
    const timer = setTimeout(applyPanelLayout, 100);
    window.addEventListener("scroll", applyPanelLayout, true);
    window.addEventListener("resize", applyPanelLayout);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", applyPanelLayout, true);
      window.removeEventListener("resize", applyPanelLayout);
    };
  }, [isOpen, preferSheetLayout, applyPanelLayout]);

  const handleToggle = () => {
    if (!isOpen) {
      if (preferSheetLayout || isMobileGlassSheetViewport()) {
        setPanelLayout("sheet");
        setPanelPosition({ top: 0, right: 0 });
      } else {
        applyPanelLayout();
      }
    }
    setIsOpen((open) => !open);
  };

  useEffect(() => {
    if (isOpen && wcagTabRef.current) {
      const id = window.setTimeout(() => {
        wcagTabRef.current?.focus();
      }, 100);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableElements = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const list = Array.from(focusableElements).filter((el) => !el.hasAttribute("disabled"));
    if (list.length === 0) return;

    const firstElement = list[0];
    const lastElement = list[list.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [isOpen, activeTab]);

  const onTabKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveTab((prev) => {
        const next: PanelTab =
          e.key === "ArrowRight"
            ? prev === "wcag"
              ? "advanced"
              : "wcag"
            : prev === "advanced"
              ? "wcag"
              : "advanced";
        window.setTimeout(() => {
          (next === "wcag" ? wcagTabRef : advancedTabRef).current?.focus();
        }, 0);
        return next;
      });
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveTab("wcag");
      wcagTabRef.current?.focus();
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveTab("advanced");
      advancedTabRef.current?.focus();
    }
  }, []);

  const saturationId = "saturation-slider";
  const hueId = "hue-slider";
  const contrastId = "contrast-slider";

  const hasLowAccessibility = saturation < 80 || contrast < 80;

  const toggleClass =
    "relative inline-flex h-6 w-12 min-w-12 max-w-12 shrink-0 rounded-full leading-none transition-colors focus:ring-2 focus:ring-gold-500 focus:outline-none";

  const renderToggle = (
    value: boolean,
    onToggle: () => void,
    ariaLabel: string
  ) => (
    <button
      type="button"
      onClick={onToggle}
      className={`${toggleClass} ${value ? "bg-gold-500" : "bg-white/20"}`}
      aria-label={ariaLabel}
      role="switch"
      aria-checked={value}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          value ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );

  const triggerClass = preferSheetLayout
    ? cn(
        MOBILE_GLASS_SHEET_CLOSE_BUTTON,
        "relative z-[110] pointer-events-auto text-graphite focus:ring-gold-500"
      )
    : "w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all text-graphite flex-shrink-0 touch-target relative z-[110] pointer-events-auto focus:ring-2 focus:ring-gold-500 focus:outline-none";

  const trigger = (
    <button
      ref={buttonRef}
      onClick={handleToggle}
      className={triggerClass}
      aria-label={t(a11yStrings.openPanel)}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      type="button"
    >
      <Settings
        size={preferSheetLayout ? MOBILE_GLASS_SHEET_CLOSE_ICON_SIZE : 18}
        aria-hidden="true"
      />
    </button>
  );

  if (!mounted) {
    return trigger;
  }

  const isSheet =
    preferSheetLayout ||
    (mounted && isMobileSheetViewport) ||
    panelLayout === "sheet";
  const ui = getA11yPanelUi(isSheet);

  return (
    <React.Fragment>
      {trigger}

      {createPortal(
        <AnimatePresence initial={false}>
          {isOpen && (
            <div
              key="a11y-overlay"
              className={cn(
                isSheet
                  ? cn(MOBILE_GLASS_SHEET_SHELL, "z-[9998]")
                  : "pointer-events-none fixed inset-0 z-[9998]"
              )}
              data-app-overlay="true"
              data-overlay-layer="tool"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className={cn(
                  isSheet
                    ? MOBILE_GLASS_SHEET_BACKDROP
                    : "pointer-events-auto fixed inset-0 bg-black/20 backdrop-blur-sm"
                )}
                aria-hidden="true"
              />

              <motion.div
                ref={panelRef}
                initial={
                  isSheet
                    ? { opacity: 0, y: 24 }
                    : { opacity: 0, y: -20, scale: 0.95 }
                }
                animate={
                  isSheet ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }
                }
                exit={
                  isSheet
                    ? { opacity: 0, y: 24 }
                    : { opacity: 0, y: -20, scale: 0.95 }
                }
                transition={{ duration: 0.2 }}
                className={cn(
                  isSheet
                    ? MOBILE_GLASS_SHEET_ROOT
                    : "pointer-events-auto fixed z-[9999] flex h-[min(85vh,calc(100vh-6rem))] w-[min(360px,92vw)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[24px] p-4 shadow-2xl glass-panel sm:p-6"
                )}
                data-a11y-settings-panel="true"
                role="dialog"
                aria-modal="true"
                aria-labelledby="accessibility-panel-title"
                aria-describedby="accessibility-panel-description"
                style={
                  isSheet
                    ? undefined
                    : {
                        top: panelPosition.top > 0 ? `${panelPosition.top}px` : "80px",
                        right: panelPosition.right > 0 ? `${panelPosition.right}px` : "16px",
                      }
                }
              >
                <div className={MOBILE_GLASS_SHEET_HEADER}>
                  <h3 id="accessibility-panel-title" className={ui.title}>
                    {t(a11yStrings.panelTitle)}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      MOBILE_GLASS_SHEET_CLOSE_BUTTON,
                      !isSheet && "text-graphite"
                    )}
                    aria-label={t(a11yStrings.closePanel)}
                  >
                    <X size={MOBILE_GLASS_SHEET_CLOSE_ICON_SIZE} aria-hidden="true" />
                  </button>
                </div>

                <p id="accessibility-panel-description" className="sr-only">
                  {t(a11yStrings.panelDescription)}
                </p>

                <div
                  role="tablist"
                  aria-label={t(a11yStrings.panelTitle)}
                  className="flex rounded-full glass-panel p-1 mb-4 gap-1 shrink-0"
                  onKeyDown={onTabKeyDown}
                >
                  <button
                    ref={wcagTabRef}
                    type="button"
                    role="tab"
                    id="tab-wcag"
                    aria-selected={activeTab === "wcag"}
                    aria-controls="panel-wcag"
                    tabIndex={activeTab === "wcag" ? 0 : -1}
                    className={`flex-1 rounded-full py-2 text-sm font-exo2 transition-all focus:ring-2 focus:ring-gold-500 focus:outline-none ${
                      activeTab === "wcag" ? ui.tabActive : ui.tabInactive
                    }`}
                    onClick={() => setActiveTab("wcag")}
                  >
                    {t(a11yStrings.tabWcag)}
                  </button>
                  <button
                    ref={advancedTabRef}
                    type="button"
                    role="tab"
                    id="tab-advanced"
                    aria-selected={activeTab === "advanced"}
                    aria-controls="panel-advanced"
                    tabIndex={activeTab === "advanced" ? 0 : -1}
                    className={`flex-1 rounded-full py-2 text-sm font-exo2 transition-all focus:ring-2 focus:ring-gold-500 focus:outline-none ${
                      activeTab === "advanced" ? ui.tabActive : ui.tabInactive
                    }`}
                    onClick={() => setActiveTab("advanced")}
                  >
                    {t(a11yStrings.tabAdvanced)}
                  </button>
                </div>

                <div className={MOBILE_GLASS_SHEET_SCROLL}>
                  {activeTab === "wcag" && (
                    <div
                      id="panel-wcag"
                      role="tabpanel"
                      aria-labelledby="tab-wcag"
                      className="space-y-5"
                    >
                      <div>
                        <p id="font-scale-label" className={ui.groupLabel}>
                          {t(a11yStrings.fontSizeGroup)}
                        </p>
                        <div
                          role="radiogroup"
                          aria-labelledby="font-scale-label"
                          className="flex flex-wrap gap-1.5"
                        >
                          {FONT_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={fontScale === opt.value}
                              className={`min-w-[2.5rem] px-2 py-2 rounded-xl text-sm font-exo2 border transition-all focus:ring-2 focus:ring-gold-500 focus:outline-none ${
                                fontScale === opt.value ? ui.chipActive : ui.chipInactive
                              }`}
                              onClick={() => setFontScale(opt.value)}
                              aria-label={t(a11yStrings[opt.ariaKey])}
                            >
                              <span aria-hidden="true">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p id="contrast-mode-label" className={ui.groupLabel}>
                          {t(a11yStrings.contrastGroup)}
                        </p>
                        <div
                          role="radiogroup"
                          aria-labelledby="contrast-mode-label"
                          className="grid grid-cols-2 gap-1.5"
                        >
                          {CONTRAST_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={contrastMode === opt.value}
                              className={`px-2 py-2 rounded-xl text-xs sm:text-sm font-exo2 border transition-all focus:ring-2 focus:ring-gold-500 focus:outline-none ${
                                contrastMode === opt.value ? ui.chipActive : ui.chipInactive
                              }`}
                              onClick={() => setContrastMode(opt.value)}
                            >
                              {t(a11yStrings[opt.labelKey])}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="flex cursor-pointer items-center justify-between gap-3">
                          <span className={ui.label}>
                            {t(a11yStrings.textSpacing)}
                          </span>
                          {renderToggle(textSpacing, () => setTextSpacing(!textSpacing), t(a11yStrings.textSpacing))}
                        </label>
                        <label className="flex cursor-pointer items-center justify-between gap-3">
                          <span className={ui.label}>
                            {t(a11yStrings.readableFont)}
                          </span>
                          {renderToggle(readableFont, () => setReadableFont(!readableFont), t(a11yStrings.readableFont))}
                        </label>
                        <label className="flex cursor-pointer items-center justify-between gap-3">
                          <span className={ui.label}>
                            {t(a11yStrings.underlineLinks)}
                          </span>
                          {renderToggle(
                            underlineLinks,
                            () => setUnderlineLinks(!underlineLinks),
                            t(a11yStrings.underlineLinks)
                          )}
                        </label>
                        <label className="flex cursor-pointer items-center justify-between gap-3">
                          <span className={ui.label}>
                            {t(a11yStrings.bigCursor)}
                          </span>
                          {renderToggle(bigCursor, () => setBigCursor(!bigCursor), t(a11yStrings.bigCursor))}
                        </label>
                        <label className="flex cursor-pointer items-center justify-between gap-3">
                          <span className={ui.label}>
                            {t(a11yStrings.readingGuide)}
                          </span>
                          {renderToggle(
                            readingGuide,
                            () => setReadingGuide(!readingGuide),
                            t(a11yStrings.readingGuide)
                          )}
                        </label>
                        <label className="flex cursor-pointer items-center justify-between gap-3">
                          <span className={ui.label}>
                            {t(a11yStrings.reducedMotion)}
                          </span>
                          {renderToggle(
                            reducedMotion,
                            () => setReducedMotion(!reducedMotion),
                            t(a11yStrings.reducedMotion)
                          )}
                        </label>
                        <label className="flex cursor-pointer items-center justify-between gap-3">
                          <span className={ui.label}>
                            {t(a11yStrings.focusHighlight)}
                          </span>
                          {renderToggle(
                            focusHighlight,
                            () => setFocusHighlight(!focusHighlight),
                            t(a11yStrings.focusHighlight)
                          )}
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={resetWcag}
                        className={cn(
                          "w-full glass-button rounded-[16px] px-4 py-2 text-sm font-exo2 transition-all hover:scale-[1.02] focus:ring-2 focus:ring-gold-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                          ui.resetBtn
                        )}
                        disabled={!isWcagAdjusted}
                      >
                        {t(a11yStrings.resetWcag)}
                      </button>
                    </div>
                  )}

                  {activeTab === "advanced" && (
                    <div
                      id="panel-advanced"
                      role="tabpanel"
                      aria-labelledby="tab-advanced"
                      className="space-y-6"
                    >
                      <div>
                        <h4 className={ui.heading}>
                          {t(a11yStrings.advancedTitle)}
                        </h4>
                        <p className={ui.description}>
                          {t(a11yStrings.advancedDescription)}
                        </p>
                      </div>

                      <div>
                        <label htmlFor={saturationId} className={cn("block", ui.groupLabel)}>
                          {t({ pl: "Saturacja", en: "Saturation" })}:{" "}
                          <span aria-live="polite">{saturation}%</span>
                        </label>
                        <GlassSlider
                          id={saturationId}
                          min={0}
                          max={200}
                          value={saturation}
                          onChange={setSaturation}
                          ariaLabel={t({ pl: "Saturacja kolorów", en: "Color saturation" })}
                          ariaValueText={`${saturation}%`}
                        />
                      </div>

                      <div>
                        <label htmlFor={hueId} className={cn("block", ui.groupLabel)}>
                          {t({ pl: "Odcień", en: "Hue" })}: <span aria-live="polite">{hue}°</span>
                        </label>
                        <GlassSlider
                          id={hueId}
                          min={0}
                          max={360}
                          value={hue}
                          onChange={setHue}
                          ariaLabel={t({ pl: "Odcień kolorów", en: "Color hue" })}
                          ariaValueText={`${hue}°`}
                        />
                      </div>

                      <div>
                        <label htmlFor={contrastId} className={cn("block", ui.groupLabel)}>
                          {t({ pl: "Kontrast (filtr)", en: "Contrast (filter)" })}:{" "}
                          <span aria-live="polite">{contrast}%</span>
                        </label>
                        <GlassSlider
                          id={contrastId}
                          min={50}
                          max={200}
                          value={contrast}
                          onChange={setContrast}
                          ariaLabel={t({ pl: "Kontrast kolorów (filtr CSS)", en: "Color contrast (CSS filter)" })}
                          ariaValueText={`${contrast}%`}
                        />
                      </div>

                      {hasLowAccessibility && (
                        <div
                          className="p-3 rounded-[16px] bg-yellow-500/20 border border-yellow-400/40 flex items-start gap-2"
                          role="alert"
                          aria-live="polite"
                        >
                          <AlertTriangle
                            size={16}
                            className="text-yellow-700 mt-0.5 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <p className={cn("text-xs font-exo2", ui.warning)}>
                            {t({
                              pl: "Niska saturacja lub kontrast filtra może utrudniać czytanie. Do realnego kontrastu użyj zakładki WCAG.",
                              en: "Low filter saturation or contrast may make text harder to read. For real contrast, use the WCAG tab.",
                            })}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="flex cursor-pointer items-center justify-between gap-3">
                          <span className={ui.label}>
                            {t({ pl: "Ukryj model 3D", en: "Hide 3D Model" })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setHideModel3D(!hideModel3D)}
                            className={`${toggleClass} ${hideModel3D ? "bg-gold-500" : "bg-white/20"}`}
                            aria-label={t({ pl: "Przełącz widoczność modelu 3D", en: "Toggle 3D model visibility" })}
                            role="switch"
                            aria-checked={hideModel3D}
                          >
                            <span
                              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                hideModel3D ? "translate-x-6" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={resetColor}
                        className={cn(
                          "w-full glass-button rounded-[16px] px-4 py-2 text-sm font-exo2 transition-all hover:scale-[1.02] focus:ring-2 focus:ring-gold-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                          ui.resetBtn
                        )}
                        disabled={!isColorAdjusted}
                      >
                        {t(a11yStrings.resetAdvanced)}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </React.Fragment>
  );
}
