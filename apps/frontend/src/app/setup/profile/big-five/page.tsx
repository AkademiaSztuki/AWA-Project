"use client";

import { BigFiveStep } from "@/components/steps/BigFiveStep";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

export default function BigFivePage() {
  const { profileData, updateProfile, completeStep, goToPreviousStep } =
    useProfileWizard();

  return (
    <BigFiveStep
      data={profileData.bigFive}
      onUpdate={(data) => updateProfile({ bigFive: data })}
      onNext={() => completeStep()}
      onBack={goToPreviousStep}
    />
  );
}
