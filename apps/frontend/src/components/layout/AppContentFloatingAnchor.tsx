'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  APP_CONTENT_FRAME_PADDING_X,
  APP_CONTENT_MAX_WIDTH,
  APP_CONTENT_RIGHT_COLUMN,
  APP_CONTENT_XL_GRID,
} from '@/lib/app-content-grid';

type AppContentFloatingAnchorProps = {
  children: ReactNode;
  /** Extra classes on the fixed viewport shell (e.g. z-index). */
  className?: string;
  /** Horizontal inset on the right column to match page content padding. */
  columnClassName?: string;
};

/**
 * Fixed bottom slot aligned with `AppContentFrame` xl grid (sidebar + content column).
 * Centers children in the 0.7fr content band — not the full viewport.
 */
export function AppContentFloatingAnchor({
  children,
  className,
  columnClassName,
}: AppContentFloatingAnchorProps) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-4 z-40 sm:bottom-6',
        className,
      )}
    >
      <div className={APP_CONTENT_FRAME_PADDING_X}>
        <div className={cn(APP_CONTENT_MAX_WIDTH, APP_CONTENT_XL_GRID)}>
          <div className="hidden min-w-0 xl:block" aria-hidden />
          <div
            className={cn(
              APP_CONTENT_RIGHT_COLUMN,
              'flex justify-center',
              columnClassName,
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
