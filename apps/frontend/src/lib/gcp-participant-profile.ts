/**
 * Participant profile & related helpers — GCP Cloud Run API only.
 * Source of truth: Cloud SQL `participants` and related endpoints.
 */

import {
  UserProfile,
  Household,
  Room,
  DesignSession,
  CompletionStatus,
  EnhancedSwipeData,
  SwipePattern,
} from '@/types/deep-personalization';
import { ensureParticipantExists } from '@/lib/gcp-data';
import { gcpApi } from '@/lib/gcp-api-client';
import { normalizeSemanticTo01 } from '@/lib/semantic-scale';

// =========================
// USER PROFILE
// =========================

export async function getUserProfile(
  userHash: string,
): Promise<UserProfile | null> {
  try {
    const result = await gcpApi.participants.fetchSession(userHash);
    if (!result.ok) {
      console.warn('Error fetching user profile:', result.error);
      return null;
    }
    const data: any = result.data?.participant || null;
    if (!data) return null;

    const implicitColors = [
      data.implicit_color_1,
      data.implicit_color_2,
      data.implicit_color_3,
    ].filter(Boolean) as string[];
    const implicitMaterials = [
      data.implicit_material_1,
      data.implicit_material_2,
      data.implicit_material_3,
    ].filter(Boolean) as string[];
    const implicitStyles = [
      data.implicit_style_1,
      data.implicit_style_2,
      data.implicit_style_3,
    ].filter(Boolean) as string[];
    const explicitMaterials = [
      data.explicit_material_1,
      data.explicit_material_2,
      data.explicit_material_3,
    ].filter(Boolean) as string[];

    const profile = {
      userHash: data.user_hash,
      auth_user_id: data.auth_user_id,
      aestheticDNA: {
        implicit: {
          dominantStyles: implicitStyles.length
            ? implicitStyles
            : data.implicit_dominant_style
              ? [data.implicit_dominant_style]
              : [],
          colors: implicitColors,
          materials: implicitMaterials,
          warmth: data.implicit_warmth ?? 0.5,
          brightness: data.implicit_brightness ?? 0.5,
          complexity: data.implicit_complexity ?? 0.5,
          swipePatterns: [],
        },
        explicit: {
          selectedStyle: data.explicit_style || '',
          selectedPalette: data.explicit_palette || '',
          topMaterials: explicitMaterials,
          ...((): Record<string, number> => {
            const w = normalizeSemanticTo01(data.explicit_warmth);
            const b = normalizeSemanticTo01(data.explicit_brightness);
            const c = normalizeSemanticTo01(data.explicit_complexity);
            const out: Record<string, number> = {};
            if (w !== undefined) out.warmthPreference = w;
            if (b !== undefined) out.brightnessPreference = b;
            if (c !== undefined) out.complexityPreference = c;
            return out;
          })(),
        },
      },
      psychologicalBaseline: {
        biophiliaScore: data.biophilia_score,
        prsIdeal:
          data.prs_ideal_x !== null && data.prs_ideal_x !== undefined
            ? { x: data.prs_ideal_x, y: data.prs_ideal_y ?? 0 }
            : undefined,
      },
      lifestyle:
        data.life_vibe || (data.life_goals && data.life_goals.length)
          ? { vibe: data.life_vibe || '', goals: data.life_goals || [], values: [] }
          : undefined,
      sensoryPreferences:
        data.sensory_music || data.sensory_texture || data.sensory_light
          ? {
              music: data.sensory_music || '',
              texture: data.sensory_texture || '',
              light: data.sensory_light || '',
              natureMetaphor: data.nature_metaphor || '',
            }
          : undefined,
      personality:
        (data.big5_openness !== null && data.big5_openness !== undefined) ||
        data.big5_completed_at
          ? {
              instrument: 'IPIP-NEO-120',
              domains: {
                O: data.big5_openness,
                C: data.big5_conscientiousness,
                E: data.big5_extraversion,
                A: data.big5_agreeableness,
                N: data.big5_neuroticism,
              },
              facets: data.big5_facets || {},
              completedAt: data.big5_completed_at,
            }
          : undefined,
      inspirations: [],
      profileCompletedAt: data.core_profile_completed_at,
      profileVersion: 1,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
    } as UserProfile;

    return profile;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as any).code !== 'PGRST116'
    ) {
      console.warn('Error fetching user profile (catch):', error);
    }
    return null;
  }
}

export async function getUserProfileFromAuth(
  authUserId: string,
): Promise<UserProfile | null> {
  try {
    const result = await gcpApi.participants.fetchByAuth(authUserId);
    if (!result.ok) {
      console.warn('Error fetching user profile from auth:', result.error);
      return null;
    }
    const data: any = result.data?.participant || null;
    if (!data) return null;
    return getUserProfile(data.user_hash);
  } catch (error) {
    console.warn('Error in getUserProfileFromAuth:', error);
    return null;
  }
}

export async function getBestProfileForAuth(
  authUserId: string,
): Promise<UserProfile | null> {
  try {
    const result = await gcpApi.participants.fetchByAuth(authUserId);
    if (!result.ok) {
      console.warn('Error fetching best profile from auth:', result.error);
      return null;
    }
    const data: any = result.data?.participant || null;
    if (!data) return null;
    return getUserProfile(data.user_hash);
  } catch (error) {
    console.warn('Error in getBestProfileForAuth:', error);
    return null;
  }
}

export async function getUserHashFromAuth(
  authUserId: string,
): Promise<string | null> {
  try {
    const result = await gcpApi.participants.fetchByAuth(authUserId);
    if (!result.ok) {
      console.warn('Error fetching user_hash from auth:', result.error);
      return null;
    }
    const participant = result.data?.participant as
      | { user_hash?: string }
      | null
      | undefined;
    return participant?.user_hash ?? null;
  } catch (error) {
    console.warn('Error in getUserHashFromAuth:', error);
    return null;
  }
}

export async function saveUserProfile(
  _profile: Partial<UserProfile>,
): Promise<UserProfile | null> {
  return null;
}

export async function getCoreProfileCompletionStatus(options: {
  authUserId?: string;
  userHash?: string;
}): Promise<{
  coreProfileComplete: boolean;
  coreProfileCompletedAt?: string | null;
} | null> {
  const { authUserId, userHash } = options;
  if (!authUserId && !userHash) return null;

  try {
    if (authUserId) {
      const result = await gcpApi.participants.completionStatus({ authUserId });
      if (result.ok && result.data?.completion) {
        return {
          coreProfileComplete: !!result.data.completion.coreProfileComplete,
          coreProfileCompletedAt: result.data.completion.coreProfileCompletedAt,
        };
      }
    }

    if (userHash) {
      const result = await gcpApi.participants.completionStatus({ userHash });
      if (result.ok && result.data?.completion) {
        return {
          coreProfileComplete: !!result.data.completion.coreProfileComplete,
          coreProfileCompletedAt: result.data.completion.coreProfileCompletedAt,
        };
      }
    }

    return { coreProfileComplete: false, coreProfileCompletedAt: null };
  } catch (error) {
    console.warn('getCoreProfileCompletionStatus error:', error);
    return null;
  }
}

export async function getCompletionStatus(
  userHash: string,
  authUserId?: string,
): Promise<CompletionStatus | null> {
  const completion = await getCoreProfileCompletionStatus({
    authUserId,
    userHash,
  });
  if (!completion) return null;

  return {
    coreProfileComplete: !!completion.coreProfileComplete,
    hasHouseholds: false,
    householdCount: 0,
    roomCount: 0,
    sessionCount: 0,
    nextStep: completion.coreProfileComplete ? 'ready' : 'complete_profile',
  };
}

// =========================
// HOUSEHOLDS (legacy stubs)
// =========================
export async function getUserHouseholds(
  _userHash: string,
): Promise<Household[]> {
  return [];
}

export async function ensureUserProfileExists(
  userHash: string,
): Promise<boolean> {
  try {
    return await ensureParticipantExists(userHash);
  } catch (error) {
    console.error('Error ensuring user profile exists:', error);
    return false;
  }
}

export async function saveHousehold(
  _household: Omit<Household, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Household | null> {
  return null;
}

export async function updateHousehold(
  _id: string,
  _updates: Partial<Household>,
): Promise<boolean> {
  return false;
}

// =========================
// ROOMS (legacy stubs)
// =========================
export async function getHouseholdRooms(
  _householdId: string,
): Promise<Room[]> {
  return [];
}

export async function getRoom(_roomId: string): Promise<Room | null> {
  return null;
}

export async function saveRoom(
  _room: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Room | null> {
  return null;
}

export async function updateRoom(
  _roomId: string,
  _updates: Partial<Room>,
): Promise<boolean> {
  return false;
}

// =========================
// DESIGN SESSIONS (legacy stubs)
// =========================
export async function getRoomSessions(
  _roomId: string,
): Promise<DesignSession[]> {
  return [];
}

export async function getLatestSession(
  _roomId: string,
): Promise<DesignSession | null> {
  return null;
}

export async function saveDesignSession(
  _session: Omit<DesignSession, 'id' | 'sessionNumber' | 'createdAt'>,
): Promise<DesignSession | null> {
  return null;
}

export async function updateDesignSession(
  _sessionId: string,
  _updates: Partial<DesignSession>,
): Promise<boolean> {
  return false;
}

// =========================
// ENHANCED SWIPES (legacy stubs)
// =========================
export async function saveEnhancedSwipe(
  _userHash: string,
  _sessionContext: string,
  _swipe: EnhancedSwipeData,
): Promise<boolean> {
  return false;
}

export async function getSwipePatterns(
  _userHash: string,
  _sessionContext?: string,
): Promise<SwipePattern[]> {
  return [];
}

// =========================
// COMPLETE PROFILE FETCH (legacy stub)
// =========================
export async function getUserCompleteProfile(
  _userHash: string,
): Promise<{
  profile: UserProfile | null;
  households: Array<
    Household & { rooms: Array<Room & { sessions: DesignSession[] }> }
  >;
} | null> {
  return null;
}
