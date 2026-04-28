'use client';

import SimpleBar from 'simplebar-react';
import { cn } from '@/lib/utils';

type Variant = 'flexFill' | 'auto';

export interface AwaScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  /**
   * flexFill: grow inside flex parent with a definite size (e.g. RoomSetup). On card roots
   * with only min-h/max-h, it can collapse. auto: size from content + max-h-full (e.g. GlassCard scrollable).
   */
  variant?: Variant;
  /** When true, thumb stays faint until scroll/hover (SimpleBar). */
  autoHide?: boolean;
}

export function AwaScrollArea({
  children,
  className,
  variant = 'flexFill',
  autoHide = true,
}: AwaScrollAreaProps) {
  return (
    <SimpleBar
      className={cn(
        'awa-simplebar min-w-0',
        variant === 'flexFill' && 'h-0 min-h-0 flex-1 basis-0',
        variant === 'auto' && 'max-h-full',
        className
      )}
      autoHide={autoHide}
    >
      {children}
    </SimpleBar>
  );
}
