"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { AwaScrollArea } from '@/components/ui/AwaScrollArea';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'interactive' | 'highlighted' | 'flat' | 'flatOnMobile' | 'glass';
  /**
   * Custom overlay scrollbar (no OS arrows / accent). Uses AwaScrollArea variant=auto so it does not
   * collapse when the card only has min-h/max-h (unbounded flex-1 would yield 0 height).
   */
  scrollable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default',
  scrollable = false,
}) => {
  const variants = {
    // default oraz flatOnMobile są płaskie na telefonie/tablecie (poniżej 1280px)
    default: 'rounded-2xl xl:glass-panel xl:bg-white/10 xl:backdrop-blur-xl xl:border xl:border-white/20 xl:shadow-xl',
    flatOnMobile: 'rounded-2xl xl:glass-panel xl:bg-white/10 xl:backdrop-blur-xl xl:border xl:border-white/20 xl:shadow-xl',
    
    // interactive oraz highlighted ZAWSZE mają szklany panel (nawet na mobile)
    interactive:
      'glass-panel cursor-pointer rounded-xl sm:rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-xl transition-all duration-300 ease-out hover:scale-[1.01] hover:border-gold-400/45 hover:bg-gold-400/12 hover:shadow-[0_0_36px_-10px_rgba(255,229,92,0.35)]',
    highlighted:
      'glass-panel cursor-pointer rounded-xl sm:rounded-2xl border border-gold-400/60 bg-gold-400/5 shadow-xl backdrop-blur-xl transition-all duration-300 ease-out hover:scale-[1.01] hover:border-gold-400/85 hover:bg-gold-400/12 hover:shadow-[0_0_40px_-8px_rgba(255,229,92,0.42)]',
    
    // glass ZAWSZE ma szklany panel
    glass: 'glass-panel bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl',
    
    flat: 'rounded-2xl'
  };

  return (
    <div
      className={cn(
        variants[variant],
        scrollable && 'flex min-h-0 min-w-0 flex-col overflow-hidden',
        className
      )}
    >
      {scrollable ? (
        <AwaScrollArea className="w-full min-w-0" variant="auto" autoHide>
          {children}
        </AwaScrollArea>
      ) : (
        children
      )}
    </div>
  );
};