"use client";

import React, { useEffect, useRef, useState } from 'react';

interface Bubble {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  direction: number;
  blur: number;
}

const AuroraBubbles: React.FC = () => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    // Inicjalizacja bąbelków - większe i bardziej widoczne
    const initialBubbles: Bubble[] = [
      // Duże bąbelki w okolicach nóg IDA - zwiększona przezroczystość
      { x: 20, y: 75, size: 120, opacity: 0.65, speed: 0.3, direction: 1, blur: 25 },
      { x: 35, y: 80, size: 80, opacity: 0.68, speed: 0.4, direction: -1, blur: 20 },
      { x: 15, y: 85, size: 100, opacity: 0.62, speed: 0.25, direction: 1, blur: 30 },
      { x: 45, y: 82, size: 90, opacity: 0.62, speed: 0.35, direction: 1, blur: 22 },
      { x: 30, y: 88, size: 110, opacity: 0.68, speed: 0.2, direction: -1, blur: 28 },
      
      // Średnie bąbelki w dolnej części
      { x: 60, y: 70, size: 60, opacity: 0.25, speed: 0.5, direction: 1, blur: 15 },
      { x: 80, y: 75, size: 70, opacity: 0.22, speed: 0.35, direction: -1, blur: 18 },
      { x: 25, y: 65, size: 50, opacity: 0.30, speed: 0.45, direction: 1, blur: 12 },
      { x: 70, y: 78, size: 65, opacity: 0.26, speed: 0.4, direction: 1, blur: 16 },
      { x: 55, y: 72, size: 55, opacity: 0.24, speed: 0.3, direction: -1, blur: 14 },
      
      // Dodatkowe bąbelki w dolnej części ekranu
      { x: 10, y: 90, size: 75, opacity: 0.33, speed: 0.25, direction: 1, blur: 20 },
      { x: 85, y: 85, size: 85, opacity: 0.29, speed: 0.35, direction: -1, blur: 23 },
      { x: 40, y: 95, size: 95, opacity: 0.36, speed: 0.2, direction: 1, blur: 26 },
      { x: 75, y: 92, size: 70, opacity: 0.27, speed: 0.4, direction: -1, blur: 18 },
      { x: 5, y: 78, size: 60, opacity: 0.31, speed: 0.3, direction: 1, blur: 15 },
      
      // Małe bąbelki dla dodatkowego efektu
      { x: 45, y: 85, size: 40, opacity: 0.20, speed: 0.6, direction: -1, blur: 10 },
      { x: 70, y: 65, size: 35, opacity: 0.18, speed: 0.55, direction: 1, blur: 8 },
      { x: 90, y: 70, size: 45, opacity: 0.23, speed: 0.4, direction: -1, blur: 12 },
      { x: 15, y: 72, size: 38, opacity: 0.19, speed: 0.5, direction: 1, blur: 9 },
    ];

    setBubbles(initialBubbles);

    // Animacja bąbelków
    const animateBubbles = () => {
      setBubbles(prevBubbles => 
        prevBubbles.map(bubble => {
          let newX = bubble.x + bubble.speed * bubble.direction;
          
          // Odbij od krawędzi ekranu
          if (newX < 0 || newX > 100) {
            return {
              ...bubble,
              direction: bubble.direction * -1,
              x: Math.max(0, Math.min(100, newX))
            };
          }
          
          return {
            ...bubble,
            x: newX
          };
        })
      );
    };

    const interval = setInterval(animateBubbles, 100); // Wolniejsza animacja

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="fixed z-[4] pointer-events-none overflow-hidden"
      style={{
        /* Pokrywa cały ekran włącznie z safe-area (notch) na iOS */
        top: 'calc(-1 * env(safe-area-inset-top, 0))',
        left: 'calc(-1 * env(safe-area-inset-left, 0))',
        right: 'calc(-1 * env(safe-area-inset-right, 0))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0))',
        width: '100vw',
        height: '100dvh', /* dynamic viewport height dla iOS */
      }}
    >
      {bubbles.map((bubble, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.1) 70%, transparent 100%)',
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            filter: `blur(${bubble.blur}px)`,
            opacity: bubble.opacity,
            mixBlendMode: 'screen',
            transform: 'translate(-50%, -50%)',
            animation: `bubbleFloat${index} ${10 + index * 2}s ease-in-out infinite alternate`
          }}
        />
      ))}
      
      <style jsx>{`
        ${bubbles.map((_, index) => `
          @keyframes bubbleFloat${index} {
            0% { 
              transform: translate(-50%, -50%) scale(1) rotate(0deg);
              opacity: ${bubbles[index]?.opacity || 0.2};
            }
            50% {
              transform: translate(-50%, -50%) scale(1.15) rotate(180deg);
              opacity: ${(bubbles[index]?.opacity || 0.2) * 1.5};
            }
            100% { 
              transform: translate(-50%, -50%) scale(1) rotate(360deg);
              opacity: ${bubbles[index]?.opacity || 0.2};
            }
          }
        `).join('\n')}
      `}</style>
    </div>
  );
};

export default AuroraBubbles; 