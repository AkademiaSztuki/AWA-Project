"use client";

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wand2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface GenerationNode {
  id: string;
  type: 'initial' | 'micro' | 'macro';
  label: string;
  timestamp: number;
  imageUrl: string;
}

interface GenerationHistoryProps {
  history: GenerationNode[];
  currentIndex: number;
  onNodeClick: (index: number) => void;
}

export const GenerationHistory: React.FC<GenerationHistoryProps> = ({
  history,
  currentIndex,
  onNodeClick,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  if (history.length === 0) return null;

  // Check scroll position
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [history]);

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'initial':
        return <Wand2 size={14} />;
      case 'micro':
        return <RefreshCw size={14} />;
      case 'macro':
        return <Wand2 size={14} />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'initial':
        return 'from-silver-400 to-platinum-100';
      case 'micro':
        return 'from-champagne to-gold-400';
      case 'macro':
        return 'from-gold-500 to-gold-600';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="md:glass-panel p-4 rounded-2xl">
      <h3 className="text-sm font-nasalization text-gray-700 mb-3">Historia Generacji</h3>
      
      <div className="relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all shadow-lg"
            aria-label="Przewiń w lewo"
          >
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
        )}
        
        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all shadow-lg"
            aria-label="Przewiń w prawo"
          >
            <ChevronRight size={20} className="text-gray-700" />
          </button>
        )}
        
        <div 
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {history.map((node, index) => (
          <React.Fragment key={node.id}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNodeClick(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-gold shadow-lg'
                  : 'border-white/20 hover:border-gold/50'
              }`}
            >
              <div className="relative w-full h-full bg-white/5">
                {node.imageUrl ? (
                  <img
                    src={node.imageUrl}
                    alt={node.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Failed to load image:', node.imageUrl);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10">
                    <span className="text-xs text-silver-dark">Brak obrazu</span>
                  </div>
                )}
                
                {/* Type badge */}
                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-r ${getTypeColor(node.type)} p-1 flex items-center justify-center gap-1`}>
                  <span className="text-white text-[8px]">
                    {getTypeIcon(node.type)}
                  </span>
                </div>
              </div>
            </motion.button>
            
            {index < history.length - 1 && (
              <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-600 font-modern">
        <p>Krok {currentIndex + 1} z {history.length}</p>
        <p className="text-gray-500">{history[currentIndex]?.label}</p>
      </div>
    </div>
  );
};

export default GenerationHistory;

