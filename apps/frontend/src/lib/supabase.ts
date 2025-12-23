import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Allow turning off full session sync to avoid RLS/CORS loops.
// Default: ENABLE sync (set NEXT_PUBLIC_DISABLE_SESSION_SYNC=1 to disable).
export const DISABLE_SESSION_SYNC = (process.env.NEXT_PUBLIC_DISABLE_SESSION_SYNC ?? '0') !== '0';

// Helper (debug-safe): read a few JWT claims without logging the token
async function getAuthClaimsSafe(): Promise<{ role?: string; aud?: string; sub?: string } | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadJson = JSON.parse(atob(parts[1]));
    return {
      role: payloadJson?.role,
      aud: payloadJson?.aud,
      sub: payloadJson?.sub,
    };
  } catch {
    return null;
  }
}

// Custom storage adapter that gracefully handles storage errors (e.g., in 3rd-party iframes)
const safeStorageAdapter = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch (error) {
      // Storage access denied (e.g., in 3rd-party context) - return null silently
      if (error instanceof Error && error.message.includes('storage')) {
        return null;
      }
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
    } catch (error) {
      // Storage access denied - ignore silently
      if (error instanceof Error && error.message.includes('storage')) {
        return;
      }
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    } catch (error) {
      // Storage access denied - ignore silently
      if (error instanceof Error && error.message.includes('storage')) {
        return;
      }
    }
  }
};

// Safe localStorage helpers (for use outside of Supabase adapter)
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch (error) {
      // Storage access denied (e.g., in 3rd-party iframe context) - return null silently
      if (error instanceof Error && (error.message.includes('storage') || error.message.includes('not allowed'))) {
        return null;
      }
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
    } catch (error) {
      // Storage access denied - ignore silently
      if (error instanceof Error && (error.message.includes('storage') || error.message.includes('not allowed'))) {
        return;
      }
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    } catch (error) {
      // Storage access denied - ignore silently
      if (error instanceof Error && (error.message.includes('storage') || error.message.includes('not allowed'))) {
        return;
      }
    }
  }
};

// Safe sessionStorage helpers (for use outside of Supabase adapter)
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return sessionStorage.getItem(key);
    } catch (error) {
      // Storage access denied (e.g., in 3rd-party iframe context) - return null silently
      if (error instanceof Error && (error.message.includes('storage') || error.message.includes('not allowed'))) {
        return null;
      }
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.setItem(key, value);
    } catch (error) {
      // Storage access denied - ignore silently
      if (error instanceof Error && (error.message.includes('storage') || error.message.includes('not allowed'))) {
        return;
      }
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.removeItem(key);
    } catch (error) {
      // Storage access denied - ignore silently
      if (error instanceof Error && (error.message.includes('storage') || error.message.includes('not allowed'))) {
        return;
      }
    }
  }
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Global error handler for unhandled storage errors (from Google OAuth iframe)
// Note: Errors from cross-origin iframes (Google OAuth) cannot be caught by event listeners,
// so we filter them at the console level with aggressive pattern matching
// This is initialized lazily to avoid hydration issues
let errorFilterInitialized = false;

const initializeErrorFilter = () => {
  if (errorFilterInitialized || typeof window === 'undefined') return;
  errorFilterInitialized = true;

  // Store original console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;

  // Filter out storage errors from Google OAuth iframe and browser extensions
  const shouldSuppressError = (message: string, stack?: string): boolean => {
    const fullText = `${message} ${stack || ''}`.toLowerCase();
    
    const suppressedPatterns = [
      'access to storage is not allowed',
      'accountchooser',
      'signin/oauth',
      'executing inline script violates.*content security policy',
      'apps.googleusercontent.com',
      'accounts.google.com',
      'googleapis.com',
      'vm\\d+:', // Virtual Machine (browser extensions)
      'injectedfunction',
      'self-xss' // Browser security warning
    ];
    
    return suppressedPatterns.some(pattern => {
      try {
        return new RegExp(pattern, 'i').test(fullText);
      } catch {
        return fullText.includes(pattern);
      }
    });
  };

  // Override console.error to filter Google OAuth storage errors
  console.error = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : 
      arg?.message || String(arg)
    ).join(' ');
    
    // Try to get stack trace from error object
    const errorObj = args.find(arg => arg instanceof Error);
    const stack = errorObj?.stack || '';
    
    if (!shouldSuppressError(message, stack)) {
      originalConsoleError.apply(console, args);
    }
    // Silently ignore suppressed errors
  };

  // Override console.warn for consistency
  console.warn = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : 
      arg?.message || String(arg)
    ).join(' ');
    
    const errorObj = args.find(arg => arg instanceof Error);
    const stack = errorObj?.stack || '';
    
    if (!shouldSuppressError(message, stack)) {
      originalConsoleWarn.apply(console, args);
    }
  };

  // Also filter console.log for CSP violations
  console.log = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : 
      arg?.message || String(arg)
    ).join(' ');
    
    if (!shouldSuppressError(message)) {
      originalConsoleLog.apply(console, args);
    }
  };

  // Also catch errors via event listeners (for same-origin errors)
  window.addEventListener('error', (event) => {
    const message = event.error?.message || event.message || '';
    const stack = event.error?.stack || '';
    const filename = event.filename || '';
    
    // Check if error comes from Google OAuth domain
    if (filename.includes('google') || filename.includes('accountchooser') || 
        shouldSuppressError(message, stack)) {
      event.preventDefault();
      return false;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason) || '';
    const stack = event.reason?.stack || '';
    
    if (shouldSuppressError(message, stack)) {
      event.preventDefault();
      return false;
    }
  });
};

// Initialize on first import in browser (deferred to avoid hydration issues)
if (typeof window !== 'undefined') {
  // Use requestIdleCallback or setTimeout to defer initialization
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initializeErrorFilter, { timeout: 1000 });
  } else {
    setTimeout(initializeErrorFilter, 0);
  }
}

// Funkcje pomocnicze do logowania danych badawczych
export const logBehavioralEvent = async (
  projectId: string, 
  eventType: string, 
  eventData: Record<string, any>
) => {
  // Legacy analytics table removed after radical refactor
  return;
};

export const createProject = async (userHash: string) => {
  // Legacy table removed after radical refactor
  return null;
};

export const updateDiscoverySession = async (
  projectId: string,
  visualDNA: any,
  accuracyScore: number,
  ladderingPath: any,
  coreNeed: string
) => {
  // Legacy table removed after radical refactor
  return;
};

export const saveGenerationSet = async (projectId: string, prompt: string) => {
  // Legacy table removed after radical refactor
  return null;
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
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveFullSessionToSupabase-entry',message:'Saving full session to participants table',data:{hasUserHash:!!sessionData?.userHash,userHash:sessionData?.userHash,disableSync:DISABLE_SESSION_SYNC,hasBigFive:!!sessionData?.bigFive,hasVisualDNA:!!sessionData?.visualDNA,hasColorsAndMaterials:!!sessionData?.colorsAndMaterials},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  
  if (DISABLE_SESSION_SYNC) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveFullSessionToSupabase-skipped',message:'Session sync disabled',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    return true;
  }
  if (!sessionData?.userHash) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveFullSessionToSupabase-no-hash',message:'No userHash provided',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    return;
  }
  
  try {
    // Map SessionData to participants format
    const { mapSessionDataToParticipant } = await import('@/lib/participants-mapper');
    
    // Get auth_user_id if available
    let authUserId: string | undefined;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      authUserId = session?.user?.id;
    } catch (e) {
      // Ignore auth errors
    }
    
    const participantRow = mapSessionDataToParticipant(sessionData, authUserId);
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveFullSessionToSupabase-before-insert',message:'Before upsert to participants',data:{userHash:participantRow.user_hash,hasBigFive:!!participantRow.bigfive_domains,hasImplicit:!!participantRow.implicit_style_1,hasExplicit:!!participantRow.explicit_style,hasInspirations:!!participantRow.inspiration_style_1},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveFullSessionToSupabase-before-upsert',message:'Before upsert - participantRow values',data:{explicitWarmth:participantRow.explicit_warmth,explicitBrightness:participantRow.explicit_brightness,explicitComplexity:participantRow.explicit_complexity},timestamp:Date.now(),sessionId:'debug-session',runId:'supabase-save',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    const { error, data } = await supabase
      .from('participants')
      .upsert(participantRow, { onConflict: 'user_hash' })
      .select();
    
    if (error) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveFullSessionToSupabase-error',message:'Error saving to participants',data:{error:error.message,errorCode:error.code,errorDetails:error.details},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      console.error('Błąd zapisu uczestnika:', error);
    } else {
      // #region agent log
      const savedRow = data?.[0];
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveFullSessionToSupabase-success',message:'Successfully saved to participants',data:{savedCount:data?.length||0,userHash:participantRow.user_hash,savedWarmth:savedRow?.explicit_warmth,savedBrightness:savedRow?.explicit_brightness,savedComplexity:savedRow?.explicit_complexity},timestamp:Date.now(),sessionId:'debug-session',runId:'supabase-save',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
    }
  } catch (err) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveFullSessionToSupabase-exception',message:'Exception in saveFullSessionToSupabase',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    console.error('Błąd mapowania/zapisu uczestnika:', err);
  }
};

export const fetchLatestSessionSnapshot = async (userHash: string) => {
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:fetchLatestSessionSnapshot-entry',message:'Fetching latest session snapshot from participants',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
  // #endregion
  
  if (!userHash) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:fetchLatestSessionSnapshot-no-hash',message:'No userHash provided',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
    // #endregion
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('user_hash', userHash)
      .maybeSingle();

    if (error) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:fetchLatestSessionSnapshot-error',message:'Error fetching session snapshot',data:{error:error.message,errorCode:error.code,userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
      // #endregion
      console.warn('fetchLatestSessionSnapshot error:', error);
      return null;
    }

    if (!data) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:fetchLatestSessionSnapshot-not-found',message:'No participant found',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
      // #endregion
      return null;
    }
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:fetchLatestSessionSnapshot-found',message:'Participant found',data:{userHash,hasBigFive:!!data.big5_openness,hasImplicit:!!data.implicit_style_1,hasExplicit:!!data.explicit_style,hasInspirations:!!data.inspiration_style_1,dbWarmth:data.explicit_warmth,dbBrightness:data.explicit_brightness,dbComplexity:data.explicit_complexity},timestamp:Date.now(),sessionId:'debug-session',runId:'supabase-retrieve',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    // Map participants back to SessionData format
    const { mapParticipantToSessionData } = await import('@/lib/participants-mapper');
    const mapped = mapParticipantToSessionData(data);
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:fetchLatestSessionSnapshot-mapped',message:'Mapped participant to SessionData',data:{mappedWarmth:mapped?.semanticDifferential?.warmth,mappedBrightness:mapped?.semanticDifferential?.brightness,mappedComplexity:mapped?.semanticDifferential?.complexity},timestamp:Date.now(),sessionId:'debug-session',runId:'supabase-retrieve',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:fetchLatestSessionSnapshot-success',message:'Successfully mapped participant to SessionData',data:{userHash,hasBigFive:!!mapped?.bigFive,hasVisualDNA:!!mapped?.visualDNA,hasColorsAndMaterials:!!mapped?.colorsAndMaterials},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
    // #endregion
    
    return mapped;
  } catch (err) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:fetchLatestSessionSnapshot-exception',message:'Exception fetching session snapshot',data:{error:err instanceof Error?err.message:String(err),userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
    // #endregion
    console.error('fetchLatestSessionSnapshot unexpected failure:', err);
    return null;
  }
};

// --- NOWE POMOCNICZE FUNKCJE ---

export const getOrCreateProjectId = async (userHash: string): Promise<string | null> => {
  // Legacy analytics tables removed after radical refactor (projects/page_views/...).
  // Keep API stable: return null to skip optional tracking.
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:getOrCreateProjectId-disabled',message:'getOrCreateProjectId disabled (legacy tables removed)',data:{hasUserHash:!!userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'LEGACY'})}).catch(()=>{});
  // #endregion
  return null;
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
  // Legacy table removed after radical refactor
  return;
};

// Page views
export const startPageView = async (projectId: string, page: string, meta?: any) => {
  // Legacy table removed after radical refactor
  return null;
};

export const endPageView = async (pageViewId: string) => {
  // Legacy table removed after radical refactor
  return;
};

// Tinder exposures + swipes (docelowe tabele)
export const saveTinderExposures = async (projectId: string, exposures: any[]) => {
  // Legacy table removed after radical refactor
  return;
};

// NEW: Save swipes to participant_swipes table
export const saveParticipantSwipes = async (userHash: string, swipes: Array<{
  imageId: number | string;
  direction: 'left' | 'right';
  reactionTime?: number;
  reactionTimeMs?: number;
  timestamp?: number | string;
  tags?: string[];
  categories?: {
    style?: string | null;
    colors?: string[];
    materials?: string[];
  };
}>) => {
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-entry',message:'Saving swipes to participant_swipes',data:{userHash,swipeCount:swipes.length,swipes:swipes.map(s=>({imageId:s.imageId,direction:s.direction}))},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  
  if (!userHash || !swipes.length) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-skipped',message:'No userHash or swipes',data:{hasUserHash:!!userHash,swipeCount:swipes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    return;
  }
  
  // Ensure participant exists before inserting swipes
  const participantExists = await ensureParticipantExists(userHash);
  if (!participantExists) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-no-participant',message:'Participant does not exist and could not be created',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    return;
  }
  
  const rows = swipes.map((s) => ({
    user_hash: userHash,
    image_id: String(s.imageId),
    direction: s.direction,
    reaction_time_ms: s.reactionTimeMs || s.reactionTime,
    swipe_timestamp: s.timestamp ? (typeof s.timestamp === 'string' ? s.timestamp : new Date(s.timestamp).toISOString()) : new Date().toISOString(),
    image_styles: s.categories?.style ? [s.categories.style] : s.tags?.filter(t => t.includes('style')) || [],
    image_colors: s.categories?.colors || s.tags?.filter(t => t.includes('color')) || [],
    image_materials: s.categories?.materials || s.tags?.filter(t => t.includes('material')) || []
  }));
  
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-before-insert',message:'Before insert to participant_swipes',data:{rowCount:rows.length,firstRow:rows[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  
  const { error, data } = await supabase.from('participant_swipes').insert(rows).select();
  if (error) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-error',message:'Error saving swipes',data:{error:error.message,errorCode:error.code,errorDetails:error.details,userHash,rowCount:rows.length,firstRow:rows[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    console.error('Błąd zapisu participant_swipes:', error);
    return false;
  }
  
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-success',message:'Successfully saved swipes to participant_swipes',data:{userHash,savedCount:data?.length||0,swipeCount:swipes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  // After saving swipes, recompute implicit aggregates (top styles/colors/materials) and store in participants
  try {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-aggregate-start',message:'Recomputing implicit aggregates from participant_swipes',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    const { data: swipeRows, error: swipeErr } = await supabase
      .from('participant_swipes')
      .select('direction,image_styles,image_colors,image_materials')
      .eq('user_hash', userHash);

    if (swipeErr) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-aggregate-error',message:'Failed to load swipes for aggregation',data:{error:swipeErr.message,errorCode:swipeErr.code},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    } else {
      const all = swipeRows || [];
      const liked = all.filter((r: any) => r.direction === 'right');

      const countMap = (vals: string[]) => {
        const m = new Map<string, number>();
        for (const v of vals) m.set(v, (m.get(v) || 0) + 1);
        return m;
      };
      const topN = (m: Map<string, number>, n: number) =>
        Array.from(m.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, n)
          .map(([k]) => k);

      const styles = liked.flatMap((r: any) => (Array.isArray(r.image_styles) ? r.image_styles : [])).filter(Boolean);
      const colors = liked.flatMap((r: any) => (Array.isArray(r.image_colors) ? r.image_colors : [])).filter(Boolean);
      const materials = liked.flatMap((r: any) => (Array.isArray(r.image_materials) ? r.image_materials : [])).filter(Boolean);

      const topStyles = topN(countMap(styles), 3);
      const topColors = topN(countMap(colors), 3);
      const topMaterials = topN(countMap(materials), 3);

      const total = all.length;
      const likes = liked.length;
      const dislikes = total - likes;

      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-aggregate-result',message:'Computed implicit aggregates',data:{userHash,total,likes,dislikes,topStyles,topColors,topMaterials},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      const { error: updErr } = await supabase
        .from('participants')
        .update({
          implicit_dominant_style: topStyles[0] || null,
          implicit_style_1: topStyles[0] || null,
          implicit_style_2: topStyles[1] || null,
          implicit_style_3: topStyles[2] || null,
          implicit_color_1: topColors[0] || null,
          implicit_color_2: topColors[1] || null,
          implicit_color_3: topColors[2] || null,
          implicit_material_1: topMaterials[0] || null,
          implicit_material_2: topMaterials[1] || null,
          implicit_material_3: topMaterials[2] || null,
          tinder_total_swipes: total,
          tinder_likes: likes,
          tinder_dislikes: dislikes,
          updated_at: new Date().toISOString()
        } as any)
        .eq('user_hash', userHash);

      if (updErr) {
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-participants-update-error',message:'Failed updating participants implicit fields',data:{error:updErr.message,errorCode:updErr.code},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
      } else {
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-participants-update-success',message:'Updated participants implicit fields',data:{userHash,topStylesCount:topStyles.length,topColorsCount:topColors.length,topMaterialsCount:topMaterials.length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
      }
    }
  } catch (e) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-aggregate-exception',message:'Exception while updating implicit aggregates',data:{error:e instanceof Error?e.message:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
  }
  
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantSwipes-success',message:'Successfully saved swipes',data:{savedCount:data?.length||0,userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  return true;
};

// LEGACY: Keep for backward compatibility (will be removed after migration)
export const saveTinderSwipesDetailed = async (projectId: string, swipes: any[]) => {
  // Legacy table removed after radical refactor
  return;
};

// DNA snapshot
export const saveDnaSnapshot = async (
  projectId: string,
  snapshot: { weights: any; top: any; confidence: number; parser_version: string }
) => {
  // Legacy table removed after radical refactor
  return;
};

// Ladder path + summary
export const saveLadderPathRows = async (projectId: string, rows: any[]) => {
  // Legacy table removed after radical refactor
  return;
};

export const saveLadderSummary = async (projectId: string, summary: any) => {
  // Legacy table removed after radical refactor
  return;
};

// NEW: Save generation to participant_generations table
export const startParticipantGeneration = async (
  userHash: string,
  job: { 
    type: 'initial' | 'micro' | 'macro'; 
    prompt: string; 
    parameters: any; 
    has_base_image: boolean; 
    modification_label?: string;
    source?: string;
  }
) => {
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:startParticipantGeneration-entry',message:'Starting participant generation',data:{userHash,jobType:job.type,hasBaseImage:job.has_base_image,hasPrompt:!!job.prompt,promptLength:job.prompt?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  
  if (!userHash) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:startParticipantGeneration-no-hash',message:'No userHash provided',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return null;
  }
  
  // Ensure participant exists before inserting generation
  const participantExists = await ensureParticipantExists(userHash);
  if (!participantExists) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:startParticipantGeneration-no-participant',message:'Participant does not exist and could not be created',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return null;
  }
  
  const { data, error } = await supabase
    .from('participant_generations')
    .insert({
      user_hash: userHash,
      job_type: job.type,
      prompt: job.prompt,
      parameters: job.parameters || {},
      source: job.source || null,
      has_base_image: job.has_base_image,
      modification_label: job.modification_label || null,
      started_at: new Date().toISOString(),
      status: 'pending'
    })
    .select()
    .single();
    
  if (error) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:startParticipantGeneration-error',message:'Error starting generation',data:{error:error.message,errorCode:error.code,errorDetails:error.details},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    console.error('Błąd startParticipantGeneration:', error);
    return null;
  }
  
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:startParticipantGeneration-success',message:'Successfully started generation',data:{jobId:data?.id,userHash,jobType:job.type},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  return data?.id as string | null;
};

export const endParticipantGeneration = async (
  jobId: string,
  outcome: { status: 'success' | 'error'; latency_ms: number; error_message?: string }
) => {
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:endParticipantGeneration-entry',message:'Ending participant generation',data:{jobId,status:outcome.status,latencyMs:outcome.latency_ms,hasError:!!outcome.error_message},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  
  const safeLatency = Math.min(Math.max(0, Math.round(outcome.latency_ms)), 2147483647);
  
  const { error } = await supabase
    .from('participant_generations')
    .update({ 
      finished_at: new Date().toISOString(), 
      status: outcome.status, 
      latency_ms: safeLatency, 
      error_message: outcome.error_message || null 
    })
    .eq('id', jobId);
    
  if (error) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:endParticipantGeneration-error',message:'Error ending generation',data:{error:error.message,errorCode:error.code,jobId},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    console.error('Błąd endParticipantGeneration:', error);
    return false;
  }
  
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:endParticipantGeneration-success',message:'Successfully ended generation',data:{jobId,status:outcome.status,latencyMs:safeLatency},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  return true;
};

// LEGACY: Keep for backward compatibility (will be removed after migration)
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

// NEW: Save images to participant_images table
// Helper: Ensure participant exists before inserting into related tables
const ensureParticipantExists = async (userHash: string): Promise<boolean> => {
  if (!userHash) return false;
  
  try {
    // Check if participant exists
    const { data: existing } = await supabase
      .from('participants')
      .select('user_hash')
      .eq('user_hash', userHash)
      .maybeSingle();
    
    if (existing) return true;
    
    // Create minimal participant if doesn't exist
    const { error } = await supabase
      .from('participants')
      .insert({
        user_hash: userHash,
        consent_timestamp: new Date().toISOString()
      });
    
    if (error) {
      const claims = await getAuthClaimsSafe();
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:ensureParticipantExists-error',message:'Error creating participant',data:{error:error.message,errorCode:error.code,userHash,authClaims:claims},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H14'})}).catch(()=>{});
      // #endregion
      return false;
    }
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:ensureParticipantExists-created',message:'Created participant',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H14'})}).catch(()=>{});
    // #endregion
    return true;
  } catch (e) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:ensureParticipantExists-exception',message:'Exception ensuring participant exists',data:{error:e instanceof Error?e.message:String(e),userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H14'})}).catch(()=>{});
    // #endregion
    return false;
  }
};

export const saveParticipantImage = async (
  userHash: string,
  image: {
    type: 'generated' | 'inspiration' | 'room_photo' | 'room_photo_empty';
    space_id?: string;
    storage_path: string;
    public_url?: string;
    thumbnail_url?: string;
    is_favorite?: boolean;
    tags_styles?: string[];
    tags_colors?: string[];
    tags_materials?: string[];
    tags_biophilia?: number;
    description?: string;
    source?: string;
    generation_id?: string;
  }
): Promise<string | null> => {
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantImage-entry',message:'Saving participant image',data:{userHash,imageType:image.type,hasStoragePath:!!image.storage_path,hasPublicUrl:!!image.public_url,hasTags:!!(image.tags_styles?.length||image.tags_colors?.length||image.tags_materials?.length)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  
  if (!userHash || !image.storage_path) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantImage-skipped',message:'No userHash or storage_path',data:{hasUserHash:!!userHash,hasStoragePath:!!image.storage_path},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    return null;
  }
  
  // Ensure participant exists before inserting image
  const participantExists = await ensureParticipantExists(userHash);
  if (!participantExists) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantImage-no-participant',message:'Participant does not exist and could not be created',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    return null;
  }
  
  const { data, error } = await supabase
    .from('participant_images')
    .insert({
      user_hash: userHash,
      space_id: image.space_id || null,
      type: image.type,
      storage_path: image.storage_path,
      public_url: image.public_url || null,
      thumbnail_url: image.thumbnail_url || null,
      is_favorite: image.is_favorite || false,
      tags_styles: image.tags_styles || [],
      tags_colors: image.tags_colors || [],
      tags_materials: image.tags_materials || [],
      tags_biophilia: image.tags_biophilia || null,
      description: image.description || null,
      source: image.source || null,
      generation_id: image.generation_id || null
    })
    .select('id')
    .single();
    
  if (error) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantImage-error',message:'Error saving image',data:{error:error.message,errorCode:error.code,errorDetails:error.details,imageType:image.type},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    console.error('Błąd zapisu participant_images:', error);
    return null;
  }
  
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:saveParticipantImage-success',message:'Successfully saved image',data:{imageId:data?.id,userHash,imageType:image.type},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  return data?.id || null;
};

export const saveGeneratedImages = async (
  generationSetId: string,
  images: Array<{ url: string; prompt: string; parameters?: any }>
) => {
  // Legacy table removed after radical refactor
  return [];
};

export const updateGeneratedImageRatings = async (
  imageId: string,
  ratings: { aesthetic_match?: number; character?: number; harmony?: number }
) => {
  // Legacy table removed after radical refactor
  return;
};

// Consent version constant
export const CONSENT_VERSION = '2025-12-22';

// Save research consent
export const saveResearchConsent = async (
  userId: string,
  consent: {
    consentResearch: boolean;
    consentProcessing: boolean;
    acknowledgedArt13: boolean;
  },
  locale: 'pl' | 'en'
) => {
  const { data, error } = await supabase
    .from('research_consents')
    .insert({
      user_id: userId,
      consent_version: CONSENT_VERSION,
      consent_research: consent.consentResearch,
      consent_processing: consent.consentProcessing,
      acknowledged_art13: consent.acknowledgedArt13,
      locale: locale,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Błąd zapisu zgody:', error);
    return null;
  }

  return data;
};

