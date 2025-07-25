"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'interactive' | 'highlighted';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default'
}) => {
  const variants = {
    default: 'glass-panel rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl',
    interactive: 'glass-panel hover:bg-gold-400/10 hover:border-gold-300/50 cursor-pointer transition-all duration-300 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl',
    highlighted: 'glass-panel border-gold-400/60 bg-gold-400/5 rounded-[48px] backdrop-blur-xl border shadow-xl'
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