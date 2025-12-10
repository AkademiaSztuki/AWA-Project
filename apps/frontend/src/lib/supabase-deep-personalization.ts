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
import { supabase } from '@/lib/supabase'; // Use shared Supabase client to avoid multiple instances

// =========================
// USER PROFILE
// =========================

export async function getUserProfile(userHash: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
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
    
    // Map Supabase snake_case to TypeScript camelCase
    return {
      userHash: data.user_hash,
      aestheticDNA: data.aesthetic_dna,
      psychologicalBaseline: data.psychological_baseline,
      lifestyle: data.lifestyle_data,
      sensoryPreferences: data.sensory_preferences,
      projectiveResponses: data.projective_responses,
      personality: data.personality,
      inspirations: data.inspirations,
      profileCompletedAt: data.profile_completed_at
    } as UserProfile;
  } catch (error) {
    // Only log non-PGRST116 errors as warnings
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'PGRST116') {
      console.warn('Error fetching user profile (catch):', error);
    }
    return null;
  }
}

/**
 * Get user_hash from Supabase based on authenticated user ID
 * This is used to restore user_hash after login
 */
export async function getUserHashFromAuth(authUserId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_hash')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No profile linked yet
      }
      console.warn('Error fetching user_hash from auth:', error);
      return null;
    }
    return data?.user_hash || null;
  } catch (error) {
    console.warn('Error in getUserHashFromAuth:', error);
    return null;
  }
}

export async function saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    if (!profile.userHash) {
      console.warn('saveUserProfile: userHash is required');
      return null;
    }
    
    // First, get existing profile to preserve auth_user_id
    const existing = await getUserProfile(profile.userHash);
    
    // Build upsert data - only include fields that exist
    const upsertData: any = {
      user_hash: profile.userHash,
      auth_user_id: existing?.auth_user_id || undefined, // Preserve auth_user_id if exists
      updated_at: new Date().toISOString()
    };
    
    // Only include fields that are defined (to avoid schema errors)
    if (profile.aestheticDNA !== undefined) upsertData.aesthetic_dna = profile.aestheticDNA;
    if (profile.psychologicalBaseline !== undefined) upsertData.psychological_baseline = profile.psychologicalBaseline;
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
      if (error.code === 'PGRST204' && error.message?.includes('personality')) {
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
              error: error.message,
              errorCode: error.code,
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

export async function getCompletionStatus(userHash: string): Promise<CompletionStatus | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_completion_status', { p_user_hash: userHash });

    if (error) throw error;
    return data as CompletionStatus;
  } catch (error) {
    console.error('Error getting completion status:', error);
    return null;
  }
}

// =========================
// HOUSEHOLDS
// =========================

export async function getUserHouseholds(userHash: string): Promise<Household[]> {
  try {
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('user_hash', userHash)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Household[];
  } catch (error) {
    console.error('Error fetching households:', error);
    return [];
  }
}

/**
 * Ensures a user profile exists for the given userHash.
 * Creates a minimal profile if it doesn't exist.
 */
export async function ensureUserProfileExists(userHash: string): Promise<boolean> {
  try {
    // Check if profile exists
    const existing = await getUserProfile(userHash);
    if (existing) {
      return true; // Profile already exists
    }

    // Create minimal profile
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_hash: userHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      // If it's a unique constraint violation, profile was created by another request
      if (error.code === '23505') {
        return true;
      }
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error ensuring user profile exists:', error);
    return false;
  }
}

export async function saveHousehold(household: Omit<Household, 'id' | 'createdAt' | 'updatedAt'>): Promise<Household | null> {
  try {
    // Ensure user profile exists first (required by foreign key constraint)
    const profileExists = await ensureUserProfileExists(household.userHash);
    if (!profileExists) {
      console.error('Failed to ensure user profile exists before saving household');
      return null;
    }

    const { data, error } = await supabase
      .from('households')
      .insert({
        user_hash: household.userHash,
        name: household.name,
        household_type: household.householdType,
        living_situation: household.livingSituation,
        household_dynamics: household.householdDynamics,
        household_goals: household.householdGoals
      })
      .select()
      .single();

    if (error) throw error;
    return data as Household;
  } catch (error) {
    console.error('Error saving household:', error);
    return null;
  }
}

export async function updateHousehold(id: string, updates: Partial<Household>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('households')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating household:', error);
    return false;
  }
}

// =========================
// ROOMS
// =========================

export async function getHouseholdRooms(householdId: string): Promise<Room[]> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Room[];
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }
}

export async function getRoom(roomId: string): Promise<Room | null> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error) throw error;
    return data as Room;
  } catch (error) {
    console.error('Error fetching room:', error);
    return null;
  }
}

export async function saveRoom(room: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>): Promise<Room | null> {
  try {
    // Build insert object, excluding columns that don't exist in schema
    const insertData: any = {
      household_id: room.householdId,
      name: room.name,
      room_type: room.roomType,
      usage_type: room.usageType,
      shared_with: room.sharedWith,
      ownership_feeling: room.ownershipFeeling,
      current_photos: room.currentPhotos,
      // preference_source column doesn't exist in schema - skip it
      // preference_source: room.preferenceSource,
      // room_preference_payload column doesn't exist in schema - skip it
      // room_preference_payload: room.roomPreferencePayload,
      prs_pre_test: room.prsCurrent,
      pain_points: room.painPoints,
      activities: room.activities,
      room_visual_dna: room.roomVisualDNA,
      aspirational_state: room.aspirationalState
    };

    const { data, error } = await supabase
      .from('rooms')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // If error is about missing column, try without problematic columns
      if (error.message?.includes('preference_source') || error.message?.includes('activity_context') || error.message?.includes('room_preference_payload')) {
        console.warn('Some columns not found in schema, saving without them:', error.message);
        // Remove problematic fields and retry
        const retryData: any = { ...insertData };
        delete retryData.preference_source;
        delete retryData.room_preference_payload;
        delete retryData.activity_context;
        
        const { data: retryDataResult, error: retryError } = await supabase
          .from('rooms')
          .insert(retryData)
          .select()
          .single();
        
        if (retryError) throw retryError;
        return retryDataResult as Room;
      }
      throw error;
    }
    return data as Room;
  } catch (error) {
    console.error('Error saving room:', error);
    return null;
  }
}

export async function updateRoom(roomId: string, updates: Partial<Room>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rooms')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating room:', error);
    return false;
  }
}

// =========================
// DESIGN SESSIONS
// =========================

export async function getRoomSessions(roomId: string): Promise<DesignSession[]> {
  try {
    const { data, error } = await supabase
      .from('design_sessions')
      .select('*')
      .eq('room_id', roomId)
      .order('session_number', { ascending: true });

    if (error) throw error;
    return data as DesignSession[];
  } catch (error) {
    console.error('Error fetching design sessions:', error);
    return [];
  }
}

export async function getLatestSession(roomId: string): Promise<DesignSession | null> {
  try {
    const { data, error } = await supabase
      .from('design_sessions')
      .select('*')
      .eq('room_id', roomId)
      .order('session_number', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data as DesignSession;
  } catch (error) {
    console.error('Error fetching latest session:', error);
    return null;
  }
}

export async function saveDesignSession(
  session: Omit<DesignSession, 'id' | 'sessionNumber' | 'createdAt'>
): Promise<DesignSession | null> {
  try {
    // Get next session number
    const { data: nextNumber } = await supabase
      .rpc('get_next_session_number', { p_room_id: session.roomId });

    const { data, error } = await supabase
      .from('design_sessions')
      .insert({
        room_id: session.roomId,
        session_number: nextNumber || 1,
        intent: session.intent,
        prompt_used: session.promptUsed,
        prompt_synthesis_data: session.promptSynthesisData,
        parameters_used: session.parametersUsed,
        generated_images: session.generatedImages,
        selected_image_index: session.selectedImageIndex,
        prs_post_test: session.prsPostTest,
        satisfaction_score: session.satisfactionScore,
        reflects_identity_score: session.reflectsIdentityScore,
        implementation_intention: session.implementationIntention,
        feedback_text: session.feedbackText,
        feedback_voice_url: session.feedbackVoiceUrl,
        what_loved: session.whatLoved,
        what_change: session.whatChange
      })
      .select()
      .single();

    if (error) throw error;
    return data as DesignSession;
  } catch (error) {
    console.error('Error saving design session:', error);
    return null;
  }
}

export async function updateDesignSession(
  sessionId: string,
  updates: Partial<DesignSession>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('design_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating design session:', error);
    return false;
  }
}

// =========================
// ENHANCED SWIPES (Research tracking)
// =========================

export async function saveEnhancedSwipe(
  userHash: string,
  sessionContext: string,  // "core_profile" or roomId
  swipe: EnhancedSwipeData
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('enhanced_swipes')
      .insert({
        user_hash: userHash,
        session_context: sessionContext,
        image_id: swipe.imageId,
        image_metadata: swipe.imageMetadata,
        direction: swipe.direction,
        reaction_time_ms: swipe.reactionTimeMs,
        dwell_time_ms: swipe.dwellTimeMs,
        hesitation_count: swipe.hesitationCount,
        swipe_velocity: swipe.swipeVelocity,
        decided_at: swipe.timestamp
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving enhanced swipe:', error);
    return false;
  }
}

export async function getSwipePatterns(
  userHash: string,
  sessionContext?: string
): Promise<SwipePattern[]> {
  try {
    const query = supabase
      .from('enhanced_swipes')
      .select('*')
      .eq('user_hash', userHash);

    if (sessionContext) {
      query.eq('session_context', sessionContext);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Analyze patterns
    // TODO: Implement pattern detection algorithm
    return [];
  } catch (error) {
    console.error('Error fetching swipe patterns:', error);
    return [];
  }
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

