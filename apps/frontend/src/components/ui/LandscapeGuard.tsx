"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw } from 'lucide-react';

export const LandscapeGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.matchMedia('(orientation: portrait)').matches;
      const mobile = window.innerWidth < 1024;
      
      setIsPortrait(portrait);
      setIsMobile(mobile);
    };

    // Initial check
    checkOrientation();

    // Listen for orientation changes
    const orientationQuery = window.matchMedia('(orientation: portrait)');
    const sizeQuery = window.matchMedia('(max-width: 1023px)');

    const handleOrientationChange = (e: MediaQueryListEvent | MediaQueryList) => {
      checkOrientation();
    };

    // Modern browsers
    if (orientationQuery.addEventListener) {
      orientationQuery.addEventListener('change', handleOrientationChange);
      sizeQuery.addEventListener('change', handleOrientationChange);
    } else {
      // Fallback for older browsers
      orientationQuery.addListener(handleOrientationChange as any);
      sizeQuery.addListener(handleOrientationChange as any);
    }

    // Also listen to window resize
    window.addEventListener('resize', checkOrientation);

    return () => {
      if (orientationQuery.removeEventListener) {
        orientationQuery.removeEventListener('change', handleOrientationChange);
        sizeQuery.removeEventListener('change', handleOrientationChange);
      } else {
        orientationQuery.removeListener(handleOrientationChange as any);
        sizeQuery.removeListener(handleOrientationChange as any);
      }
      window.removeEventListener('resize', checkOrientation);
    };
  }, []);

  const showOverlay = isPortrait && isMobile;

  return (
    <>
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(192, 192, 192, 0.1) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <motion.div
                animate={{
                  rotateZ: [0, -90, -90, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [0, 0.3, 0.7, 1]
                }}
                className="mb-8"
              >
                <div className="relative">
                  {/* Phone outline */}
                  <div className="w-32 h-48 border-4 border-gold rounded-2xl bg-white/10 backdrop-blur-xl shadow-2xl relative">
                    {/* Screen */}
                    <div className="absolute inset-3 bg-gradient-to-br from-gold/20 to-silver/20 rounded-lg" />
                    {/* Home button */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 border-2 border-gold/50 rounded-full" />
                  </div>
                  
                  {/* Rotation arrow */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute -right-12 top-1/2 -translate-y-1/2"
                  >
                    <RotateCw className="text-gold w-10 h-10" />
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-nasalization text-gray-800 mb-4">
                  Obróć urządzenie
                </h2>
                <p className="text-lg font-modern text-gray-700 mb-2">
                  Dla najlepszego doświadczenia,
                </p>
                <p className="text-lg font-modern text-gray-700">
                  użyj trybu poziomego (landscape)
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 text-sm text-gray-500 font-modern"
              >
                Aplikacja jest zoptymalizowana pod ekrany poziome
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {children}
    </>
  );
};

export default LandscapeGuard;

