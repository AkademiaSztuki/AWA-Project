"use client";

import { ActivitiesStep } from "@/components/setup/room/steps/ActivitiesStep";
import { useRoomWizard } from "@/components/setup/room/RoomWizardContext";

export default function RoomActivitiesPage() {
  const { data, updateData, goToNextStep, goToPreviousStep } = useRoomWizard();

  return (
    <ActivitiesStep
      roomType={data.roomType}
      selected={data.activities}
      satisfaction={data.activitySatisfaction}
      onUpdate={(activities, satisfaction) =>
        updateData({
          activities,
          activitySatisfaction: satisfaction,
        })
      }
      onNext={goToNextStep}
      onBack={goToPreviousStep}
    />
  );
}
