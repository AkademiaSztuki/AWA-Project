"use client";

import { RoomSwipesStep } from "@/components/setup/room/steps/RoomSwipesStep";
import { useRoomWizard } from "@/components/setup/room/RoomWizardContext";

export default function RoomSwipesPage() {
  const { data, updateData, goToNextStep, goToPreviousStep } = useRoomWizard();

  return (
    <RoomSwipesStep
      roomType={data.roomType}
      onComplete={(swipes) => {
        updateData({ roomSwipes: swipes });
        goToNextStep();
      }}
      onBack={goToPreviousStep}
    />
  );
}
