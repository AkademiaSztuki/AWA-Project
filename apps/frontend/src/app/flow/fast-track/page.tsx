"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/hooks/useSessionData';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { PhotoUploadStep } from '@/components/setup/RoomSetup';
import { useSession } from '@/hooks';

/**
 * Fast Track Flow - Quick experience
 * Uses the same PhotoUploadStep as full experience setup/room
 * After photo upload, goes directly to generation
 */
export default function FastTrackPage() {
  const router = useRouter();
  const { updateSession } = useSession();
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [roomType, setRoomType] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');

  // Update is called when photo is uploaded and analyzed
  const handlePhotoUpdate = async (uploadedPhotos: string[], detectedRoomType: string, detectedRoomName: string) => {
    console.log('[FastTrack] Photo update:', {
      photosCount: uploadedPhotos.length,
      firstPhotoLength: uploadedPhotos[0]?.length,
      firstPhotoStart: uploadedPhotos[0]?.substring(0, 50),
      roomType: detectedRoomType,
      roomName: detectedRoomName
    });
    
    setPhotos(uploadedPhotos);
    setRoomType(detectedRoomType);
    setRoomName(detectedRoomName);
    
    // Save to session - make sure it's base64 string, not blob URL
    const roomImage = uploadedPhotos[0] || null;
    console.log('[FastTrack] Saving roomImage to session:', {
      hasImage: !!roomImage,
      imageLength: roomImage?.length,
      isBase64: roomImage && !roomImage.startsWith('blob:'),
      imageStart: roomImage?.substring(0, 50)
    });
    
    await updateSession({
      roomType: detectedRoomType,
      roomImage: roomImage ?? undefined,
      pathType: 'fast' // Mark as fast track
    });
  };

  // Next is called when user clicks "Dalej" button
  const handleNext = () => {
    console.log('[FastTrack] Next clicked - routing to style selection');
    router.push('/flow/style-selection');
  };

  const handleBack = () => {
    router.push('/flow/path-selection');
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Formularz upload - używa tego samego komponentu co /setup/room */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <PhotoUploadStep 
            photos={photos}
            roomType={roomType}
            onUpdate={handlePhotoUpdate}
            onNext={handleNext}
            onBack={handleBack}
          />
        </div>
      </div>

      {/* Dialog IDA na dole - cala szerokosc */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="upload" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}

