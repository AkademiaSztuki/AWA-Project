"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface GlassAccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const GlassAccordion: React.FC<GlassAccordionProps> = ({
  title,
  children,
  defaultOpen = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-semibold text-graphite font-modern">
          {title}
        </span>
        <ChevronDown
          size={20}
          className={cn(
            'text-gold transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 pt-2 text-sm text-graphite font-modern space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
};

