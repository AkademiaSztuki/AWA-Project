"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export function DesktopBackground() {
  const [gradientPos, setGradientPos] = useState({ x: 50, y: 50 });
  const targetPos = useRef({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = {
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animId: number;
    const animate = () => {
      setGradientPos((pos) => {
        const dx = targetPos.current.x - pos.x;
        const dy = targetPos.current.y - pos.y;
        return {
          x: pos.x + dx * 0.08,
          y: pos.y + dy * 0.08,
        };
      });
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      className="fixed z-[1] pointer-events-none bg-[#1a1a1a] overflow-hidden"
      style={{
        top: 'calc(-1 * env(safe-area-inset-top, 0))',
        left: 'calc(-1 * env(safe-area-inset-left, 0))',
        right: 'calc(-1 * env(safe-area-inset-right, 0))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0))',
        width: '100vw',
        height: '100dvh',
      }}
    >
      <div className="absolute inset-0">
        <picture>
          <source
            srcSet="/images/background-desktop-1920.webp 1920w"
            type="image/webp"
          />
          <source
            srcSet="/images/background-desktop-1920.jpg 1920w"
            type="image/jpeg"
          />
          <Image
            src="/images/background-desktop-1920.jpg"
            alt=""
            fill
            priority
            quality={85}
            className="object-cover bg-image"
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        </picture>
      </div>
      {/* Gradient za myszką – jak w Aurora, z inercją */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${gradientPos.x}% ${gradientPos.y}%, rgba(176,176,176,0.42) 0%, rgba(212,175,55,0.32) 60%, transparent 80%)`,
          mixBlendMode: 'lighten',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
