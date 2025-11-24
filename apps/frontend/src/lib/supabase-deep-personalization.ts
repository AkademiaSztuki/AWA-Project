// Supabase helpers for Deep Personalization Architecture
// CRUD operations for user_profiles, households, rooms, design_sessions

import { createClient } from '@supabase/supabase-js';
import {
  UserProfile,
  Household,
  Room,
  DesignSession,
  CompletionStatus,
  EnhancedSwipeData,
  SwipePattern
} from '@/types/deep-personalization';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// =========================
// USER PROFILE
// =========================

export async function getUserProfile(userHash: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_hash', userHash)
      .single();

    if (error) throw error;
    return data as UserProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_hash: profile.userHash,
        aesthetic_dna: profile.aestheticDNA,
        psychological_baseline: profile.psychologicalBaseline,
        lifestyle_data: profile.lifestyle,
        sensory_preferences: profile.sensoryPreferences,
        projective_responses: profile.projectiveResponses,
        personality: profile.personality,
        inspirations: profile.inspirations,
        profile_completed_at: profile.profileCompletedAt,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
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

export async function saveHousehold(household: Omit<Household, 'id' | 'createdAt' | 'updatedAt'>): Promise<Household | null> {
  try {
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
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        household_id: room.householdId,
        name: room.name,
        room_type: room.roomType,
        usage_type: room.usageType,
        shared_with: room.sharedWith,
        ownership_feeling: room.ownershipFeeling,
        current_photos: room.currentPhotos,
        preference_source: room.preferenceSource,
        room_preference_payload: room.roomPreferencePayload,
        prs_pre_test: room.prsCurrent,
        pain_points: room.painPoints,
        activities: room.activities,
        room_visual_dna: room.roomVisualDNA,
        activity_context: room.activityContext,
        aspirational_state: room.aspirationalState
      })
      .select()
      .single();

    if (error) throw error;
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

