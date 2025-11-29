"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Wand2, Sparkles, CheckCircle } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface LoadingProgressProps {
  currentStage: 1 | 2 | 3;
  message: string;
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // seconds
  onCancel?: () => void;
}

const STAGE_CONFIG = {
  1: {
    icon: Wand2,
    title: "Przygotowuję środowisko AI",
    color: "from-silver-400 to-platinum-100",
    bgColor: "from-silver-500/20 to-platinum-100/20",
  },
  2: {
    icon: Sparkles,
    title: "Generuję wizualizacje",
    color: "from-gold-400 to-champagne",
    bgColor: "from-gold-500/20 to-champagne/20",
  },
  3: {
    icon: CheckCircle,
    title: "Finalizuję obrazy",
    color: "from-gold-500 to-gold-600",
    bgColor: "from-gold-500/20 to-gold-600/20",
  },
};

export const LoadingProgress: React.FC<LoadingProgressProps> = ({
  currentStage,
  message,
  progress,
  estimatedTimeRemaining,
  onCancel,
}) => {
  const config = STAGE_CONFIG[currentStage];
  const Icon = config.icon;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <GlassCard className="p-8 rounded-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stage indicator */}
          <div className="flex justify-center items-center gap-4">
          {[1, 2, 3].map((stage) => {
            const stageConfig = STAGE_CONFIG[stage as 1 | 2 | 3];
            const StageIcon = stageConfig.icon;
            const isActive = stage === currentStage;
            const isCompleted = stage < currentStage;
            
            return (
              <div key={stage} className="flex items-center">
                <motion.div
                  animate={{
                    scale: isActive ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: isActive ? Infinity : 0,
                  }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isCompleted 
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600' 
                      : isActive
                      ? `bg-gradient-to-r ${stageConfig.bgColor}`
                      : 'bg-white/10'
                  }`}
                >
                  <StageIcon 
                    className={`${
                      isCompleted || isActive ? 'text-white' : 'text-white/40'
                    }`} 
                    size={24} 
                  />
                </motion.div>
                
                {stage < 3 && (
                  <div className={`w-16 h-1 mx-2 rounded-full ${
                    isCompleted ? 'bg-gold-500' : 'bg-white/20'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

          {/* Current stage title */}
          <motion.h3
            key={currentStage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-2xl font-nasalization text-center text-transparent bg-clip-text bg-gradient-to-r ${config.color}`}
          >
            {config.title}
          </motion.h3>

          {/* Message */}
          <p className="text-center text-gray-700 font-modern text-lg">
            {message}
          </p>

          {/* Progress bar */}
          <div className="relative w-full h-3 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${config.color} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Animated shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ width: '50%' }}
          />
        </div>

          {/* Progress percentage */}
          <div className="flex justify-between items-center text-sm text-gray-600">
          <span className="font-modern">{Math.round(progress)}%</span>
          {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
            <span className="font-modern">
              ~{estimatedTimeRemaining}s pozostało
            </span>
          )}
        </div>

          {/* Particles animation */}
          <div className="flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -10, 0],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-2 h-2 rounded-full bg-gold-500"
            />
          ))}
        </div>

          {/* Cancel button */}
          {onCancel && (
            <div className="flex justify-center">
              <button
                onClick={onCancel}
                className="px-6 py-2 text-sm font-modern text-gray-600 hover:text-gray-800 transition-colors"
              >
                Anuluj generowanie
              </button>
            </div>
          )}
        </motion.div>
      </GlassCard>
    </div>
  );
};

export default LoadingProgress;

