import { creditsAuthHeaders } from '@/lib/credits-request-headers';
import { resolvePendingReferralCode } from '@/lib/referral-storage';

const attributedKeys = new Set<string>();
const inFlight = new Map<string, Promise<boolean>>();

export async function attributePendingReferral(
  userHash: string | null | undefined,
  searchRef?: string | null,
): Promise<boolean> {
  const hash = userHash?.trim();
  if (!hash) return false;
  const code = resolvePendingReferralCode(searchRef);
  if (!code) return false;

  const key = `${hash}:${code}`;
  if (attributedKeys.has(key)) return true;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const run = (async () => {
    try {
      const res = await fetch('/api/referral/attribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...creditsAuthHeaders() },
        body: JSON.stringify({ userHash: hash, code }),
      });
      const json = (await res.json().catch(() => ({}))) as { attributed?: boolean; reason?: string };
      if (!res.ok) return false;
      if (json.reason === 'no_participant') return false;
      attributedKeys.add(key);
      return true;
    } catch {
      return false;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, run);
  return run;
}
