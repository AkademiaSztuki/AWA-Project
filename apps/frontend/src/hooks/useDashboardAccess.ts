"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionData } from '@/hooks/useSessionData';
import { getCoreProfileCompletionStatus, getUserHashFromAuth } from '@/lib/supabase-deep-personalization';

export function useDashboardAccess() {
  const { user } = useAuth();
  const { sessionData } = useSessionData();
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!user) {
      setIsComplete(false);
      setIsResolved(true);
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    let userHash = sessionData?.userHash;
    setIsLoading(true);
    setIsResolved(false);

    (async () => {
      if (!userHash) {
        userHash = await getUserHashFromAuth(user.id);
      }
      return getCoreProfileCompletionStatus({ authUserId: user.id, userHash: userHash || undefined });
    })()
      .then((status) => {
        if (!isActive) return;
        setIsComplete(!!status?.coreProfileComplete);
        setIsResolved(true);
      })
      .catch(() => {
        if (!isActive) return;
        setIsResolved(false);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [user?.id, sessionData?.userHash]);

  return { isComplete, isLoading, isResolved };
}
