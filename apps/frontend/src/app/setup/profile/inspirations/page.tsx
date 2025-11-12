"use client";

import { InspirationsStep } from "@/components/steps/InspirationsStep";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

export default function InspirationsPage() {
  const { profileData, updateProfile, completeStep, goToPreviousStep } =
    useProfileWizard();

  return (
    <InspirationsStep
      data={profileData.inspirations}
      onUpdate={(data) => updateProfile({ inspirations: data })}
      onNext={() => completeStep()}
      onBack={goToPreviousStep}
    />
  );
}
