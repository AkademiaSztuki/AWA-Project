'use client';

import { useEffect } from 'react';

type HideDocumentScrollbarProps = {
  className?: string;
};

export function HideDocumentScrollbar({
  className = 'awa-hide-document-scrollbar',
}: HideDocumentScrollbarProps) {
  useEffect(() => {
    const { documentElement, body } = document;
    documentElement.classList.add(className);
    body.classList.add(className);

    return () => {
      documentElement.classList.remove(className);
      body.classList.remove(className);
    };
  }, [className]);

  return null;
}
