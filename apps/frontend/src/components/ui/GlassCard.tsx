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
    default: 'glass-panel',
    interactive: 'glass-panel hover:bg-gold-400/10 hover:border-gold-300/50 cursor-pointer transition-all duration-300',
    highlighted: 'glass-panel border-gold-400/60 bg-gold-400/5'
  };

  return (
    <div className={cn(
      'rounded-lg p-6',
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
};