'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { CoreProfileWizardStepId, RoomSetupStepId } from '@/lib/flow/full-flow-progress';

type FullFlowProgressContextValue = {
  profileStep: CoreProfileWizardStepId | null;
  setProfileStep: (step: CoreProfileWizardStepId | null) => void;
  roomStep: RoomSetupStepId | null;
  setRoomStep: (step: RoomSetupStepId | null) => void;
};

const FullFlowProgressContext = createContext<FullFlowProgressContextValue | null>(null);

export function FullFlowProgressProvider({ children }: { children: React.ReactNode }) {
  const [profileStep, setProfileStepState] = useState<CoreProfileWizardStepId | null>(null);
  const [roomStep, setRoomStepState] = useState<RoomSetupStepId | null>(null);

  const setProfileStep = useCallback((step: CoreProfileWizardStepId | null) => {
    setProfileStepState(step);
  }, []);

  const setRoomStep = useCallback((step: RoomSetupStepId | null) => {
    setRoomStepState(step);
  }, []);

  const value = useMemo(
    () => ({
      profileStep,
      setProfileStep,
      roomStep,
      setRoomStep,
    }),
    [profileStep, setProfileStep, roomStep, setRoomStep],
  );

  return <FullFlowProgressContext.Provider value={value}>{children}</FullFlowProgressContext.Provider>;
}

export function useFullFlowProgress() {
  const ctx = useContext(FullFlowProgressContext);
  if (!ctx) {
    return {
      profileStep: null as CoreProfileWizardStepId | null,
      setProfileStep: () => {},
      roomStep: null as RoomSetupStepId | null,
      setRoomStep: () => {},
    };
  }
  return ctx;
}
