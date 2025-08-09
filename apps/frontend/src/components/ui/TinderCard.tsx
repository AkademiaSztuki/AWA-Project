"use client";

import React from 'react';
import { useSpring, animated, config } from '@react-spring/web';
import { useDrag } from 'react-use-gesture';

interface TinderCardProps {
  image: string;
  title?: string;
  tags?: string[];
  onSwipe: (direction: 'left' | 'right', reactionTime: number) => void;
  isActive: boolean;
}

export const TinderCard: React.FC<TinderCardProps> = ({
  image,
  title,
  tags,
  onSwipe,
  isActive
}) => {
  const startTime = React.useRef<number>(Date.now());

  const [{ x, y, rotate, scale }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    config: config.default
  }));

  const bind = useDrag(({ active, movement: [mx, my], velocity: [vx] }) => {
    const trigger = Math.abs(mx) > 100;
    const direction = mx > 0 ? 'right' : 'left';

    if (!active && trigger) {
      const reactionTime = Date.now() - startTime.current;
      onSwipe(direction, reactionTime);
    }

    api.start({
      x: active ? mx : trigger ? mx > 0 ? 200 : -200 : 0,
      y: active ? my : trigger ? my * 0.2 : 0,
      rotate: active ? mx * 0.1 : trigger ? (mx > 0 ? 15 : -15) : 0,
      scale: active ? 1.05 : 1,
      immediate: active
    });
  });

  React.useEffect(() => {
    if (isActive) {
      startTime.current = Date.now();
    }
  }, [isActive]);

  return (
    <animated.div
      {...bind()}
      style={{
        x,
        y,
        rotate,
        scale,
        touchAction: 'none'
      }}
      className="absolute inset-4 cursor-grab active:cursor-grabbing"
    >
      <div className="glass-panel h-full rounded-xl overflow-hidden select-none">
        <div className="relative h-full">
          <img
            src={image}
            alt={title || "Interior"}
            className="w-full h-full object-cover"
            draggable={false}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {title && (
            <div className="absolute bottom-4 left-4 right-4">
                              <h3 className="text-white font-nasalization text-lg mb-2">
                  {title}
                </h3>
              {tags && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gold-400/80 text-gold-900 px-2 py-1 rounded-md text-xs font-modern"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Swipe hints */}
          <div className="absolute top-1/2 left-4 -translate-y-1/2 text-red-400 opacity-30 text-6xl">
            ←
          </div>
          <div className="absolute top-1/2 right-4 -translate-y-1/2 text-green-400 opacity-30 text-6xl">
            →
          </div>
        </div>
      </div>
    </animated.div>
  );
};