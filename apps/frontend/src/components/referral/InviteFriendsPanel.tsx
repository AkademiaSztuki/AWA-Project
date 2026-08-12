'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { creditsAuthHeaders } from '@/lib/credits-request-headers';
import {
  CREDITS_PER_IMAGE,
  REFERRAL_FIRST_GENERATION_CREDITS,
  REFERRAL_MILESTONE_10_COUNT,
  REFERRAL_MILESTONE_10_CREDITS,
  REFERRAL_MILESTONE_3_COUNT,
  REFERRAL_MILESTONE_3_CREDITS,
  REFERRAL_VERIFY_CREDITS,
} from '@/lib/referral-constants';
import { getSiteUrl } from '@/lib/seo/site';

interface InviteFriendsPanelProps {
  userHash?: string | null;
  className?: string;
}

interface ReferralMeResponse {
  ok?: boolean;
  code?: string;
  invitePath?: string;
  verifiedCount?: number;
  firstGenerationCount?: number;
  creditsEarned?: number;
  milestone3Claimed?: boolean;
  milestone10Claimed?: boolean;
}

export function InviteFriendsPanel({ userHash, className }: InviteFriendsPanelProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  const [data, setData] = useState<ReferralMeResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userHash || !user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/referral/me/${encodeURIComponent(userHash)}`, {
        headers: creditsAuthHeaders(),
      });
      const json = (await res.json()) as ReferralMeResponse;
      if (res.ok) setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userHash, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const inviteUrl = data?.invitePath
    ? `${getSiteUrl()}${data.invitePath}`
    : null;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-white/25 bg-white/30 px-5 py-5 sm:px-6 ${className || ''}`}>
      <h3 className="text-lg font-exo2 font-bold text-gray-900 mb-2">
        {t('Zaproś znajomych', 'Invite friends')}
      </h3>
      <p className="text-sm text-gray-700 font-modern mb-4">
        {t(
          `Za każdą osobę, która założy konto, dostajesz ${REFERRAL_VERIFY_CREDITS} kredytów (${REFERRAL_VERIFY_CREDITS / CREDITS_PER_IMAGE} wizji). Po jej pierwszej generacji — kolejne ${REFERRAL_FIRST_GENERATION_CREDITS}.`,
          `Each friend who creates an account gives you ${REFERRAL_VERIFY_CREDITS} credits (${REFERRAL_VERIFY_CREDITS / CREDITS_PER_IMAGE} visions). Their first generation adds another ${REFERRAL_FIRST_GENERATION_CREDITS}.`,
        )}
      </p>
      <p className="text-xs text-gray-600 font-modern mb-4">
        {t(
          `Bonus: ${REFERRAL_MILESTONE_3_COUNT} zaproszenia = +${REFERRAL_MILESTONE_3_CREDITS}, ${REFERRAL_MILESTONE_10_COUNT} zaproszeń = +${REFERRAL_MILESTONE_10_CREDITS}.`,
          `Bonus: ${REFERRAL_MILESTONE_3_COUNT} invites = +${REFERRAL_MILESTONE_3_CREDITS}, ${REFERRAL_MILESTONE_10_COUNT} invites = +${REFERRAL_MILESTONE_10_CREDITS}.`,
        )}
      </p>

      {!user || !userHash ? (
        <p className="text-sm text-gray-700 font-modern">
          {t(
            'Zaloguj się, aby dostać swój link polecający.',
            'Sign in to get your invite link.',
          )}
        </p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              readOnly
              value={loading ? t('Ładuję…', 'Loading…') : inviteUrl || data?.code || ''}
              className="flex-1 rounded-xl border border-white/30 bg-white/50 px-4 py-3 text-sm font-modern text-gray-900"
            />
            <GlassButton
              type="button"
              variant="primary"
              disabled={!inviteUrl}
              onClick={() => void handleCopy()}
              className="sm:min-w-[140px]"
            >
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied ? t('Skopiowano', 'Copied') : t('Kopiuj link', 'Copy link')}
            </GlassButton>
          </div>
          {data && (
            <p className="mt-3 text-sm font-modern text-gray-800" role="status">
              {t(
                `${data.verifiedCount || 0} zaproszeń · ${data.creditsEarned || 0} kredytów z poleceń`,
                `${data.verifiedCount || 0} invites · ${data.creditsEarned || 0} referral credits`,
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
