"use client";

import { UsageContextStep } from "@/components/setup/room/steps/UsageContextStep";
import { useRoomWizard } from "@/components/setup/room/RoomWizardContext";

export default function RoomUsagePage() {
  const { data, updateData, goToNextStep, goToPreviousStep } = useRoomWizard();

  return (
    <UsageContextStep
      usageType={data.usageType}
      onUpdate={(usage) => updateData({ usageType: usage })}
      onNext={goToNextStep}
      onBack={goToPreviousStep}
    />
  );
}
