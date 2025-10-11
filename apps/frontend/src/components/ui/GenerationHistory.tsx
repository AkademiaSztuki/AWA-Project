"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wand2, RefreshCw } from 'lucide-react';

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
  if (history.length === 0) return null;

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
        return 'from-blue-400 to-cyan-400';
      case 'micro':
        return 'from-purple-400 to-pink-400';
      case 'macro':
        return 'from-orange-400 to-red-400';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="glass-panel p-4 rounded-2xl">
      <h3 className="text-sm font-nasalization text-gray-700 mb-3">Historia Generacji</h3>
      
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
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
              <div className="relative w-full h-full">
                <img
                  src={node.imageUrl}
                  alt={node.label}
                  className="w-full h-full object-cover"
                />
                
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
      
      <div className="mt-3 text-xs text-gray-600 font-modern">
        <p>Krok {currentIndex + 1} z {history.length}</p>
        <p className="text-gray-500">{history[currentIndex]?.label}</p>
      </div>
    </div>
  );
};

export default GenerationHistory;

