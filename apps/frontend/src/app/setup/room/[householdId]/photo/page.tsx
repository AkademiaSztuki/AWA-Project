"use client";

import { PhotoUploadStep } from "@/components/setup/room/steps/PhotoUploadStep";
import { useRoomWizard } from "@/components/setup/room/RoomWizardContext";

export default function RoomPhotoPage() {
  const { data, updateData, goToNextStep, goToPreviousStep } = useRoomWizard();

  return (
    <PhotoUploadStep
      photos={data.photos}
      roomType={data.roomType}
      onUpdate={(photos, detectedType, roomName) => {
        updateData({
          photos,
          roomType: detectedType ?? data.roomType,
          name: roomName ?? data.name,
        });
      }}
      onNext={goToNextStep}
      onBack={goToPreviousStep}
    />
  );
}
