"use client";

import React from 'react';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { ReadingGuide } from '@/components/ui/ReadingGuide';

interface AppContentFrameProps {
  children: React.ReactNode;
}

export function AppContentFrame({ children }: AppContentFrameProps) {
  return (
    <main
      id="main-content"
      className="relative z-10 min-h-[100dvh] w-full px-1.5 sm:px-4 md:px-8"
      role="main"
      aria-label="Główna treść aplikacji"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0) + clamp(1rem, 2vw, 2rem))',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + clamp(2rem, 3vw, 3rem))',
      }}
    >
      <div className="mx-auto w-full max-w-screen-2xl flex flex-col xl:grid xl:gap-10 xl:grid-cols-[minmax(320px,0.3fr)_minmax(400px,0.7fr)] items-start">
        <div className="hidden xl:block min-h-[720px]" aria-hidden="true" />
        <div className="w-full max-w-full lg:max-w-none lg:ml-auto space-y-2 sm:space-y-4">
          <GlassHeader />
          <ReadingGuide />
          <div className="w-full">{children}</div>
        </div>
      </div>
    </main>
  );
}
