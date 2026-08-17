'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSessionData } from '@/hooks/useSessionData';
import { persistReferralCode, resolvePendingReferralCode } from '@/lib/referral-storage';
import { attributePendingReferral } from '@/lib/referral-attribute-client';

function readStoredUserHash(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      window.localStorage.getItem('aura_user_hash')?.trim() ||
      window.sessionStorage.getItem('aura_user_hash')?.trim() ||
      null
    );
  } catch {
    return null;
  }
}

export function ReferralCapture() {
  const searchParams = useSearchParams();
  const searchRef = searchParams.get('ref');
  const { sessionData, isInitialized } = useSessionData();
  const userHash = sessionData?.userHash?.trim() || readStoredUserHash();

  useEffect(() => {
    const code = resolvePendingReferralCode(searchRef);
    if (code) persistReferralCode(code);
    if (!userHash) return;
    void attributePendingReferral(userHash, searchRef);
  }, [searchRef, userHash, isInitialized]);

  return null;
}
