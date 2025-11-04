import { useEffect } from 'react';
import { useSessionData } from './useSessionData';
import { saveUserProfile } from '@/lib/supabase-deep-personalization';
import { mapSessionToUserProfile } from '@/lib/profile-mapper';

export function useProfileSync() {
  const { sessionData } = useSessionData();
  
  useEffect(() => {
    if (sessionData?.coreProfileComplete && sessionData?.userHash) {
      const profileData = mapSessionToUserProfile(sessionData);
      saveUserProfile(profileData).catch(error => {
        console.error('Failed to sync profile to Supabase:', error);
      });
    }
  }, [sessionData?.coreProfileComplete, sessionData?.userHash]);
}

