"use client";

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

const ParticlesBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dostosuj rozmiar canvas do okna
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Inicjalizacja cząsteczek
    const initParticles = () => {
      const particles: Particle[] = [];
      const particleCount = 12;

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5, // Wolniejsze ruchy
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 3 + 1, // Mniejsze cząsteczki
          opacity: Math.random() * 0.3 + 0.1 // Niższa przezroczystość
        });
      }
      particlesRef.current = particles;
    };

    initParticles();

    // Animacja
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        // Aktualizuj pozycję
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Odbij od krawędzi
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Rysuj cząsteczkę
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${particle.opacity})`; // Złoty kolor
        ctx.fill();

        // Dodaj subtelny glow effect
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${particle.opacity * 0.3})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed z-[4] pointer-events-none"
      style={{ 
        mixBlendMode: 'screen',
        /* Pokrywa cały ekran włącznie z safe-area (notch) na iOS */
        top: 'calc(-1 * env(safe-area-inset-top, 0))',
        left: 'calc(-1 * env(safe-area-inset-left, 0))',
        right: 'calc(-1 * env(safe-area-inset-right, 0))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0))',
        width: '100vw',
        height: '100dvh', /* dynamic viewport height dla iOS */
      }}
    />
  );
};

export default ParticlesBackground; 