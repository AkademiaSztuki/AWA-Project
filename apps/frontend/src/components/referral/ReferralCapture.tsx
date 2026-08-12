'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { persistReferralCode, resolvePendingReferralCode } from '@/lib/referral-storage';
import { creditsAuthHeaders } from '@/lib/credits-request-headers';

function readUserHash(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('aura_user_hash')?.trim() || null;
  } catch {
    return null;
  }
}

export function ReferralCapture() {
  const searchParams = useSearchParams();
  const searchRef = searchParams.get('ref');

  useEffect(() => {
    const code = resolvePendingReferralCode(searchRef);
    if (!code) return;
    persistReferralCode(code);

    const userHash = readUserHash();
    if (!userHash) return;

    void fetch('/api/referral/attribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...creditsAuthHeaders() },
      body: JSON.stringify({ userHash, code }),
    }).catch(() => {});
  }, [searchRef]);

  return null;
}
