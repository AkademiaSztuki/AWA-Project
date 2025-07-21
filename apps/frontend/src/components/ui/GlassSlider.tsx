import React from 'react';
import { cn } from '@/lib/utils';

interface GlassSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  leftLabel?: string;
  rightLabel?: string;
}

export const GlassSlider: React.FC<GlassSliderProps> = ({
  value,
  onChange,
  min = 1,
  max = 7,
  step = 1,
  label,
  leftLabel,
  rightLabel
}) => {
  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700 font-modern">
          {label}
        </label>
      )}

      <div className="glass-slider rounded-lg p-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2 font-modern">
          {leftLabel && <span>{leftLabel}</span>}
          {rightLabel && <span>{rightLabel}</span>}
        </div>

        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-silver-300/30 rounded-lg appearance-none cursor-pointer slider"
          />

          <div className="flex justify-between text-xs text-gold-600 mt-2 font-modern font-medium">
            {Array.from({ length: max - min + 1 }, (_, i) => (
              <span key={i} className={value === min + i ? 'text-gold-700 font-bold' : ''}>
                {min + i}
              </span>
            ))}
          </div>
        </div>

        <div className="text-center mt-2">
          <span className="text-lg font-bold text-gold-600 font-futuristic">
            {value}
          </span>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #FFD700;
          border: 2px solid #F7E7CE;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #FFD700;
          border: 2px solid #F7E7CE;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
        }
      `}</style>
    </div>
  );
};