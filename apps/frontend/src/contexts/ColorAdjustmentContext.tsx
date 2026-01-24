"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

export function ColorAdjustmentProvider({ children }: { children: ReactNode }) {
  const [saturation, setSaturation] = useState(100);
  const [hue, setHue] = useState(0);
  const [contrast, setContrast] = useState(100);
  const [hideModel3D, setHideModel3D] = useState(false);

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

  const reset = () => {
    setSaturation(100);
    setHue(0);
    setContrast(100);
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
