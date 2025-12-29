import React, { useEffect, useRef, useState } from 'react';

const blobConfigs = [
  // duże, wolne
  { color: '#ffe066', size: 600, blur: 60, opacity: 0.35, speed: 18, top: '10%', left: '10%' },
  { color: '#b0b0b0', size: 500, blur: 50, opacity: 0.32, speed: 20, top: '40%', left: '60%' },
  { color: '#d4af37', size: 400, blur: 40, opacity: 0.28, speed: 16, top: '70%', left: '30%' },
  { color: '#e0e0e0', size: 350, blur: 35, opacity: 0.25, speed: 14, top: '60%', left: '80%' },
  // średnie
  { color: '#ffd700', size: 250, blur: 30, opacity: 0.22, speed: 12, top: '20%', left: '80%' },
  { color: '#888888', size: 200, blur: 25, opacity: 0.20, speed: 10, top: '80%', left: '20%' },
  { color: '#ffe066', size: 180, blur: 20, opacity: 0.18, speed: 8, top: '50%', left: '50%' },
  { color: '#b0b0b0', size: 150, blur: 15, opacity: 0.16, speed: 7, top: '30%', left: '70%' },
  // małe, szybkie
  { color: '#ffd700', size: 100, blur: 10, opacity: 0.14, speed: 5, top: '15%', left: '75%' },
  { color: '#e0e0e0', size: 80, blur: 8, opacity: 0.12, speed: 4, top: '75%', left: '15%' },
  { color: '#bfa43a', size: 60, blur: 6, opacity: 0.10, speed: 3, top: '60%', left: '40%' },
  { color: '#b0b0b0', size: 50, blur: 5, opacity: 0.09, speed: 2, top: '40%', left: '60%' },
];

export const AuroraBackground: React.FC = () => {
  const [gradientPos, setGradientPos] = useState({ x: 50, y: 50 });
  const targetPos = useRef({ x: 50, y: 50 });

  // Śledzenie myszki + inercja
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
      setGradientPos(pos => {
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
      className="fixed z-[1] pointer-events-none overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 60% 40%,rgb(199, 152, 51) 0%,rgb(136, 136, 136) 100%)',
        /* Pokrywa cały ekran włącznie z safe-area (notch) na iOS */
        top: 'calc(-1 * env(safe-area-inset-top, 0))',
        left: 'calc(-1 * env(safe-area-inset-left, 0))',
        right: 'calc(-1 * env(safe-area-inset-right, 0))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0))',
        width: '100vw',
        height: '100dvh', /* dynamic viewport height dla iOS */
      }}
    >
      {/* Aurora bloby */}
      {blobConfigs.map((blob, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            background: blob.color,
            mixBlendMode: 'lighten',
            width: blob.size,
            height: blob.size,
            top: blob.top,
            left: blob.left,
            filter: `blur(${blob.blur}px)`,
            opacity: blob.opacity,
            animation: `auroraMove${i} ${blob.speed}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      {/* Dynamiczny gradient za myszką */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(circle at ${gradientPos.x}% ${gradientPos.y}%, rgba(176,176,176,0.25) 0%, rgba(212,175,55,0.18) 30%, transparent 40%)`
        }}
      />
      <style>{`
        ${blobConfigs.map((_, i) => `
          @keyframes auroraMove${i} {
            0% { transform: translate(0,0) scale(1);}
            100% { transform: translate(${(i%2===0?1:-1)*40 + i*10}px, ${(i%2===0?-1:1)*30 + i*8}px) scale(${1 + i*0.03});}
          }
        `).join('\n')}
      `}</style>
    </div>
  );
};
