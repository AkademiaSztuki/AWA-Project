/**
 * Server-side client for AWA backend-gcp API (Cloud Run).
 * Used by Next.js API routes (server-side) when NEXT_PUBLIC_GCP_API_BASE_URL is set.
 * Unlike gcp-api-client.ts (browser-only), this works in Node.js server context.
 */

function getBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_GCP_API_BASE_URL;
  return url && url.length > 0 ? url.replace(/\/$/, '') : null;
}

export function isGcpConfigured(): boolean {
  return !!getBaseUrl();
}

async function serverFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<{ data?: T; ok: boolean; error?: string }> {
  const base = getBaseUrl();
  if (!base) {
    return { ok: false, error: 'GCP_API_BASE_URL not configured' };
  }
  const { method = 'GET', body } = options;
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: (data as { error?: string }).error || res.statusText };
    }
    return { ok: true, data: data as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'network_error';
    return { ok: false, error: msg };
  }
}

export const gcpServerApi = {
  credits: {
    grantFree: (userHash: string) =>
      serverFetch<{ ok: boolean; granted: boolean; amount?: number }>(
        '/api/credits/grant-free',
        { method: 'POST', body: { userHash } },
      ),

    deduct: (userHash: string, generationId: string) =>
      serverFetch<{ ok: boolean }>(
        '/api/credits/deduct',
        { method: 'POST', body: { userHash, generationId } },
      ),

    balance: (userHash: string) =>
      serverFetch<{
        balance: number;
        generationsAvailable: number;
        hasActiveSubscription: boolean;
        subscriptionCreditsRemaining: number;
      }>(`/api/credits/balance?userHash=${encodeURIComponent(userHash)}`),

    check: (userHash: string, amount?: number) =>
      serverFetch<{ available: boolean }>(
        '/api/credits/check',
        { method: 'POST', body: { userHash, amount } },
      ),
  },
};
