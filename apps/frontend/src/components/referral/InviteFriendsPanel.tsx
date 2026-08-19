'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { creditsAuthHeaders } from '@/lib/credits-request-headers';
import { REFERRAL_VERIFY_CREDITS } from '@/lib/referral-constants';
import { getSiteUrl } from '@/lib/seo/site';
import { cn } from '@/lib/utils';

interface InviteFriendsPanelProps {
  userHash?: string | null;
  className?: string;
  defaultCollapsed?: boolean;
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

export function InviteFriendsPanel({
  userHash,
  className,
  defaultCollapsed = false,
}: InviteFriendsPanelProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  const [data, setData] = useState<ReferralMeResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

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
    <GlassCard
      variant="flatOnMobile"
      className={cn('overflow-hidden border border-gold/20', className)}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-white/10 sm:px-6"
      >
        <h3 className="font-nasalization text-lg text-graphite sm:text-xl">
          {t('Zaproś znajomych', 'Invite friends')}
        </h3>
        <ChevronDown
          size={20}
          className={cn(
            'shrink-0 text-gold transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="border-t border-white/15 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <p className="mb-4 font-modern text-sm text-graphite">
            {t(
              `Za każdą osobę, która założy konto z Twojego linku, dostajesz ${REFERRAL_VERIFY_CREDITS} kredytów.`,
              `Each friend who creates an account with your link gives you ${REFERRAL_VERIFY_CREDITS} credits.`,
            )}
          </p>

          {!user || !userHash ? (
            <p className="font-modern text-sm text-graphite">
              {t(
                'Zaloguj się, aby dostać swój link polecający.',
                'Sign in to get your invite link.',
              )}
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={loading ? t('Ładuję…', 'Loading…') : inviteUrl || data?.code || ''}
                  className="flex-1 rounded-xl border border-white/30 bg-white/50 px-4 py-3 font-modern text-sm text-gray-900"
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
                <p className="mt-3 font-modern text-sm text-graphite" role="status">
                  {t(
                    `${data.verifiedCount || 0} zaproszeń · ${data.creditsEarned || 0} kredytów z poleceń`,
                    `${data.verifiedCount || 0} invites · ${data.creditsEarned || 0} referral credits`,
                  )}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </GlassCard>
  );
}
