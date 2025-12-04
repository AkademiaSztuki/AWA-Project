"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PathSelectionButton } from './PathSelectionButton';
import { DashboardButton } from './DashboardButton';
import { UserAuthButton } from '@/components/auth/UserAuthButton';
import { LanguageToggle } from '@/contexts/LanguageContext';
import { MusicTestButton } from './MusicTestButton';
import { Home } from 'lucide-react';
import { useLayout } from '@/contexts/LayoutContext';

export function GlassHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { isHeaderVisible } = useLayout();

  // Header is visible if:
  // 1. We are NOT on the home page ('/')
  // 2. OR isHeaderVisible is true (controlled by LandingScreen)
  const shouldShow = pathname !== '/' || isHeaderVisible;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full sticky top-4 z-[100] mb-2"
        >
          <div className="glass-panel rounded-[32px] border border-white/20 bg-white/10 backdrop-blur-2xl shadow-2xl px-3 py-2 flex items-center gap-2">
            
            {/* Home Button */}
            <button 
              onClick={() => router.push('/')}
              className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-all text-graphite"
              title="Home"
            >
              <Home size={18} />
            </button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            <MusicTestButton />

            <div className="w-px h-6 bg-white/20 mx-1" />

            <PathSelectionButton />
            <DashboardButton />
            
            <div className="w-px h-6 bg-white/20 mx-1 ml-auto" />
            
            <UserAuthButton />
            <LanguageToggle />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


