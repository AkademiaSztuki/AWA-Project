"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useColorAdjustment } from '@/contexts/ColorAdjustmentContext';
import { GlassSlider } from './GlassSlider';
import { Palette, X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function ColorAdjustmentPanel() {
  const { saturation, hue, contrast, hideModel3D, setSaturation, setHue, setContrast, setHideModel3D, reset, isAdjusted } = useColorAdjustment();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Calculate panel position based on button position
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPanelPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };

    if (isOpen) {
      updatePosition();
      // Use a small timeout to ensure the DOM is stable
      const timer = setTimeout(updatePosition, 100);
      
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && firstButtonRef.current) {
      // Small delay to ensure panel is rendered
      setTimeout(() => {
        firstButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Trap focus within panel when open
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableElements = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    panel.addEventListener('keydown', handleTab);
    return () => panel.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  const saturationId = 'saturation-slider';
  const hueId = 'hue-slider';
  const contrastId = 'contrast-slider';

  const t = (pl: string, en: string) => language === 'pl' ? pl : en;

  const hasLowAccessibility = saturation < 80 || contrast < 80;

  if (!mounted) {
    return (
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all text-graphite flex-shrink-0 touch-target relative z-[110] pointer-events-auto focus:ring-2 focus:ring-gold-400 focus:outline-none"
        aria-label={t('Otwórz panel kontroli kolorów', 'Open color adjustment panel')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        type="button"
      >
        <Palette size={18} aria-hidden="true" />
      </button>
    );
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all text-graphite flex-shrink-0 touch-target relative z-[110] pointer-events-auto focus:ring-2 focus:ring-gold-400 focus:outline-none"
        aria-label={t('Otwórz panel kontroli kolorów', 'Open color adjustment panel')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        type="button"
      >
        <Palette size={18} aria-hidden="true" />
      </button>

      {/* Panel via Portal */}
      {createPortal(
        <AnimatePresence initial={false}>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
                aria-hidden="true"
              />
              
              {/* Panel Content */}
              <motion.div
                key="panel"
                ref={panelRef}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="glass-panel !fixed !z-[9999] rounded-[24px] p-4 sm:p-6 w-[min(320px,90vw)] max-w-[calc(100vw-2rem)] shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="color-panel-title"
                aria-describedby="color-panel-description"
                style={{ 
                  top: panelPosition.top > 0 ? `${panelPosition.top}px` : '80px',
                  right: panelPosition.right > 0 ? `${panelPosition.right}px` : '16px',
                  maxHeight: 'calc(100vh - 8rem)' 
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 id="color-panel-title" className="text-lg font-exo2 text-graphite">
                    {t('Kontrola kolorów', 'Color Adjustment')}
                  </h3>
                  <button
                    ref={firstButtonRef}
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-all focus:ring-2 focus:ring-gold-400 focus:outline-none"
                    aria-label={t('Zamknij panel kontroli kolorów', 'Close color adjustment panel')}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                <div id="color-panel-description" className="sr-only">
                  {t(
                    'Panel umożliwia dostosowanie saturacji, odcienia i kontrastu kolorów w całej aplikacji. Uwaga: Zmiana tych ustawień może wpłynąć na kontrast i dostępność treści.',
                    'Panel allows adjusting saturation, hue, and contrast of colors throughout the application. Note: Changing these settings may affect contrast and content accessibility.'
                  )}
                </div>

                <div className="space-y-6">
                  {/* Saturation Slider */}
                  <div>
                    <label 
                      htmlFor={saturationId}
                      className="block text-sm font-exo2 text-graphite mb-2"
                    >
                      {t('Saturacja', 'Saturation')}: <span aria-live="polite">{saturation}%</span>
                    </label>
                    <GlassSlider
                      id={saturationId}
                      min={0}
                      max={200}
                      value={saturation}
                      onChange={setSaturation}
                      ariaLabel={t('Saturacja kolorów', 'Color saturation')}
                      ariaValueText={`${saturation}%`}
                    />
                  </div>

                  {/* Hue Slider */}
                  <div>
                    <label 
                      htmlFor={hueId}
                      className="block text-sm font-exo2 text-graphite mb-2"
                    >
                      {t('Odcień', 'Hue')}: <span aria-live="polite">{hue}°</span>
                    </label>
                    <GlassSlider
                      id={hueId}
                      min={0}
                      max={360}
                      value={hue}
                      onChange={setHue}
                      ariaLabel={t('Odcień kolorów', 'Color hue')}
                      ariaValueText={`${hue}°`}
                    />
                  </div>

                  {/* Contrast Slider */}
                  <div>
                    <label 
                      htmlFor={contrastId}
                      className="block text-sm font-exo2 text-graphite mb-2"
                    >
                      {t('Kontrast', 'Contrast')}: <span aria-live="polite">{contrast}%</span>
                    </label>
                    <GlassSlider
                      id={contrastId}
                      min={50}
                      max={200}
                      value={contrast}
                      onChange={setContrast}
                      ariaLabel={t('Kontrast kolorów', 'Color contrast')}
                      ariaValueText={`${contrast}%`}
                    />
                  </div>

                  {/* Warning for low accessibility - shown below sliders */}
                  {hasLowAccessibility && (
                    <div 
                      className="p-3 rounded-[16px] bg-yellow-500/20 border border-yellow-400/40 flex items-start gap-2"
                      role="alert"
                      aria-live="polite"
                    >
                      <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <p className="text-xs font-exo2 text-graphite">
                        {t(
                          'Niska saturacja lub kontrast może wpłynąć na kontrast tekstu i dostępność treści zgodnie z WCAG.',
                          'Low saturation or contrast may affect text contrast and content accessibility according to WCAG.'
                        )}
                      </p>
                    </div>
                  )}

                  {/* Hide 3D Model Toggle */}
                  <div>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-exo2 text-graphite">
                        {t('Ukryj model 3D', 'Hide 3D Model')}
                      </span>
                      <button
                        onClick={() => setHideModel3D(!hideModel3D)}
                        className={`relative w-12 h-6 rounded-full transition-colors focus:ring-2 focus:ring-gold-400 focus:outline-none ${
                          hideModel3D ? 'bg-gold' : 'bg-white/20'
                        }`}
                        aria-label={t('Przełącz widoczność modelu 3D', 'Toggle 3D model visibility')}
                        role="switch"
                        aria-checked={hideModel3D}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            hideModel3D ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={reset}
                    className="w-full glass-button rounded-[16px] px-4 py-2 text-sm font-exo2 text-graphite transition-all hover:scale-105 focus:ring-2 focus:ring-gold-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    aria-label={t('Resetuj ustawienia kolorów do wartości domyślnych', 'Reset color settings to default values')}
                    disabled={!isAdjusted}
                  >
                    {t('Resetuj', 'Reset')}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
