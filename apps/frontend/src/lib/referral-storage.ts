import { REFERRAL_COOKIE_NAME, REFERRAL_STORAGE_KEY } from './referral-constants';

const CODE_PATTERN = /^IDA-[A-Z0-9]{4,12}$/;

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!CODE_PATTERN.test(code)) return null;
  return code;
}

export function readStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function persistReferralCode(raw: string): string | null {
  const code = normalizeReferralCode(raw);
  if (!code || typeof window === 'undefined') return null;
  try {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  } catch {
    // ignore quota / private mode
  }
  return code;
}

export function readReferralCodeFromDocument(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REFERRAL_COOKIE_NAME}=`));
  if (!match) return null;
  return normalizeReferralCode(decodeURIComponent(match.slice(REFERRAL_COOKIE_NAME.length + 1)));
}

export function resolvePendingReferralCode(searchRef?: string | null): string | null {
  return (
    normalizeReferralCode(searchRef) ||
    readStoredReferralCode() ||
    readReferralCodeFromDocument()
  );
}
