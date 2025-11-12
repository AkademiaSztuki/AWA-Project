"use client";

import type { ReactNode } from "react";
import { HouseholdWizardProvider } from "@/components/setup/household/HouseholdWizardContext";
import { HouseholdWizardFrame } from "@/components/setup/household/HouseholdWizardFrame";

export default function HouseholdLayout({ children }: { children: ReactNode }) {
  return (
    <HouseholdWizardProvider>
      <HouseholdWizardFrame>{children}</HouseholdWizardFrame>
    </HouseholdWizardProvider>
  );
}
