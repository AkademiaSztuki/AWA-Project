"use client";

import { useIsMobile } from '@/hooks/useIsMobile';
import Image from 'next/image';

export function MobileBackground() {
  return (
    <div 
      className="fixed z-[1] pointer-events-none relative"
      style={{
        /* Cover largest mobile viewport + safe-area — avoids white/gray strips when Safari UI resizes */
        top: 'calc(-1 * env(safe-area-inset-top, 0px))',
        left: 'calc(-1 * env(safe-area-inset-left, 0px))',
        right: 'calc(-1 * env(safe-area-inset-right, 0px))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
        backgroundColor: 'rgb(199, 152, 51)',
      }}
    >
      <picture>
        <source
          srcSet="/images/background-mobile-720.webp 720w, /images/background-mobile-1080.webp 1080w"
          type="image/webp"
        />
        <source
          srcSet="/images/background-mobile-720.jpg 720w, /images/background-mobile-1080.jpg 1080w"
          type="image/jpeg"
        />
        <Image
          src="/images/background-mobile-720.jpg"
          alt=""
          fill
          priority
          quality={85}
          className="object-cover bg-image min-h-[100lvh]"
          sizes="100vw"
          style={{
            objectFit: 'cover',
            minHeight: '100lvh',
          }}
        />
      </picture>
    </div>
  );
}

