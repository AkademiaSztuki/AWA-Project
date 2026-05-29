import { GOOGLE_AUTH_USER_ID_STORAGE_KEY } from '@/lib/auth-storage-keys';

export const AUTH_USER_ID_HEADER = 'x-auth-user-id';

/** Client-side headers for credits API when user is logged in (OAuth / magic link). */
export function creditsAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const authUserId = window.localStorage.getItem(GOOGLE_AUTH_USER_ID_STORAGE_KEY)?.trim();
  if (!authUserId) return {};
  return { [AUTH_USER_ID_HEADER]: authUserId };
}
