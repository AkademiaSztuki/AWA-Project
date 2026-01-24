"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'interactive' | 'highlighted' | 'flat' | 'flatOnMobile' | 'glass';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default'
}) => {
  const variants = {
    // default oraz flatOnMobile są płaskie na telefonie/tablecie (poniżej 1280px)
    default: 'rounded-2xl xl:glass-panel xl:bg-white/10 xl:backdrop-blur-xl xl:border xl:border-white/20 xl:shadow-xl',
    flatOnMobile: 'rounded-2xl xl:glass-panel xl:bg-white/10 xl:backdrop-blur-xl xl:border xl:border-white/20 xl:shadow-xl',
    
    // interactive oraz highlighted ZAWSZE mają szklany panel (nawet na mobile)
    interactive: 'glass-panel hover:bg-gold-400/10 hover:border-gold-300/50 cursor-pointer transition-all duration-300 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl',
    highlighted: 'glass-panel border-gold-400/60 bg-gold-400/5 rounded-2xl backdrop-blur-xl border shadow-xl',
    
    // glass ZAWSZE ma szklany panel
    glass: 'glass-panel bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl',
    
    flat: 'rounded-2xl'
  };

  return (
    <div className={cn(
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
};