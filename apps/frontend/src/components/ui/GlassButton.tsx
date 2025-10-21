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
    primary: 'glass-button text-gold-700 hover:text-gold-800 font-medium bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl',
    secondary: 'bg-silver-400/20 backdrop-blur-xl border border-white/20 text-gray-700 hover:bg-silver-300/30 shadow-xl',
    subtle: 'bg-pearl-100/10 backdrop-blur-xl border border-pearl-200/30 text-gray-600 hover:bg-pearl-200/20 shadow-xl'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      className={cn(
        'rounded-[32px] transition-all duration-300 font-nasalization',
        'flex items-center justify-center gap-2',
        'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
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