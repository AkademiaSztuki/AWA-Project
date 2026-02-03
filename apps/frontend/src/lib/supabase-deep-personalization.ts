// Supabase helpers for Deep Personalization Architecture
// CRUD operations for user_profiles, households, rooms, design_sessions

import {
  UserProfile,
  Household,
  Room,
  DesignSession,
  CompletionStatus,
  EnhancedSwipeData,
  SwipePattern
} from '@/types/deep-personalization';
import { supabase, ensureParticipantExists } from '@/lib/supabase'; // Use shared Supabase client to avoid multiple instances

// =========================
// USER PROFILE
// =========================

export async function getUserProfile(userHash: string): Promise<UserProfile | null> {
  try {
    // New source of truth after refactor: participants (+ aggregates updated from participant_swipes)
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('user_hash', userHash)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 errors

    if (error) {
      // PGRST116 means no rows found - this is normal for new users
      // 406 Not Acceptable can also occur when using .single() with no rows
      if (error.code === 'PGRST116' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
        console.log('User profile not found (new user) - this is normal');
        return null;
      }
      // Log other errors but don't throw - return null gracefully
      console.warn('Error fetching user profile:', error.code, error.message);
      return null;
    }
    
    if (!data) return null;

    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-deep-personalization.ts:getUserProfile-raw-data',message:'Raw participant data from getUserProfile',data:{dbWarmth:data.explicit_warmth,dbBrightness:data.explicit_brightness,dbComplexity:data.explicit_complexity},timestamp:Date.now(),sessionId:'debug-session',runId:'getUserProfile-retrieve',hypothesisId:'I'})}).catch(()=>{});
    // #endregion

    const implicitColors = [data.implicit_color_1, data.implicit_color_2, data.implicit_color_3].filter(Boolean) as string[];
    const implicitMaterials = [data.implicit_material_1, data.implicit_material_2, data.implicit_material_3].filter(Boolean) as string[];
    const implicitStyles = [data.implicit_style_1, data.implicit_style_2, data.implicit_style_3].filter(Boolean) as string[];
    const explicitMaterials = [data.explicit_material_1, data.explicit_material_2, data.explicit_material_3].filter(Boolean) as string[];

    // Map participants row to legacy UserProfile shape expected by existing UI mappers
    const profile = {
      userHash: data.user_hash,
      auth_user_id: data.auth_user_id, // keep for auth mapping
      aestheticDNA: {
        implicit: {
          dominantStyles: implicitStyles.length ? implicitStyles : (data.implicit_dominant_style ? [data.implicit_dominant_style] : []),
          colors: implicitColors,
          materials: implicitMaterials,
          // Use values from database columns if available, fallback to neutral defaults
          warmth: data.implicit_warmth ?? 0.5,
          brightness: data.implicit_brightness ?? 0.5,
          complexity: data.implicit_complexity ?? 0.5,
          swipePatterns: []
        },
        explicit: {
          selectedStyle: data.explicit_style || '',
          selectedPalette: data.explicit_palette || '',
          topMaterials: explicitMaterials,
          warmthPreference: (() => {
            const val = data.explicit_warmth ?? 0.5;
            // #region agent log
            void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-deep-personalization.ts:getUserProfile-warmthPreference',message:'Mapping warmthPreference from getUserProfile',data:{dbWarmth:data.explicit_warmth,mappedWarmth:val},timestamp:Date.now(),sessionId:'debug-session',runId:'getUserProfile-mapping',hypothesisId:'I'})}).catch(()=>{});
            // #endregion
            return val;
          })(),
          brightnessPreference: (() => {
            const val = data.explicit_brightness ?? 0.5;
            // #region agent log
            void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-deep-personalization.ts:getUserProfile-brightnessPreference',message:'Mapping brightnessPreference from getUserProfile',data:{dbBrightness:data.explicit_brightness,mappedBrightness:val},timestamp:Date.now(),sessionId:'debug-session',runId:'getUserProfile-mapping',hypothesisId:'I'})}).catch(()=>{});
            // #endregion
            return val;
          })(),
          complexityPreference: (() => {
            const val = data.explicit_complexity ?? 0.5;
            // #region agent log
            void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-deep-personalization.ts:getUserProfile-complexityPreference',message:'Mapping complexityPreference from getUserProfile',data:{dbComplexity:data.explicit_complexity,mappedComplexity:val},timestamp:Date.now(),sessionId:'debug-session',runId:'getUserProfile-mapping',hypothesisId:'I'})}).catch(()=>{});
            // #endregion
            return val;
          })()
        }
      },
      psychologicalBaseline: {
        biophiliaScore: data.biophilia_score,
        prsIdeal: data.prs_ideal_x !== null && data.prs_ideal_x !== undefined ? { x: data.prs_ideal_x, y: data.prs_ideal_y ?? 0 } : undefined
      },
      lifestyle: data.life_vibe || (data.life_goals && data.life_goals.length) ? { 
        vibe: data.life_vibe || '', 
        goals: data.life_goals || [],
        values: []
      } : undefined,
      sensoryPreferences: data.sensory_music || data.sensory_texture || data.sensory_light ? {
        music: data.sensory_music || '',
        texture: data.sensory_texture || '',
        light: data.sensory_light || '',
        natureMetaphor: data.nature_metaphor || ''
      } : undefined,
      personality: (data.big5_openness !== null && data.big5_openness !== undefined) || data.big5_completed_at ? {
        instrument: 'IPIP-NEO-120',
        domains: {
          O: data.big5_openness,
          C: data.big5_conscientiousness,
          E: data.big5_extraversion,
          A: data.big5_agreeableness,
          N: data.big5_neuroticism
        },
        facets: data.big5_facets || {},
        completedAt: data.big5_completed_at
      } : undefined,
      inspirations: [], // now sourced from participant_images
      profileCompletedAt: data.core_profile_completed_at,
      profileVersion: 1,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString()
    } as UserProfile;
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'explicit-check',
        hypothesisId: 'E20',
        location: 'supabase-deep-personalization.ts:getUserProfile-explicit',
        message: 'Loading explicit preferences from Supabase',
        data: {
          userHash: profile.userHash,
          hasAestheticDNA: !!profile.aestheticDNA,
          hasExplicit: !!profile.aestheticDNA?.explicit,
          explicitSelectedStyle: (profile.aestheticDNA?.explicit as any)?.selectedStyle,
          explicitSelectedPalette: profile.aestheticDNA?.explicit?.selectedPalette,
          explicitTopMaterials: profile.aestheticDNA?.explicit?.topMaterials || [],
          implicitStyleCount: profile.aestheticDNA?.implicit?.dominantStyles?.length || 0,
          implicitColorsCount: profile.aestheticDNA?.implicit?.colors?.length || 0,
          implicitMaterialsCount: profile.aestheticDNA?.implicit?.materials?.length || 0
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'incognito-fix',
        hypothesisId: 'I12',
        location: 'supabase-deep-personalization.ts:getUserProfile-auth_user_id',
        message: 'Mapped auth_user_id from Supabase',
        data: {
          userHash: profile.userHash,
          auth_user_id: profile.auth_user_id,
          hasAuthUserId: !!profile.auth_user_id,
          rawAuthUserId: data.auth_user_id
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'explicit-check',
        hypothesisId: 'E8',
        location: 'supabase-deep-personalization.ts:getUserProfile-biophilia',
        message: 'Loading biophiliaScore from Supabase',
        data: {
          biophiliaScore: profile.psychologicalBaseline?.biophiliaScore,
          prsIdeal: profile.psychologicalBaseline?.prsIdeal,
          hasPsychologicalBaseline: !!profile.psychologicalBaseline,
          userHash: profile.userHash
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    return profile;
  } catch (error) {
    // Only log non-PGRST116 errors as warnings
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'PGRST116') {
      console.warn('Error fetching user profile (catch):', error);
    }
    return null;
  }
}

/**
 * Get user profile with data from Supabase based on authenticated user ID
 * This is used to restore user_hash after login when profile has data
 */
export async function getUserProfileFromAuth(authUserId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('auth_user_id', authUserId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No profile linked yet
      }
      console.warn('Error fetching user profile from auth:', error);
      return null;
    }
    
    if (!data) return null;
    
    const profile = await getUserProfile(data.user_hash);
    if (!profile) return null;
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'incognito-fix',
        hypothesisId: 'I15',
        location: 'supabase-deep-personalization.ts:getUserProfileFromAuth',
        message: 'Found user profile from auth_user_id',
        data: {
          userHash: profile.userHash,
          auth_user_id: profile.auth_user_id,
          hasPersonality: !!profile.personality,
          hasImplicit: !!profile.aestheticDNA?.implicit,
          hasExplicit: !!profile.aestheticDNA?.explicit,
          hasSensory: !!profile.sensoryPreferences,
          hasBiophilia: profile.psychologicalBaseline?.biophiliaScore !== undefined,
          profileCompletedAt: profile.profileCompletedAt
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
    return profile;
  } catch (error) {
    console.warn('Error in getUserProfileFromAuth:', error);
    return null;
  }
}

/**
 * Get the best (non-empty) profile for an authenticated user.
 * Prefers profiles that have any data (personality, aestheticDNA implicit/explicit, sensory, biophilia).
 * If none have data, returns the most recently updated profile for that auth_user_id.
 */
export async function getBestProfileForAuth(authUserId: string): Promise<UserProfile | null> {
  try {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'incognito-fix',
        hypothesisId: 'I15',
        location: 'supabase-deep-personalization.ts:getBestProfileForAuth',
        message: 'getBestProfileForAuth called',
        data: { authUserId },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('auth_user_id', authUserId)
      .order('updated_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.warn('Error fetching best profile from auth:', error);
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'incognito-fix',
          hypothesisId: 'I15e',
          location: 'supabase-deep-personalization.ts:getBestProfileForAuth',
          message: 'Error fetching best profile from auth',
          data: { authUserId, errorCode: error.code, errorMessage: error.message },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
      return null;
    }

    if (!data || data.length === 0) return null;

    // Pick first row that has any meaningful data (participants columns)
    const hasData = (row: any) =>
      row.big5_completed_at ||
      row.explicit_style ||
      row.implicit_style_1 ||
      row.biophilia_score !== null;

    const candidate = data.find(hasData) || data[0];
    const profile = await getUserProfile(candidate.user_hash);
    if (!profile) return null;

    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'incognito-fix',
        hypothesisId: 'I16',
        location: 'supabase-deep-personalization.ts:getBestProfileForAuth',
        message: 'Selected best profile for auth_user_id',
        data: {
          authUserId,
          userHash: profile.userHash,
          hasPersonality: !!profile.personality,
          hasImplicit: !!profile.aestheticDNA?.implicit,
          hasExplicit: !!profile.aestheticDNA?.explicit,
          hasSensory: !!profile.sensoryPreferences,
          hasBiophilia: profile.psychologicalBaseline?.biophiliaScore !== undefined,
          profileCompletedAt: profile.profileCompletedAt,
          candidateCount: data.length
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    return profile;
  } catch (error) {
    console.warn('Error in getBestProfileForAuth:', error);
    return null;
  }
}

/**
 * Get user_hash from Supabase based on authenticated user ID
 * This is used to restore user_hash after login
 */
export async function getUserHashFromAuth(authUserId: string): Promise<string | null> {
  try {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'incognito-fix',
        hypothesisId: 'I4',
        location: 'supabase-deep-personalization.ts:getUserHashFromAuth',
        message: 'getUserHashFromAuth called',
        data: {
          authUserId
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    const { data, error } = await supabase
      .from('participants')
      .select('user_hash')
      .eq('auth_user_id', authUserId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Error fetching user_hash from auth:', error);
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'incognito-fix',
          hypothesisId: 'I6',
          location: 'supabase-deep-personalization.ts:getUserHashFromAuth',
          message: 'Error fetching user_hash from auth',
          data: {
            authUserId,
            errorCode: error.code,
            errorMessage: error.message
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
      return null;
    }
    
    if (!data || data.length === 0) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'incognito-fix',
          hypothesisId: 'I5',
          location: 'supabase-deep-personalization.ts:getUserHashFromAuth',
          message: 'No profile linked yet',
          data: { authUserId },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
      return null;
    }
    
    const userHash = data[0].user_hash;
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'incognito-fix',
        hypothesisId: 'I7',
        location: 'supabase-deep-personalization.ts:getUserHashFromAuth',
        message: 'getUserHashFromAuth result',
        data: {
          authUserId,
          foundUserHash: userHash,
          rowCount: data.length
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
    return userHash;
  } catch (error) {
    console.warn('Error in getUserHashFromAuth:', error);
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'incognito-fix',
        hypothesisId: 'I8',
        location: 'supabase-deep-personalization.ts:getUserHashFromAuth',
        message: 'Exception in getUserHashFromAuth',
        data: {
          authUserId,
          errorMessage: error instanceof Error ? error.message : String(error)
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    return null;
  }
}

export async function saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    // Legacy user_profiles table removed after radical refactor.
    // Source of truth is participants + participant_* tables.
    return null;

    if (!profile.userHash) {
      console.warn('saveUserProfile: userHash is required');
      return null;
    }
    
    // Type guard: after check, userHash is definitely string
    const userHash = profile.userHash!;
    
    // First, get existing profile to preserve auth_user_id
    const existing = await getUserProfile(userHash);
    
    // Get authenticated user ID if available
    let authUserId: string | undefined = existing?.auth_user_id;
    if (!authUserId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          authUserId = session?.user?.id!;
          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'incognito-fix',
              hypothesisId: 'I3',
              location: 'supabase-deep-personalization.ts:saveUserProfile-authUserId',
              message: 'Setting auth_user_id in user_profiles',
              data: {
                userHash: profile.userHash,
                authUserId: authUserId,
                hadExistingAuthUserId: !!existing?.auth_user_id
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion
        }
      } catch (error) {
        console.warn('[saveUserProfile] Failed to get auth user ID:', error);
      }
    }
    
    // Build upsert data - only include fields that exist
    const upsertData: any = {
      user_hash: profile.userHash,
      auth_user_id: authUserId || undefined, // Set auth_user_id if available
      updated_at: new Date().toISOString()
    };
    
    // Only include fields that are defined (to avoid schema errors)
    if (profile.aestheticDNA !== undefined) {
      // CRITICAL: Don't overwrite selectedStyle with empty string ""
      // If selectedStyle is undefined, keep existing value in Supabase
      const aestheticDNA = { ...profile.aestheticDNA };
      if (aestheticDNA.explicit) {
        // If selectedStyle is empty string "", don't include it (keep existing value)
        if ((aestheticDNA.explicit as any).selectedStyle === '') {
          delete (aestheticDNA.explicit as any).selectedStyle;
        }
      }
      upsertData.aesthetic_dna = aestheticDNA;
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'explicit-check',
          hypothesisId: 'E14',
          location: 'supabase-deep-personalization.ts:saveUserProfile-aestheticDNA',
          message: 'Saving aestheticDNA to Supabase',
          data: {
            userHash: profile.userHash,
            hasImplicit: !!profile.aestheticDNA?.implicit,
            hasExplicit: !!profile.aestheticDNA?.explicit,
            explicitSelectedStyle: (profile.aestheticDNA?.explicit as any)?.selectedStyle || null,
            explicitSelectedStyleType: typeof (profile.aestheticDNA?.explicit as any)?.selectedStyle,
            explicitSelectedStyleIsEmpty: (profile.aestheticDNA?.explicit as any)?.selectedStyle === '',
            explicitSelectedStyleIsNull: (profile.aestheticDNA?.explicit as any)?.selectedStyle === null,
            explicitSelectedStyleIsUndefined: (profile.aestheticDNA?.explicit as any)?.selectedStyle === undefined,
            explicitSelectedPalette: profile.aestheticDNA?.explicit?.selectedPalette || null,
            explicitTopMaterials: profile.aestheticDNA?.explicit?.topMaterials || [],
            explicitTopMaterialsCount: profile.aestheticDNA?.explicit?.topMaterials?.length || 0,
            explicitWarmth: profile.aestheticDNA?.explicit?.warmthPreference,
            explicitBrightness: profile.aestheticDNA?.explicit?.brightnessPreference,
            explicitComplexity: profile.aestheticDNA?.explicit?.complexityPreference,
            rawAestheticDNA: profile.aestheticDNA,
            rawExplicit: profile.aestheticDNA?.explicit
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
    }
    if (profile.psychologicalBaseline !== undefined) {
      upsertData.psychological_baseline = profile.psychologicalBaseline;
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'explicit-check',
          hypothesisId: 'E7',
          location: 'supabase-deep-personalization.ts:saveUserProfile-biophilia',
          message: 'Saving biophiliaScore to Supabase',
          data: {
            biophiliaScore: profile.psychologicalBaseline?.biophiliaScore,
            prsIdeal: profile.psychologicalBaseline?.prsIdeal,
            userHash: profile.userHash
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
    }
    if (profile.lifestyle !== undefined) upsertData.lifestyle_data = profile.lifestyle;
    if (profile.sensoryPreferences !== undefined) upsertData.sensory_preferences = profile.sensoryPreferences;
    if (profile.projectiveResponses !== undefined) upsertData.projective_responses = profile.projectiveResponses;
    if (profile.inspirations !== undefined) upsertData.inspirations = profile.inspirations;
    if (profile.profileCompletedAt !== undefined) upsertData.profile_completed_at = profile.profileCompletedAt;
    
    // Only include personality if it exists (column may not exist in some schemas)
    if (profile.personality !== undefined && profile.personality !== null) {
      upsertData.personality = profile.personality;
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(upsertData, {
        onConflict: 'user_hash' // Update existing profile by user_hash
      })
      .select()
      .single();

    if (error) {
      // If personality column doesn't exist, try again without it
      if (error?.code === 'PGRST204' && error?.message?.includes('personality')) {
        console.warn('⚠️ Personality column not found in Supabase!');
        console.warn('⚠️ Please run migration: apps/frontend/supabase/migrations/20250131000000_add_personality_inspirations.sql');
        console.warn('⚠️ Or run SQL from: apps/frontend/ADD_PERSONALITY_COLUMN.sql in Supabase SQL Editor');
        
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'sync-check',
            hypothesisId: 'H8',
            location: 'supabase-deep-personalization.ts:personality-column-missing',
            message: 'Personality column missing - migration needed',
            data: {
              error: error?.message,
              errorCode: error?.code,
              hasPersonality: !!profile.personality,
              migrationFile: '20250131000000_add_personality_inspirations.sql'
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        
        delete upsertData.personality;
        const { data: retryData, error: retryError } = await supabase
          .from('user_profiles')
          .upsert(upsertData, {
            onConflict: 'user_hash'
          })
          .select()
          .single();
        if (retryError) throw retryError;
        
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'sync-check',
            hypothesisId: 'H8',
            location: 'supabase-deep-personalization.ts:personality-skipped',
            message: 'Profile saved without personality (column missing)',
            data: {
              savedWithoutPersonality: true,
              hasPersonalityInProfile: !!profile.personality
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        
        return retryData as UserProfile;
      }
      throw error;
    }
    return data as UserProfile;
  } catch (error) {
    console.error('Error saving user profile:', error);
    return null;
  }
}

export async function getCoreProfileCompletionStatus(options: {
  authUserId?: string;
  userHash?: string;
}): Promise<{ coreProfileComplete: boolean; coreProfileCompletedAt?: string | null } | null> {
  const { authUserId, userHash } = options;

  if (!authUserId && !userHash) return null;

  try {
    if (authUserId) {
      const { data, error } = await supabase
        .from('participants')
        .select('core_profile_complete, core_profile_completed_at, updated_at, user_hash')
        .eq('auth_user_id', authUserId)
        .order('core_profile_complete', { ascending: false })
        .order('core_profile_completed_at', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('getCoreProfileCompletionStatus (auth_user_id) error:', error);
      }

      if (data) {
        return {
          coreProfileComplete: !!data.core_profile_complete,
          coreProfileCompletedAt: data.core_profile_completed_at
        };
      }
    }

    if (userHash) {
      const { data, error } = await supabase
        .from('participants')
        .select('core_profile_complete, core_profile_completed_at')
        .eq('user_hash', userHash)
        .maybeSingle();

      if (error) {
        console.warn('getCoreProfileCompletionStatus (user_hash) error:', error);
        return null;
      }

      if (data) {
        return {
          coreProfileComplete: !!data.core_profile_complete,
          coreProfileCompletedAt: data.core_profile_completed_at
        };
      }
    }

    return { coreProfileComplete: false, coreProfileCompletedAt: null };
  } catch (error) {
    console.warn('getCoreProfileCompletionStatus error:', error);
    return null;
  }
}

export async function getCompletionStatus(userHash: string, authUserId?: string): Promise<CompletionStatus | null> {
  const completion = await getCoreProfileCompletionStatus({ authUserId, userHash });
  if (!completion) return null;

  const coreProfileComplete = !!completion.coreProfileComplete;
  return {
    coreProfileComplete,
    hasHouseholds: false,
    householdCount: 0,
    roomCount: 0,
    sessionCount: 0,
    nextStep: coreProfileComplete ? 'ready' : 'complete_profile'
  };
}

// =========================
// HOUSEHOLDS
// =========================

export async function getUserHouseholds(userHash: string): Promise<Household[]> {
  // Legacy table removed after radical refactor
  return [];
}

/**
 * Ensures a user profile exists for the given userHash.
 * Creates a minimal profile if it doesn't exist.
 */
export async function ensureUserProfileExists(userHash: string): Promise<boolean> {
  try {
    // After refactor, "profile" existence == participants row existence
    return await ensureParticipantExists(userHash);
  } catch (error) {
    console.error('Error ensuring user profile exists:', error);
    return false;
  }
}

export async function saveHousehold(household: Omit<Household, 'id' | 'createdAt' | 'updatedAt'>): Promise<Household | null> {
  // Legacy table removed after radical refactor
  return null;
}

export async function updateHousehold(id: string, updates: Partial<Household>): Promise<boolean> {
  // Legacy table removed after radical refactor
  return false;
}

// =========================
// ROOMS
// =========================

export async function getHouseholdRooms(householdId: string): Promise<Room[]> {
  // Legacy table removed after radical refactor
  return [];
}

export async function getRoom(roomId: string): Promise<Room | null> {
  // Legacy table removed after radical refactor
  return null;
}

export async function saveRoom(room: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>): Promise<Room | null> {
  // Legacy table removed after radical refactor (room data lives in participants + participant_images)
  return null;
}

export async function updateRoom(roomId: string, updates: Partial<Room>): Promise<boolean> {
  // Legacy table removed after radical refactor
  return false;
}

// =========================
// DESIGN SESSIONS
// =========================

export async function getRoomSessions(roomId: string): Promise<DesignSession[]> {
  // Legacy table removed after radical refactor
  return [];
}

export async function getLatestSession(roomId: string): Promise<DesignSession | null> {
  // Legacy table removed after radical refactor
  return null;
}

export async function saveDesignSession(
  session: Omit<DesignSession, 'id' | 'sessionNumber' | 'createdAt'>
): Promise<DesignSession | null> {
  // Legacy table removed after radical refactor
  return null;
}

export async function updateDesignSession(
  sessionId: string,
  updates: Partial<DesignSession>
): Promise<boolean> {
  // Legacy table removed after radical refactor
  return false;
}

// =========================
// ENHANCED SWIPES (Research tracking)
// =========================

export async function saveEnhancedSwipe(
  userHash: string,
  sessionContext: string,  // "core_profile" or roomId
  swipe: EnhancedSwipeData
): Promise<boolean> {
  // Legacy table removed after radical refactor
  return false;
}

export async function getSwipePatterns(
  userHash: string,
  sessionContext?: string
): Promise<SwipePattern[]> {
  // Legacy table removed after radical refactor
  return [];
}

// =========================
// COMPLETE PROFILE FETCH
// =========================

export async function getUserCompleteProfile(userHash: string): Promise<{
  profile: UserProfile | null;
  households: Array<Household & { rooms: Array<Room & { sessions: DesignSession[] }> }>;
} | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_complete_profile', { p_user_hash: userHash });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching complete profile:', error);
    return null;
  }
}

