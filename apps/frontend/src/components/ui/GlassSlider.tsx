"use client";

import React, { useState } from 'react';

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
  const percentage = ((value - min) / (max - min)) * 100;
  const thumbWidth = 48; // w-12 = 12 * 4px
  const thumbHalf = thumbWidth / 2; // 24px
  
  // Oblicz pozycję tak żeby thumb był dokładnie na krawędziach
  const leftPosition = `calc(${percentage}% - ${percentage / 100 * thumbWidth}px)`;

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

  return (
    <div className={`relative ${className} min-h-[20px] w-full`}>
      {/* Glass container - pill-shaped like GlassSurface buttons */}
      <div className="relative w-full h-5 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-[20px] overflow-visible">
        {/* Track background */}
        <div className="absolute inset-0 bg-black/10 rounded-[20px]" aria-hidden="true"></div>
        
        {/* Progress track - bardziej przezroczysty */}
        <div 
          className="absolute top-1/2 transform -translate-y-1/2 h-1.5 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        ></div>
        
        {/* Slider thumb - styled like bottom buttons */}
        <div 
          className={`absolute top-1/2 transform -translate-y-1/2 w-12 h-4 bg-white/40 backdrop-blur-xl border border-white/50 shadow-xl rounded-[16px] pointer-events-none transition-all duration-300 ease-in-out ${
            isDragging ? 'scale-110 border-gold/60 ring-2 ring-gold-400' : ''
          }`}
          style={{ left: leftPosition }}
          aria-hidden="true"
        >
        </div>
        
        {/* Accessible input */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => handleChange(parseInt(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          className="glass-slider-input absolute inset-0 w-full h-full cursor-pointer focus:outline-none z-10"
          style={{
            WebkitAppearance: 'none',
            appearance: 'none',
            background: 'transparent',
            outline: 'none',
            margin: 0,
            padding: 0,
          }}
          onFocus={(e) => {
            e.target.blur();
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
