"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  const variants = {
    primary: 'glass-button font-medium',
    secondary:
      'bg-silver-400/20 backdrop-blur-xl border border-white/20 text-gray-700 transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-silver-300/35 hover:border-white/35 hover:shadow-[0_0_20px_-8px_rgba(255,255,255,0.2)]',
    subtle:
      'bg-pearl-100/10 backdrop-blur-xl border border-pearl-200/30 text-gray-600 transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-pearl-100/25 hover:border-pearl-200/50'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm min-h-[40px]',
    md: 'px-6 py-3 text-base min-h-[48px]',
    lg: 'px-8 py-4 text-lg min-h-[56px]'
  };

  return (
    <button
      className={cn(
        'rounded-[32px] transition-all duration-300 font-nasalization',
        'flex items-center justify-center gap-2',
        'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};