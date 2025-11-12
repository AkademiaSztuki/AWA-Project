"use client";

import type { ReactNode } from "react";
import { RoomWizardProvider } from "./RoomWizardContext";
import { RoomWizardFrame } from "./RoomWizardFrame";

export function RoomWizardLayout({
  householdId,
  children,
}: {
  householdId: string;
  children: ReactNode;
}) {
  return (
    <RoomWizardProvider householdId={householdId}>
      <RoomWizardFrame>{children}</RoomWizardFrame>
    </RoomWizardProvider>
  );
}
