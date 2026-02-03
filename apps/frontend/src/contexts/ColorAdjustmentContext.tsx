"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeLocalStorage } from '@/lib/supabase';

interface ColorAdjustmentContextType {
  saturation: number; // 0-200 (100 = normal)
  hue: number; // 0-360 (0 = normal)
  contrast: number; // 50-200 (100 = normal)
  hideModel3D: boolean; // Whether to hide the 3D model
  setSaturation: (value: number) => void;
  setHue: (value: number) => void;
  setContrast: (value: number) => void;
  setHideModel3D: (value: boolean) => void;
  reset: () => void;
  isAdjusted: boolean; // Whether colors have been adjusted from defaults
}

const ColorAdjustmentContext = createContext<ColorAdjustmentContextType | undefined>(undefined);

const COLOR_ADJUSTMENT_STORAGE_KEY = 'color_adjustment_settings';

interface StoredColorSettings {
  saturation: number;
  hue: number;
  contrast: number;
  hideModel3D: boolean;
}

const DEFAULT_SETTINGS: StoredColorSettings = {
  saturation: 100,
  hue: 0,
  contrast: 100,
  hideModel3D: false,
};

const getStoredColorSettings = (): StoredColorSettings | null => {
  if (typeof window === 'undefined') return null;
  const stored = safeLocalStorage.getItem(COLOR_ADJUSTMENT_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const parsed = JSON.parse(stored) as Partial<StoredColorSettings>;
    // Validate and merge with defaults to ensure all fields exist
    return {
      saturation: typeof parsed.saturation === 'number' ? parsed.saturation : DEFAULT_SETTINGS.saturation,
      hue: typeof parsed.hue === 'number' ? parsed.hue : DEFAULT_SETTINGS.hue,
      contrast: typeof parsed.contrast === 'number' ? parsed.contrast : DEFAULT_SETTINGS.contrast,
      hideModel3D: typeof parsed.hideModel3D === 'boolean' ? parsed.hideModel3D : DEFAULT_SETTINGS.hideModel3D,
    };
  } catch (error) {
    console.warn('[ColorAdjustmentContext] Failed to parse stored settings:', error);
    return null;
  }
};

const persistColorSettings = (settings: StoredColorSettings): void => {
  if (typeof window === 'undefined') return;
  try {
    safeLocalStorage.setItem(COLOR_ADJUSTMENT_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('[ColorAdjustmentContext] Failed to persist color settings:', error);
  }
};

export function ColorAdjustmentProvider({ children }: { children: ReactNode }) {
  // Load initial values from localStorage or use defaults
  const storedSettings = getStoredColorSettings();
  const initialSettings = storedSettings || DEFAULT_SETTINGS;
  
  const [saturation, setSaturation] = useState(initialSettings.saturation);
  const [hue, setHue] = useState(initialSettings.hue);
  const [contrast, setContrast] = useState(initialSettings.contrast);
  const [hideModel3D, setHideModel3D] = useState(initialSettings.hideModel3D);

  const isAdjusted = saturation !== 100 || hue !== 0 || contrast !== 100 || hideModel3D;

  // Apply CSS filters to html element and set inverse variables for images
  useEffect(() => {
    const html = document.documentElement;
    const saturationValue = saturation / 100;
    const hueValue = hue;
    const contrastValue = contrast / 100;
    
    // Inverse values for neutralization
    const saturationInverse = saturationValue <= 0.01 ? 1 : 1 / saturationValue;
    const contrastInverse = contrastValue <= 0.01 ? 1 : 1 / contrastValue;
    const hueInverse = -hueValue;
    
    // Apply global filter
    html.style.filter = `saturate(${saturationValue}) hue-rotate(${hueValue}deg) contrast(${contrastValue})`;
    
    // Set variables for children to use for neutralization
    html.style.setProperty('--color-adjust-saturation-inv', `${saturationInverse}`);
    html.style.setProperty('--color-adjust-contrast-inv', `${contrastInverse}`);
    html.style.setProperty('--color-adjust-hue-inv', `${hueInverse}`);
    
    if (saturation < 80 || contrast < 80) {
      html.classList.add('low-accessibility-warning');
    } else {
      html.classList.remove('low-accessibility-warning');
    }
    
    return () => {
      html.style.filter = '';
      html.style.removeProperty('--color-adjust-saturation-inv');
      html.style.removeProperty('--color-adjust-contrast-inv');
      html.style.removeProperty('--color-adjust-hue-inv');
      html.classList.remove('low-accessibility-warning');
    };
  }, [saturation, hue, contrast]);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    persistColorSettings({
      saturation,
      hue,
      contrast,
      hideModel3D,
    });
  }, [saturation, hue, contrast, hideModel3D]);

  const reset = () => {
    setSaturation(DEFAULT_SETTINGS.saturation);
    setHue(DEFAULT_SETTINGS.hue);
    setContrast(DEFAULT_SETTINGS.contrast);
    setHideModel3D(DEFAULT_SETTINGS.hideModel3D);
    // Settings will be persisted automatically via useEffect
  };

  return (
    <ColorAdjustmentContext.Provider
      value={{
        saturation,
        hue,
        contrast,
        hideModel3D,
        setSaturation,
        setHue,
        setContrast,
        setHideModel3D,
        reset,
        isAdjusted,
      }}
    >
      {children}
    </ColorAdjustmentContext.Provider>
  );
}

export function useColorAdjustment() {
  const context = useContext(ColorAdjustmentContext);
  if (context === undefined) {
    throw new Error('useColorAdjustment must be used within a ColorAdjustmentProvider');
  }
  return context;
}
