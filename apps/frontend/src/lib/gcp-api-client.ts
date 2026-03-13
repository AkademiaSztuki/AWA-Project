/**
 * Client for AWA backend-gcp API (Cloud Run).
 * This backend is currently safest as an optional mirror, not the primary store.
 */

const getBaseUrl = (): string | null => {
  const url = process.env.NEXT_PUBLIC_GCP_API_BASE_URL;
  return url && url.length > 0 ? url.replace(/\/$/, '') : null;
};

async function apiFetch<T = unknown>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: object } = {}
): Promise<{ data?: T; ok: boolean; error?: string }> {
  const base = getBaseUrl();
  if (!base) {
    return { ok: false, error: 'GCP_API_BASE_URL not configured' };
  }
  const { method = 'GET', body, ...rest } = options;
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...rest,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(rest.headers as Record<string, string>),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
      hint?: string;
    };
    if (!res.ok) {
      const msg = data.detail || data.error || res.statusText;
      const full = data.hint ? `${msg}\n\n${data.hint}` : msg;
      return { ok: false, error: full };
    }
    return { ok: true, data: data as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'network_error';
    return { ok: false, error: msg };
  }
}

export const gcpApi = {
  isConfigured: (): boolean => !!getBaseUrl(),

  health: () => apiFetch<{ ok: boolean; service: string }>('/health'),

  auth: {
    sendMagicLink: (payload: { email: string; nextPath?: string }) =>
      apiFetch<{ ok: boolean; dev_link?: string }>('/api/auth/send-magic-link', {
        method: 'POST',
        body: payload,
      }),
    verifyMagicLink: (payload: { token: string }) =>
      apiFetch<{ ok: boolean; user_hash?: string; auth_user_id?: string; email?: string }>(
        '/api/auth/verify-magic-link',
        { method: 'POST', body: payload }
      ),
    register: (payload: { email: string; password: string }) =>
      apiFetch<{ ok: boolean }>('/api/auth/register', {
        method: 'POST',
        body: payload,
      }),
    verifyEmail: (payload: { token: string }) =>
      apiFetch<{ ok: boolean; user_hash?: string; auth_user_id?: string; email?: string }>(
        '/api/auth/verify-email',
        { method: 'POST', body: payload }
      ),
    login: (payload: { email: string; password: string }) =>
      apiFetch<{ ok: boolean; user_hash?: string; auth_user_id?: string; email?: string }>(
        '/api/auth/login',
        { method: 'POST', body: payload }
      ),
    resendVerification: (payload: { email: string }) =>
      apiFetch<{ ok: boolean }>('/api/auth/resend-verification', {
        method: 'POST',
        body: payload,
      }),
    setPassword: (payload: { auth_user_id?: string; user_hash?: string; password: string }) =>
      apiFetch<{ ok: boolean }>('/api/auth/set-password', {
        method: 'POST',
        body: payload,
      }),
  },

  participants: {
    ensure: (userHash: string) =>
      apiFetch<{ ok: boolean; created: boolean }>('/api/ensure', {
        method: 'POST',
        body: { userHash },
      }),

    saveSession: (userHash: string, payload: { participantRow: Record<string, unknown> }) =>
      apiFetch<{ ok: boolean }>('/api/session', {
        method: 'POST',
        body: { userHash, ...payload },
      }),

    fetchSession: (userHash: string) =>
      apiFetch<{ participant?: Record<string, unknown> | null }>(`/api/session/${encodeURIComponent(userHash)}`),

    linkAuth: (payload: { userHash: string; authUserId: string; consentTimestamp?: string }) =>
      apiFetch<{ ok: boolean; existingUserHash?: string }>('/api/participants/link-auth', {
        method: 'POST',
        body: payload,
      }),

    fetchByAuth: (authUserId: string) =>
      apiFetch<{ participant?: Record<string, unknown> | null }>(
        `/api/participants/by-auth/${encodeURIComponent(authUserId)}`
      ),

    completionStatus: (params: { authUserId?: string; userHash?: string }) => {
      const search = new URLSearchParams();
      if (params.authUserId) search.set('authUserId', params.authUserId);
      if (params.userHash) search.set('userHash', params.userHash);
      return apiFetch<{ completion?: { coreProfileComplete: boolean; coreProfileCompletedAt?: string | null } }>(
        `/api/participants/completion-status?${search.toString()}`
      );
    },
  },

  swipes: {
    save: (userHash: string, swipes: Array<{
      imageId: string | number;
      direction: 'left' | 'right';
      reactionTimeMs?: number;
      reactionTime?: number;
      timestamp?: string | number;
      categories?: { style?: string | null; colors?: string[]; materials?: string[] };
      tags?: string[];
    }>) =>
      apiFetch<{ ok: boolean }>(`/api/participants/${encodeURIComponent(userHash)}/swipes`, {
        method: 'POST',
        body: { swipes },
      }),
  },

  generations: {
    start: (
      userHash: string,
      job: {
        type: 'initial' | 'micro' | 'macro';
        prompt: string;
        parameters?: Record<string, unknown>;
        has_base_image: boolean;
        modification_label?: string;
        source?: string;
      }
    ) =>
      apiFetch<{ ok: boolean; generationId?: string }>(
        `/api/participants/${encodeURIComponent(userHash)}/generations/start`,
        { method: 'POST', body: job }
      ),

    end: (
      generationId: string,
      outcome: { status: 'success' | 'error'; latency_ms: number; error_message?: string }
    ) =>
      apiFetch<{ ok: boolean }>(`/api/generations/${encodeURIComponent(generationId)}/end`, {
        method: 'POST',
        body: outcome,
      }),
  },

  images: {
    register: (
      userHash: string,
      payload: {
        type: string;
        storage_path: string;
        public_url?: string;
        thumbnail_url?: string;
        is_favorite?: boolean;
        space_id?: string;
        tags_styles?: string[];
        tags_colors?: string[];
        tags_materials?: string[];
        tags_biophilia?: number;
        description?: string;
        source?: string;
        generation_id?: string;
      }
    ) =>
      apiFetch<{ ok: boolean; imageId?: string }>(
        `/api/participants/${encodeURIComponent(userHash)}/images`,
        { method: 'POST', body: payload }
      ),

    uploadAndRegister: (payload: {
      userHash: string;
      type: 'generated' | 'inspiration' | 'room_photo' | 'room_photo_empty';
      base64Image: string;
      space_id?: string;
      tags_styles?: string[];
      tags_colors?: string[];
      tags_materials?: string[];
      tags_biophilia?: number;
      description?: string;
      source?: string;
      generation_id?: string;
    }) =>
      apiFetch<{ ok: boolean; imageId?: string; url?: string }>('/api/images/upload-and-register', {
        method: 'POST',
        body: payload,
      }),

    list: (userHash: string) =>
      apiFetch<{ images?: Array<Record<string, unknown>> }>(
        `/api/participants/${encodeURIComponent(userHash)}/images`
      ),

    update: (
      imageId: string,
      payload: {
        userHash: string;
        is_favorite?: boolean;
        tags_styles?: string[];
        tags_colors?: string[];
        tags_materials?: string[];
        tags_biophilia?: number | null;
        description?: string | null;
        space_id?: string | null;
      }
    ) =>
      apiFetch<{ ok: boolean }>(`/api/images/${encodeURIComponent(imageId)}`, {
        method: 'PATCH',
        body: payload,
      }),

    delete: (imageId: string, userHash: string) =>
      apiFetch<{ ok: boolean }>(
        `/api/images/${encodeURIComponent(imageId)}?userHash=${encodeURIComponent(userHash)}`,
        { method: 'DELETE' }
      ),
  },

  spaces: {
    list: (userHash: string) =>
      apiFetch<{ spaces?: Array<Record<string, unknown>> }>(
        `/api/participants/${encodeURIComponent(userHash)}/spaces`
      ),

    create: (
      userHash: string,
      payload: { name: string; type?: string; is_default?: boolean }
    ) =>
      apiFetch<{ ok: boolean; space?: Record<string, unknown> | null }>(
        `/api/participants/${encodeURIComponent(userHash)}/spaces`,
        { method: 'POST', body: payload }
      ),

    update: (
      spaceId: string,
      payload: { userHash: string; name?: string; type?: string }
    ) =>
      apiFetch<{ ok: boolean }>(`/api/spaces/${encodeURIComponent(spaceId)}`, {
        method: 'PATCH',
        body: payload,
      }),

    delete: (spaceId: string, userHash: string) =>
      apiFetch<{ ok: boolean }>(
        `/api/spaces/${encodeURIComponent(spaceId)}?userHash=${encodeURIComponent(userHash)}`,
        { method: 'DELETE' }
      ),
  },

  research: {
    consent: (payload: {
      userId: string;
      consent: {
        consentResearch: boolean;
        consentProcessing: boolean;
        acknowledgedArt13: boolean;
      };
      locale: 'pl' | 'en';
      consentVersion: string;
    }) =>
      apiFetch<{ ok: boolean; consentId?: number }>('/api/research/consent', {
        method: 'POST',
        body: payload,
      }),

    generationFeedback: (payload: Record<string, unknown>) =>
      apiFetch<{ ok: boolean }>('/api/research/generation-feedback', {
        method: 'POST',
        body: payload,
      }),

    regenerationEvent: (payload: Record<string, unknown>) =>
      apiFetch<{ ok: boolean }>('/api/research/regeneration-event', {
        method: 'POST',
        body: payload,
      }),

    survey: (payload: {
      userHash: string;
      type: 'sus' | 'clarity' | 'agency' | 'satisfaction';
      answers: Record<string, number>;
      score: number;
    }) =>
      apiFetch<{ ok: boolean }>('/api/research/survey', {
        method: 'POST',
        body: payload,
      }),
  },

  credits: {
    balance: (userHash: string) =>
      apiFetch<{
        balance: number;
        generationsAvailable: number;
        hasActiveSubscription: boolean;
        subscriptionCreditsRemaining: number;
        subscription?: Record<string, unknown> | null;
      }>(`/api/credits/balance/${encodeURIComponent(userHash)}`),

    check: (payload: { userHash: string; amount?: number }) =>
      apiFetch<{ ok: boolean; available?: boolean }>('/api/credits/check', {
        method: 'POST',
        body: payload,
      }),

    deduct: (payload: { userHash: string; generationId: string }) =>
      apiFetch<{ ok: boolean; success?: boolean }>('/api/credits/deduct', {
        method: 'POST',
        body: payload,
      }),

    grantFree: (payload: { userHash: string }) =>
      apiFetch<{ ok: boolean; granted?: boolean }>('/api/credits/grant-free', {
        method: 'POST',
        body: payload,
      }),
  },

  billing: {
    checkoutCompleted: (payload: Record<string, unknown>) =>
      apiFetch<{ ok: boolean }>('/api/billing/stripe/checkout-completed', {
        method: 'POST',
        body: payload,
      }),
    subscriptionUpdated: (payload: Record<string, unknown>) =>
      apiFetch<{ ok: boolean }>('/api/billing/stripe/subscription-updated', {
        method: 'POST',
        body: payload,
      }),
    subscriptionDeleted: (payload: Record<string, unknown>) =>
      apiFetch<{ ok: boolean }>('/api/billing/stripe/subscription-deleted', {
        method: 'POST',
        body: payload,
      }),
    invoicePaymentSucceeded: (payload: Record<string, unknown>) =>
      apiFetch<{ ok: boolean }>('/api/billing/stripe/invoice-payment-succeeded', {
        method: 'POST',
        body: payload,
      }),
    invoicePaymentFailed: (payload: Record<string, unknown>) =>
      apiFetch<{ ok: boolean }>('/api/billing/stripe/invoice-payment-failed', {
        method: 'POST',
        body: payload,
      }),
  },
};
