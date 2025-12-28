"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PRSMoodGridData, PRS_MOOD_GRID_CONFIG } from '@/lib/questions/validated-scales';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';

interface MoodGridProps {
  initialPosition?: PRSMoodGridData;
  onPositionChange: (position: PRSMoodGridData) => void;
  question?: string;  // Override default question
  mode?: 'current' | 'target' | 'design';  // Visual styling hints
  className?: string;
}

/**
 * MoodGrid - 2D Spatial PRS Testing Component
 * 
 * Research: Perceived Restorativeness Scale adapted as spatial mapping
 * X-axis: Energizing (-1) ←→ Calming (+1)
 * Y-axis: Boring (-1) ←→ Inspiring (+1)
 * 
 * User clicks on grid to indicate where room is/should be/design is
 */
export function MoodGrid({
  initialPosition,
  onPositionChange,
  question,
  mode = 'current',
  className = ''
}: MoodGridProps) {
  const { t, language } = useLanguage();
  const [position, setPosition] = useState<PRSMoodGridData>(
    initialPosition || { x: 0, y: 0 }
  );
  const [hasClicked, setHasClicked] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState(400);

  const config = PRS_MOOD_GRID_CONFIG;

  // Update grid size based on actual rendered size
  useEffect(() => {
    const updateGridSize = () => {
      if (gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        setGridSize(rect.width);
      }
    };

    updateGridSize();
    window.addEventListener('resize', updateGridSize);
    return () => window.removeEventListener('resize', updateGridSize);
  }, []);

  const handleGridClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert pixel coordinates to -1:1 range
    const normalizedX = (x / rect.width) * 2 - 1;  // 0-width → -1 to 1
    const normalizedY = 1 - (y / rect.height) * 2;  // 0-height → 1 to -1 (inverted)

    // Clamp to bounds
    const clampedX = Math.max(-1, Math.min(1, normalizedX));
    const clampedY = Math.max(-1, Math.min(1, normalizedY));

    const newPosition = { x: clampedX, y: clampedY };
    setPosition(newPosition);
    setHasClicked(true);
    onPositionChange(newPosition);
  };

  // Convert -1:1 position to pixel coordinates for display
  const getPixelPosition = (pos: PRSMoodGridData, size: number) => {
    return {
      x: ((pos.x + 1) / 2) * size,
      y: ((1 - pos.y) / 2) * size
    };
  };

  const pixelPos = getPixelPosition(position, gridSize);

  // Mode-specific styling
  const modeColors = {
    current: 'bg-blue-500/70',
    target: 'bg-green-500/70',
    design: 'bg-gold-500/70'
  };

  const markerColor = modeColors[mode];

  return (
    <GlassCard className={`p-6 ${className}`}>
      {/* Question */}
      <div className="mb-6 text-center">
        <h3 className="text-xl lg:text-2xl font-nasalization text-gray-800 mb-2">
          {question || t(config.axes.x.label)}
        </h3>
        {!hasClicked && (
          <p className="text-sm text-gray-600 font-modern">
            {language === 'pl' 
              ? 'Kliknij w miejsce na mapie które odpowiada Twojemu pokojowi' 
              : 'Click on the map where your room belongs'}
          </p>
        )}
      </div>

      {/* Grid Container */}
      <div className="flex flex-col items-center w-full max-w-[500px] mx-auto">
        {/* Y-axis label (top) */}
        <div className="text-sm font-modern text-graphite font-semibold mb-3 text-center">
          {t(config.axes.y.labels.max)}
        </div>

        <div className="flex items-center justify-center gap-1 sm:gap-3 w-full">
          {/* X-axis label (left) */}
          <div className="text-sm font-modern text-graphite font-semibold w-12 sm:w-20 text-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            {t(config.axes.x.labels.min)}
          </div>

          {/* Main Grid */}
          <div className="relative flex-shrink-0 w-full max-w-[400px] aspect-square">
            <div
              ref={gridRef}
              className="relative bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-sm border-2 border-white/30 rounded-lg cursor-crosshair overflow-hidden shadow-lg w-full h-full"
              onClick={handleGridClick}
            >
              {/* Quadrant lines */}
              <div className="absolute top-0 left-1/2 w-px h-full bg-white/30" />
              <div className="absolute top-1/2 left-0 w-full h-px bg-white/30" />

              {/* Subtle gradient overlays for quadrants */}
              <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-green-200/10" />
              <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-200/10" />
              <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-yellow-200/10" />
              <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-purple-200/10" />

              {/* Position marker */}
              {hasClicked && (
                <div
                  className={`absolute w-6 h-6 ${markerColor} rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200`}
                  style={{
                    left: pixelPos.x,
                    top: pixelPos.y
                  }}
                >
                  {/* Ripple effect */}
                  <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-current" />
                </div>
              )}

              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-gray-400 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* X-axis label (right) */}
          <div className="text-sm font-modern text-graphite font-semibold w-12 sm:w-20 text-center" style={{ writingMode: 'vertical-lr' }}>
            {t(config.axes.x.labels.max)}
          </div>
        </div>

        {/* Y-axis label (bottom) */}
        <div className="text-sm font-modern text-graphite font-semibold mt-3 text-center">
          {t(config.axes.y.labels.min)}
        </div>
      </div>

      {/* Selected position display */}
      {hasClicked && (
        <div className="mt-6 text-center">
          <div className="inline-block glass-panel px-4 py-2 rounded-full">
            <p className="text-sm font-modern text-gray-700">
              {language === 'pl' ? 'Wybrana pozycja:' : 'Selected position:'}
              <span className="ml-2 font-semibold">
                {getPositionLabel(position, language)}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="mt-4 text-xs text-center text-gray-500 font-modern">
        {language === 'pl' 
          ? 'Ta mapa pomaga nam zrozumieć jaki nastrój i energię chcesz w swoim pokoju' 
          : 'This map helps us understand the mood and energy you want in your room'}
      </div>
    </GlassCard>
  );
}

/**
 * Helper to get human-readable position label
 */
function getPositionLabel(position: PRSMoodGridData, language: 'pl' | 'en'): string {
  const { x, y } = position;

  // Determine X descriptor
  let xDesc = '';
  if (x < -0.33) {
    xDesc = language === 'pl' ? 'Energetyzujący' : 'Energizing';
  } else if (x > 0.33) {
    xDesc = language === 'pl' ? 'Uspokajający' : 'Calming';
  } else {
    xDesc = language === 'pl' ? 'Zbalansowany' : 'Balanced';
  }

  // Determine Y descriptor
  let yDesc = '';
  if (y < -0.33) {
    yDesc = language === 'pl' ? 'Spokojny' : 'Quiet';
  } else if (y > 0.33) {
    yDesc = language === 'pl' ? 'Inspirujący' : 'Inspiring';
  } else {
    yDesc = language === 'pl' ? 'Neutralny' : 'Neutral';
  }

  return `${xDesc} & ${yDesc}`;
}

/**
 * Helper component to show comparison of pre/post positions
 */
interface MoodGridComparisonProps {
  prePosition: PRSMoodGridData;
  postPosition: PRSMoodGridData;
  className?: string;
}

export function MoodGridComparison({
  prePosition,
  postPosition,
  className = ''
}: MoodGridComparisonProps) {
  const { t, language } = useLanguage();
  const config = PRS_MOOD_GRID_CONFIG;
  const gridSize = 300;

  const getPixelPosition = (pos: PRSMoodGridData) => {
    return {
      x: ((pos.x + 1) / 2) * gridSize,
      y: ((1 - pos.y) / 2) * gridSize
    };
  };

  const prePixel = getPixelPosition(prePosition);
  const postPixel = getPixelPosition(postPosition);

  // Calculate improvement
  const improvement = {
    x: postPosition.x - prePosition.x,
    y: postPosition.y - prePosition.y
  };

  const totalImprovement = Math.sqrt(improvement.x ** 2 + improvement.y ** 2);
  const improvementPercent = Math.round((totalImprovement / 2.83) * 100); // 2.83 = diagonal of grid

  return (
    <GlassCard className={`p-6 ${className}`}>
      <h3 className="text-xl font-nasalization text-gray-800 mb-4 text-center">
        {language === 'pl' ? 'Porównanie: Przed i Po' : 'Comparison: Before and After'}
      </h3>

      <div className="relative" style={{ width: gridSize, height: gridSize }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-sm border-2 border-white/30 rounded-lg">
          {/* Grid lines */}
          <div className="absolute top-0 left-1/2 w-px h-full bg-white/30" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/30" />

          {/* Pre position (blue) */}
          <div
            className="absolute w-5 h-5 bg-blue-500/70 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: prePixel.x, top: prePixel.y }}
          />

          {/* Post position (green) */}
          <div
            className="absolute w-5 h-5 bg-green-500/70 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: postPixel.x, top: postPixel.y }}
          />

          {/* Arrow showing movement */}
          <svg className="absolute inset-0 pointer-events-none" width={gridSize} height={gridSize}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
              </marker>
            </defs>
            <line
              x1={prePixel.x}
              y1={prePixel.y}
              x2={postPixel.x}
              y2={postPixel.y}
              stroke="#10b981"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span className="text-sm font-modern text-gray-700">
            {language === 'pl' ? 'Przed' : 'Before'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-sm font-modern text-gray-700">
            {language === 'pl' ? 'Po' : 'After'}
          </span>
        </div>
      </div>

      {/* Improvement metric */}
      <div className="mt-4 text-center">
        <div className="glass-panel px-4 py-2 rounded-full inline-block">
          <p className="text-sm font-modern">
            {language === 'pl' ? 'Poprawa:' : 'Improvement:'}{' '}
            <span className="font-semibold text-green-600">{improvementPercent}%</span>
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

