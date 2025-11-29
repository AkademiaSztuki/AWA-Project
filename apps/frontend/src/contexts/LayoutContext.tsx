"use client";

import React, { createContext, useContext, useState } from 'react';

interface LayoutContextType {
  isHeaderVisible: boolean;
  setHeaderVisible: (visible: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [isHeaderVisible, setHeaderVisible] = useState(true);

  return (
    <LayoutContext.Provider value={{ isHeaderVisible, setHeaderVisible }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}

