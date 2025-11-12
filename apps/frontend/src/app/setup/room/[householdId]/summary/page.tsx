"use client";

import { RoomSummaryStep } from "@/components/setup/room/steps/RoomSummaryStep";
import { useRoomWizard } from "@/components/setup/room/RoomWizardContext";

export default function RoomSummaryPage() {
  const { data, submitRoom, goToPreviousStep, isSaving } = useRoomWizard();

  return (
    <RoomSummaryStep
      data={data}
      onComplete={submitRoom}
      onBack={goToPreviousStep}
      isSaving={isSaving}
    />
  );
}
