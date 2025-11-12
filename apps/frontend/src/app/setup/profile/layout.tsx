"use client";

import type { ReactNode } from "react";
import { ProfileWizardProvider } from "@/components/setup/profile/ProfileWizardContext";
import { ProfileWizardFrame } from "@/components/setup/profile/ProfileWizardFrame";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <ProfileWizardProvider>
      <ProfileWizardFrame>{children}</ProfileWizardFrame>
    </ProfileWizardProvider>
  );
}
