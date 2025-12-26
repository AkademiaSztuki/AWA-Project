"use client";

import React from 'react';

export const LandscapeGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // LandscapeGuard is now just a pass-through component
  // Portrait mode is now fully supported on mobile
  return <>{children}</>;
};

export default LandscapeGuard;

