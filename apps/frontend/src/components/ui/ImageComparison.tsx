"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ZoomIn, Download, Maximize2 } from 'lucide-react';

interface ImageComparisonProps {
  imageA: {
    url: string;
    label: string;
  };
  imageB: {
    url: string;
    label: string;
  };
  onClose: () => void;
}

export const ImageComparison: React.FC<ImageComparisonProps> = ({
  imageA,
  imageB,
  onClose,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="md:glass-panel p-6 rounded-3xl max-w-6xl w-full"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-nasalization text-gray-800">Porównaj Obrazy</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            ×
          </button>
        </div>

        <div
          className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize"
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onMouseMove={handleMouseMove}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          onTouchMove={handleTouchMove}
        >
          {/* Image A (full) */}
          <div className="absolute inset-0">
            <Image
              src={imageA.url}
              alt={imageA.label}
              fill
              className="object-cover"
            />
          </div>

          {/* Image B (clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <Image
              src={imageB.url}
              alt={imageB.label}
              fill
              className="object-cover"
            />
          </div>

          {/* Slider handle */}
          <div
            className="absolute inset-y-0 w-1 bg-white shadow-2xl"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center">
              <div className="flex gap-1">
                <div className="w-1 h-6 bg-gray-400 rounded"></div>
                <div className="w-1 h-6 bg-gray-400 rounded"></div>
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
            <p className="text-white text-sm font-modern">{imageA.label}</p>
          </div>
          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
            <p className="text-white text-sm font-modern">{imageB.label}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <p className="text-sm text-gray-600 font-modern">
            Przeciągnij suwak aby porównać obrazy
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ImageComparison;

