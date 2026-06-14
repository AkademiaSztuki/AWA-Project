'use client';

import { useLayoutEffect } from 'react';
import { useLayout } from '@/contexts/LayoutContext';
import { getLayoutViewportWidth } from '@/lib/layout-viewport';

/** Reveal marketing home header before the heavy hero screen chunk hydrates. */
export function HomeMobileHeaderInit() {
  const { setHeaderVisible } = useLayout();

  useLayoutEffect(() => {
    if (getLayoutViewportWidth() < 1280) {
      setHeaderVisible(true);
    }
  }, [setHeaderVisible]);

  return null;
}
