'use client';

import {
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

const PX_TOLERANCE = 2;

type Props = {
  children: ReactNode;
  className?: string;
  /**
   * When true (default), adds flex-1 min-h-0 w-full min-w-0 so the region fills
   * a flex column parent with a bounded max-height (e.g. glass step card).
   */
  flexFill?: boolean;
};

/**
 * Applies vertical scrolling only when content actually overflows the container.
 * The scrollbar is intentionally hidden for glass wizard cards because the custom thumb
 * flashing during first layout is more distracting than helpful.
 */
export function ScrollYWhenNeeded({ children, className, flexFill = true }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [canScroll, setCanScroll] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.clientHeight < 1) return;
    setCanScroll(el.scrollHeight > el.clientHeight + PX_TOLERANCE);
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, children]);

  useLayoutEffect(() => {
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        requestAnimationFrame(measure);
      });
    }
  }, [measure, children]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, children]);

  return (
    <div
      ref={ref}
      className={cn(
        flexFill && 'min-h-0 w-full min-w-0 flex-1',
        'flex min-h-0 flex-col',
        canScroll
          ? 'scrollbar-hide overflow-x-hidden overflow-y-auto'
          : 'overflow-x-hidden overflow-y-hidden',
        className
      )}
    >
      {children}
    </div>
  );
}
