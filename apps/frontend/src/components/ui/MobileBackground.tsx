"use client";

import { useIsMobile } from '@/hooks/useIsMobile';
import Image from 'next/image';

export function MobileBackground() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none bg-[#1a1a1a]">
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
          className="object-cover"
          sizes="100vw"
          style={{
            objectFit: 'cover',
          }}
        />
      </picture>
    </div>
  );
}

