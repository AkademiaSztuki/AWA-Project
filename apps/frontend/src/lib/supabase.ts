import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Allow turning off full session sync to avoid RLS/CORS loops.
// By default we disable it (value "1"), set NEXT_PUBLIC_DISABLE_SESSION_SYNC=0 to re-enable.
export const DISABLE_SESSION_SYNC = (process.env.NEXT_PUBLIC_DISABLE_SESSION_SYNC ?? '1') !== '0';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Funkcje pomocnicze do logowania danych badawczych
export const logBehavioralEvent = async (
  projectId: string, 
  eventType: string, 
  eventData: Record<string, any>
) => {
  const { error } = await supabase
    .from('behavioral_logs')
    .insert({
      project_id: projectId,
      event_type: eventType,
      event_data: eventData,
    });

  if (error) {
    console.error('Błąd logowania zdarzenia:', error);
  }
};

export const createProject = async (userHash: string) => {
  const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_hash: userHash,
      timestamp_consent_given: new Date().toISOString(),
      project_id: projectId,
    })
    .select()
    .single();

  if (error) {
    console.error('Błąd tworzenia projektu:', error);
    return null;
  }

  return data;
};

export const updateDiscoverySession = async (
  projectId: string,
  visualDNA: any,
  accuracyScore: number,
  ladderingPath: any,
  coreNeed: string
) => {
  const { error } = await supabase
    .from('discovery_sessions')
    .insert({
      project_id: projectId,
      visual_dna: visualDNA,
      dna_accuracy_score: accuracyScore,
      laddering_path: ladderingPath,
      core_need: coreNeed,
    });

  if (error) {
    console.error('Błąd zapisywania sesji odkrywania:', error);
  }
};

export const saveGenerationSet = async (projectId: string, prompt: string) => {
  const { data, error } = await supabase
    .from('generation_sets')
    .insert({
      project_id: projectId,
      prompt: prompt,
    })
    .select()
    .single();

  if (error) {
    console.error('Błąd zapisywania zestawu generacji:', error);
    return null;
  }

  return data;
};

export const saveGenerationFeedback = async (
  feedback: {
    sessionId: string;
    projectId?: string;
    generatedSources: string[];
    selectedSource: string | null;
    selectionTime: number;
    hasCompleteBigFive: boolean;
    tinderSwipeCount: number;
    explicitAnswerCount: number;
    sourceQuality?: Record<string, string> | Record<string, any>;
    implicitQuality?: any;
    conflictAnalysis?: any;
    userRating?: number;
  }
) => {
  const { error } = await supabase
    .from('generation_feedback')
    .insert({
      session_id: feedback.sessionId,
      project_id: feedback.projectId || null,
      generated_sources: feedback.generatedSources,
      selected_source: feedback.selectedSource,
      selection_time_ms: feedback.selectionTime,
      has_complete_bigfive: feedback.hasCompleteBigFive,
      tinder_swipe_count: feedback.tinderSwipeCount,
      explicit_answer_count: feedback.explicitAnswerCount,
      source_quality: feedback.sourceQuality || {},
      implicit_quality: feedback.implicitQuality || null,
      conflict_analysis: feedback.conflictAnalysis || null,
      user_rating: feedback.userRating || null,
    });

  if (error) {
    console.error('Błąd zapisywania feedbacku generacji:', error);
    return false;
  }
  return true;
};

export const saveRegenerationEvent = async (
  event: {
    sessionId: string;
    projectId?: string;
    previousSources: string[];
    previousSelected: string | null;
    regenerationCount: number;
    timeSinceLastGen: number;
    interpretation: string;
    sourceQuality?: Record<string, string>;
    implicitQuality?: any;
  }
) => {
  const { error } = await supabase
    .from('regeneration_events')
    .insert({
      session_id: event.sessionId,
      project_id: event.projectId || null,
      previous_sources: event.previousSources,
      previous_selected: event.previousSelected,
      regeneration_count: event.regenerationCount,
      time_since_last_ms: event.timeSinceLastGen,
      interpretation: event.interpretation,
      source_quality: event.sourceQuality || {},
      implicit_quality: event.implicitQuality || null,
    });

  if (error) {
    console.error('Błąd zapisywania eventu regeneracji:', error);
    return false;
  }
  return true;
};

export const saveFullSessionToSupabase = async (sessionData: any) => {
  if (DISABLE_SESSION_SYNC) return true;
  if (!sessionData?.userHash) return;
  const { error } = await supabase
    .from('sessions')
    .upsert([
      {
        user_hash: sessionData.userHash,
        session_json: sessionData,
        updated_at: new Date().toISOString(),
      }
    ], { onConflict: 'user_hash' });
  if (error) {
    console.error('Błąd zapisu pełnej sesji:', error);
  }
};

export const fetchLatestSessionSnapshot = async (userHash: string) => {
  if (!userHash) return null;
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('session_json')
      .eq('user_hash', userHash)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('fetchLatestSessionSnapshot error:', error);
      return null;
    }

    return (data as any)?.session_json ?? null;
  } catch (err) {
    console.error('fetchLatestSessionSnapshot unexpected failure:', err);
    return null;
  }
};

// --- NOWE POMOCNICZE FUNKCJE ---

export const getOrCreateProjectId = async (userHash: string): Promise<string | null> => {
  try {
    // spróbuj znaleźć istniejący projekt
    const { data: existing, error: selError } = await supabase
      .from('projects')
      .select('project_id')
      .eq('user_hash', userHash)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (selError) {
      console.warn('Błąd odczytu projektów, próba utworzenia nowego:', selError.message);
    }

    if (existing?.project_id) return existing.project_id as unknown as string;

    const created = await createProject(userHash);
    return created?.project_id ?? null;
  } catch (e) {
    console.error('getOrCreateProjectId failure', e);
    return null;
  }
};

export const saveTinderSwipes = async (projectId: string, swipes: any[]) => {
  await logBehavioralEvent(projectId, 'tinder_swipes', {
    count: swipes.length,
    swipes,
    timestamp: new Date().toISOString(),
  });
};

// Device context
export const saveDeviceContext = async (projectId: string, context: Record<string, any>) => {
  const { error } = await supabase.from('device_context_snapshots').insert({
    project_id: projectId,
    context,
    created_at: new Date().toISOString(),
  });
  if (error) console.error('Błąd zapisu device_context:', error);
};

// Page views
export const startPageView = async (projectId: string, page: string, meta?: any) => {
  const { data, error } = await supabase
    .from('page_views')
    .insert({ project_id: projectId, page, entered_at: new Date().toISOString(), meta })
    .select()
    .single();
  if (error) { console.error('Błąd startPageView:', error); return null; }
  return data?.id as string | null;
};

export const endPageView = async (pageViewId: string) => {
  const { error } = await supabase
    .from('page_views')
    .update({ exited_at: new Date().toISOString() })
    .eq('id', pageViewId);
  if (error) console.error('Błąd endPageView:', error);
};

// Tinder exposures + swipes (docelowe tabele)
export const saveTinderExposures = async (projectId: string, exposures: any[]) => {
  const rows = exposures.map((e) => ({ ...e, project_id: projectId }));
  const { error } = await supabase.from('tinder_exposures').insert(rows);
  if (error) console.error('Błąd zapisu tinder_exposures:', error);
};

export const saveTinderSwipesDetailed = async (projectId: string, swipes: any[]) => {
  const rows = swipes.map((s) => ({ ...s, project_id: projectId }));
  const { error } = await supabase.from('tinder_swipes').insert(rows);
  if (error) console.error('Błąd zapisu tinder_swipes:', error);
};

// DNA snapshot
export const saveDnaSnapshot = async (
  projectId: string,
  snapshot: { weights: any; top: any; confidence: number; parser_version: string }
) => {
  const { error } = await supabase.from('dna_snapshots').insert({
    project_id: projectId,
    weights: snapshot.weights,
    top: snapshot.top,
    confidence: snapshot.confidence,
    parser_version: snapshot.parser_version,
    created_at: new Date().toISOString(),
  });
  if (error) console.error('Błąd zapisu dna_snapshot:', error);
};

// Ladder path + summary
export const saveLadderPathRows = async (projectId: string, rows: any[]) => {
  const payload = rows.map((r) => ({ ...r, project_id: projectId }));
  const { error } = await supabase.from('ladder_paths').insert(payload);
  if (error) console.error('Błąd zapisu ladder_paths:', error);
};

export const saveLadderSummary = async (projectId: string, summary: any) => {
  const { error } = await supabase.from('ladder_summary').insert({
    project_id: projectId,
    core_need: summary.core_need,
    prompt_elements: summary.prompt_elements,
    created_at: new Date().toISOString(),
  });
  if (error) console.error('Błąd zapisu ladder_summary:', error);
};

// Generation jobs (timing/params)
export const startGenerationJob = async (
  projectId: string,
  job: { type: string; prompt: string; parameters: any; has_base_image: boolean; modification_label?: string }
) => {
  const { data, error } = await supabase
    .from('generation_jobs')
    .insert({
      project_id: projectId,
      job_type: job.type,
      prompt: job.prompt,
      parameters: job.parameters,
      has_base_image: job.has_base_image,
      modification_label: job.modification_label || null,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) { console.error('Błąd startGenerationJob:', error); return null; }
  return data?.id as string | null;
};

export const endGenerationJob = async (
  jobId: string,
  outcome: { status: 'success' | 'error'; latency_ms: number; error_message?: string }
) => {
  // Ensure latency_ms is within integer range (max ~2.1 billion)
  // Sometimes timestamps are passed instead of durations
  const safeLatency = Math.min(Math.max(0, Math.round(outcome.latency_ms)), 2147483647);
  
  const { error } = await supabase
    .from('generation_jobs')
    .update({ finished_at: new Date().toISOString(), status: outcome.status, latency_ms: safeLatency, error_message: outcome.error_message || null })
    .eq('id', jobId);
  if (error) console.error('Błąd endGenerationJob:', error);
};

// Ratings history
export const saveImageRatingEvent = async (
  projectId: string,
  event: { local_image_id: string; rating_key: string; value: number }
) => {
  const { error } = await supabase.from('image_ratings_history').insert({
    project_id: projectId,
    local_image_id: event.local_image_id,
    rating_key: event.rating_key,
    value: event.value,
    occurred_at: new Date().toISOString(),
  });
  if (error) console.error('Błąd zapisu image_ratings_history:', error);
};

// Health + Errors
export const logHealthCheck = async (projectId: string, ok: boolean, latency_ms: number) => {
  const { error } = await supabase.from('health_checks').insert({
    project_id: projectId,
    ok,
    latency_ms,
    checked_at: new Date().toISOString(),
  });
  if (error) console.error('Błąd zapisu health_checks:', error);
};

export const logErrorEvent = async (projectId: string, payload: { source: string; message: string; stack?: string; meta?: any }) => {
  const { error } = await supabase.from('errors').insert({
    project_id: projectId,
    source: payload.source,
    message: payload.message,
    stack: payload.stack || null,
    meta: payload.meta || null,
    occurred_at: new Date().toISOString(),
  });
  if (error) console.error('Błąd zapisu errors:', error);
};

export const saveGeneratedImages = async (
  generationSetId: string,
  images: Array<{ url: string; prompt: string; parameters?: any }>
) => {
  const rows = images.map((img) => ({
    generation_set_id: generationSetId,
    image_url: img.url,
    prompt_fragment: img.prompt,
    created_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from('generated_images')
    .insert(rows)
    .select();
  if (error) {
    console.error('Błąd zapisu generated_images:', error);
    return [];
  }
  return data;
};

export const updateGeneratedImageRatings = async (
  imageId: string,
  ratings: { aesthetic_match?: number; character?: number; harmony?: number }
) => {
  const { error } = await supabase
    .from('generated_images')
    .update({
      aesthetic_match_score: ratings.aesthetic_match,
      character_score: ratings.character,
      harmony_score: ratings.harmony,
    })
    .eq('id', imageId);
  if (error) {
    console.error('Błąd aktualizacji ocen obrazu:', error);
  }
};

