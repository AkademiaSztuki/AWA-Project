"use client";

import React, { useState, useRef } from 'react';

interface GlassSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export const GlassSlider: React.FC<GlassSliderProps> = ({
  min,
  max,
  value,
  onChange,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const percentage = ((value - min) / (max - min)) * 100;
  const thumbWidth = 64; // w-16 = 16 * 4px
  const thumbHalf = thumbWidth / 2; // 32px
  
  // Oblicz pozycję tak żeby thumb był dokładnie na krawędziach
  const leftPosition = percentage === 0 ? 0 : percentage === 100 ? `calc(100% - ${thumbWidth}px)` : `calc(${percentage}% - ${thumbHalf}px)`;

  const handleChange = (newValue: number) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    onChange(newValue);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Glass container - pill-shaped like GlassSurface buttons */}
      <div className="relative w-full h-10 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-[32px] overflow-hidden">
        {/* Track background */}
        <div className="absolute inset-0 bg-black/10 rounded-[32px]"></div>
        
        {/* Progress track */}
        <div 
          className="absolute top-1/2 transform -translate-y-1/2 h-3 bg-gradient-to-r from-gold/60 to-gold/40 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        ></div>
        
        {/* Slider thumb - styled like bottom buttons */}
        <div 
          className={`absolute top-1/2 transform -translate-y-1/2 w-16 h-9 bg-white/20 backdrop-blur-xl border border-white/30 shadow-xl rounded-[32px] cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 focus:ring-2 focus:ring-gold-400 ${
            isDragging ? 'scale-110 border-gold/60 ring-2 ring-gold/400' : ''
          }`}
          style={{ left: leftPosition }}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
        </div>
        
        {/* Hidden input for accessibility */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => handleChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      
      {/* Scale markers - only show when user has interacted */}
      <div className="flex justify-between mt-2 px-2">
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((mark) => (
          <div key={mark} className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
              hasInteracted && mark <= value 
                ? 'bg-gold shadow-[0_0_8px_3px_rgba(251,191,36,0.6)]' 
                : 'bg-white/20'
            }`}></div>
            <span className="text-xs text-gray-500 mt-1 font-exo2">{mark}</span>
          </div>
        ))}
      </div>
    </div>
  );
};