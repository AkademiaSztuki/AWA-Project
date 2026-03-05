/**
 * Client for AWA backend-gcp API (Cloud Run).
 * Use when NEXT_PUBLIC_GCP_API_BASE_URL is set to switch from Supabase to GCP.
 */

const getBaseUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const url = process.env.NEXT_PUBLIC_GCP_API_BASE_URL;
  return url && url.length > 0 ? url.replace(/\/$/, '') : null;
};

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  method?: string;
  body?: Record<string, unknown>;
}

async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
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

export const gcpApi = {
  isConfigured: (): boolean => !!getBaseUrl(),

  health: () => apiFetch<{ ok: boolean; service: string }>('/health'),

  participants: {
    ensure: (userHash: string) =>
      apiFetch<{ ok: boolean; created: boolean }>('/api/ensure', {
        method: 'POST',
        body: { userHash },
      }),

    saveSession: (userHash: string, sessionData: Record<string, unknown>) =>
      apiFetch<{ ok: boolean }>('/api/session', {
        method: 'POST',
        body: { ...sessionData, userHash },
      }),

    fetchSession: (userHash: string) =>
      apiFetch<{ participant?: Record<string, unknown> | null }>(`/api/session/${encodeURIComponent(userHash)}`),

    byAuth: (authUserId: string) =>
      apiFetch<{ participants: Array<Record<string, unknown>> }>(
        `/api/participants/by-auth/${encodeURIComponent(authUserId)}`
      ),
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
      sessionId: string;
      type: string;
      answers: Record<string, unknown>;
      susScore?: number;
      clarityScore?: number;
      agencyScore?: number;
      satisfactionScore?: number;
    }) =>
      apiFetch<{ ok: boolean; surveyId?: string }>('/api/research/survey', {
        method: 'POST',
        body: payload,
      }),
  },
};
