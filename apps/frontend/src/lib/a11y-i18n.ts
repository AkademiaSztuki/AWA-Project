import type { LocalizedText } from "@/lib/questions/validated-scales";

export const a11yStrings = {
  openPanel: {
    pl: "Otwórz ustawienia dostępności",
    en: "Open accessibility settings",
  } satisfies LocalizedText,
  closePanel: {
    pl: "Zamknij panel dostępności",
    en: "Close accessibility panel",
  } satisfies LocalizedText,
  panelTitle: {
    pl: "Ustawienia dostępności",
    en: "Accessibility settings",
  } satisfies LocalizedText,
  panelDescription: {
    pl: "Dostosuj rozmiar tekstu, kontrast i inne opcje zgodne z WCAG 2.1. Zakładka Zaawansowane zawiera dodatkowe filtry kolorów.",
    en: "Adjust text size, contrast, and other WCAG 2.1 options. The Advanced tab contains optional color filters.",
  } satisfies LocalizedText,
  tabWcag: {
    pl: "WCAG",
    en: "WCAG",
  } satisfies LocalizedText,
  tabAdvanced: {
    pl: "Zaawansowane",
    en: "Advanced",
  } satisfies LocalizedText,
  fontSizeGroup: {
    pl: "Rozmiar tekstu",
    en: "Text size",
  } satisfies LocalizedText,
  contrastGroup: {
    pl: "Kontrast",
    en: "Contrast",
  } satisfies LocalizedText,
  contrastNormal: {
    pl: "Normalny",
    en: "Normal",
  } satisfies LocalizedText,
  contrastHigh: {
    pl: "Wysoki",
    en: "High",
  } satisfies LocalizedText,
  contrastNegative: {
    pl: "Negatyw",
    en: "Negative",
  } satisfies LocalizedText,
  contrastGrayscale: {
    pl: "Skala szarości",
    en: "Grayscale",
  } satisfies LocalizedText,
  textSpacing: {
    pl: "Odstępy tekstu (WCAG 1.4.12)",
    en: "Text spacing (WCAG 1.4.12)",
  } satisfies LocalizedText,
  readableFont: {
    pl: "Czytelny font",
    en: "Readable font",
  } satisfies LocalizedText,
  underlineLinks: {
    pl: "Podkreślanie linków",
    en: "Underline links",
  } satisfies LocalizedText,
  bigCursor: {
    pl: "Większy kursor",
    en: "Larger cursor",
  } satisfies LocalizedText,
  readingGuide: {
    pl: "Przewodnik czytania",
    en: "Reading guide",
  } satisfies LocalizedText,
  reducedMotion: {
    pl: "Redukcja animacji",
    en: "Reduce motion",
  } satisfies LocalizedText,
  focusHighlight: {
    pl: "Wzmocniony fokus",
    en: "Stronger focus",
  } satisfies LocalizedText,
  resetWcag: {
    pl: "Resetuj WCAG",
    en: "Reset WCAG",
  } satisfies LocalizedText,
  resetAdvanced: {
    pl: "Resetuj zaawansowane",
    en: "Reset advanced",
  } satisfies LocalizedText,
  advancedTitle: {
    pl: "Filtry kolorów (dodatkowe)",
    en: "Color filters (optional)",
  } satisfies LocalizedText,
  advancedDescription: {
    pl: "Suwaki zmieniają wygląd całej strony przez filtry CSS — to nie zastępuje trybu wysokiego kontrastu z zakładki WCAG.",
    en: "Sliders change the whole page via CSS filters — this does not replace high contrast mode from the WCAG tab.",
  } satisfies LocalizedText,
  fontScaleXs: {
    pl: "Bardzo mały tekst",
    en: "Extra small text",
  } satisfies LocalizedText,
  fontScaleSm: {
    pl: "Domyślny rozmiar",
    en: "Default size",
  } satisfies LocalizedText,
  fontScaleMd: {
    pl: "Większy tekst",
    en: "Larger text",
  } satisfies LocalizedText,
  fontScaleLg: {
    pl: "Duży tekst",
    en: "Large text",
  } satisfies LocalizedText,
  fontScaleXl: {
    pl: "Bardzo duży tekst",
    en: "Extra large text",
  } satisfies LocalizedText,
} as const;
