'use client';

import React, { useState } from 'react';
import { GlassButton } from '@/components/ui/GlassButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { creditsAuthHeaders } from '@/lib/credits-request-headers';

interface PromoCodeRedeemProps {
  userHash: string;
  authUserId?: string | null;
  onRedeemed?: () => void;
}

export function PromoCodeRedeem({ userHash, authUserId, onRedeemed }: PromoCodeRedeemProps) {
  const { language } = useLanguage();
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const handleRedeem = async () => {
    if (!userHash || !code.trim()) return;
    setLoading(true);
    setMessage(null);
    setError(false);
    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...creditsAuthHeaders() },
        body: JSON.stringify({ userHash, code: code.trim(), authUserId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || t('Kod aktywowany.', 'Code applied.'));
        setCode('');
        onRedeemed?.();
      } else {
        setError(true);
        setMessage(data.message || t('Nie udało się aktywować kodu.', 'Could not apply code.'));
      }
    } catch {
      setError(true);
      setMessage(t('Błąd połączenia. Spróbuj ponownie.', 'Connection error. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/25 bg-white/30 px-5 py-5 sm:px-6">
      <h3 className="text-lg font-exo2 font-bold text-gray-900 mb-2">
        {t('Masz kod zaproszenia?', 'Have an invite code?')}
      </h3>
      <p className="text-sm text-gray-700 font-modern mb-4">
        {t(
          'Wpisz kod, aby odebrać kredyty na plan Basic.',
          'Enter your code to receive Basic plan credits.',
        )}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('np. IDA-BETA-2026', 'e.g. IDA-BETA-2026')}
          className="flex-1 rounded-xl border border-white/30 bg-white/50 px-4 py-3 text-sm font-modern text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-400/50"
          autoComplete="off"
          spellCheck={false}
        />
        <GlassButton
          type="button"
          variant="primary"
          disabled={loading || !code.trim()}
          onClick={handleRedeem}
          className="sm:min-w-[140px]"
        >
          {loading ? t('Aktywuję...', 'Applying...') : t('Aktywuj kod', 'Apply code')}
        </GlassButton>
      </div>
      {message && (
        <p
          className={`mt-3 text-sm font-modern ${error ? 'text-red-700' : 'text-green-800'}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
