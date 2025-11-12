"use client";

import { PainPointsStep } from "@/components/setup/room/steps/PainPointsStep";
import { useRoomWizard } from "@/components/setup/room/RoomWizardContext";

export default function RoomPainPointsPage() {
  const { data, updateData, goToNextStep, goToPreviousStep } = useRoomWizard();

  return (
    <PainPointsStep
      selected={data.painPoints}
      onUpdate={(points) => updateData({ painPoints: points })}
      onNext={goToNextStep}
      onBack={goToPreviousStep}
    />
  );
}
