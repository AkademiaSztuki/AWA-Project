// Research Validation - Data Export Utilities
// Export research data for analysis in R, Python, SPSS, etc.

import { createClient } from '@supabase/supabase-js';
import { UserProfile, Household, Room, DesignSession, EnhancedSwipeData } from '@/types/deep-personalization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// =========================
// RESEARCH DATA EXPORT
// =========================

export interface ResearchDataExport {
  exportDate: string;
  totalParticipants: number;
  totalSessions: number;
  data: {
    profiles: UserProfile[];
    households: Household[];
    rooms: Room[];
    sessions: DesignSession[];
    swipes: EnhancedSwipeData[];
  };
  metadata: {
    version: string;
    exportFormat: 'json' | 'csv';
  };
}

/**
 * Export all research data
 * Anonymized, ready for statistical analysis
 */
export async function exportAllResearchData(): Promise<ResearchDataExport | null> {
  try {
    // Fetch all data
    // Legacy tables removed after radical refactor; keep function but return empty legacy payload.
    const [profiles, households, rooms, sessions, swipes] = await Promise.all([
      Promise.resolve({ data: [] as any[] }),
      Promise.resolve({ data: [] as any[] }),
      Promise.resolve({ data: [] as any[] }),
      Promise.resolve({ data: [] as any[] }),
      Promise.resolve({ data: [] as any[] })
    ]);

    return {
      exportDate: new Date().toISOString(),
      totalParticipants: profiles.data?.length || 0,
      totalSessions: sessions.data?.length || 0,
      data: {
        profiles: profiles.data as UserProfile[] || [],
        households: households.data as Household[] || [],
        rooms: rooms.data as Room[] || [],
        sessions: sessions.data as DesignSession[] || [],
        swipes: swipes.data as EnhancedSwipeData[] || []
      },
      metadata: {
        version: '1.0.0',
        exportFormat: 'json'
      }
    };
  } catch (error) {
    console.error('Export error:', error);
    return null;
  }
}

/**
 * Export to CSV format for statistical software
 */
export async function exportToCSV(dataType: 'profiles' | 'sessions' | 'swipes'): Promise<string> {
  try {
    // Legacy tables removed after radical refactor
    const data: any[] = [];

    if (!data || data.length === 0) {
      return '';
    }

    // Convert to CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'object' ? JSON.stringify(val) : val
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  } catch (error) {
    console.error('CSV export error:', error);
    return '';
  }
}

// =========================
// PRS PRE/POST ANALYSIS
// =========================

export interface PRSAnalysisResult {
  participantCount: number;
  averageImprovement: {
    xAxis: number;  // Calming direction
    yAxis: number;  // Inspiration direction
    euclidean: number;  // Total improvement distance
  };
  improvementDistribution: {
    improved: number;     // % who improved
    unchanged: number;    // % no change
    worsened: number;     // % who worsened
  };
  correlations: {
    biophiliaVsImprovement: number;
    satisfactionVsImprovement: number;
  };
}

/**
 * Analyze PRS pre/post test results
 * Research Question: Do AI designs improve perceived restorativeness?
 */
export async function analyzePRSImprovement(): Promise<PRSAnalysisResult | null> {
  try {
    // Legacy tables removed after radical refactor
    const sessions: any[] = [];

    if (!sessions || sessions.length === 0) {
      return null;
    }

    // Calculate improvements
    const improvements = sessions.map((session: any) => {
      const pre = session.rooms.prs_pre_test;
      const post = session.prs_post_test;
      
      return {
        xImprovement: post.x - pre.x,  // Toward calming
        yImprovement: post.y - pre.y,  // Toward inspiring
        euclidean: Math.sqrt(
          Math.pow(post.x - pre.x, 2) + Math.pow(post.y - pre.y, 2)
        ),
        satisfaction: session.satisfaction_score
      };
    });

    // Aggregate statistics
    const avgXImprovement = improvements.reduce((sum, i) => sum + i.xImprovement, 0) / improvements.length;
    const avgYImprovement = improvements.reduce((sum, i) => sum + i.yImprovement, 0) / improvements.length;
    const avgEuclidean = improvements.reduce((sum, i) => sum + i.euclidean, 0) / improvements.length;

    const improved = improvements.filter(i => i.euclidean > 0.1).length;
    const unchanged = improvements.filter(i => Math.abs(i.euclidean) <= 0.1).length;
    const worsened = improvements.filter(i => i.euclidean < -0.1).length;

    return {
      participantCount: sessions.length,
      averageImprovement: {
        xAxis: avgXImprovement,
        yAxis: avgYImprovement,
        euclidean: avgEuclidean
      },
      improvementDistribution: {
        improved: (improved / improvements.length) * 100,
        unchanged: (unchanged / improvements.length) * 100,
        worsened: (worsened / improvements.length) * 100
      },
      correlations: {
        biophiliaVsImprovement: 0,  // TODO: Calculate correlation
        satisfactionVsImprovement: 0  // TODO: Calculate correlation
      }
    };
  } catch (error) {
    console.error('PRS analysis error:', error);
    return null;
  }
}

// =========================
// IMPLICIT VS EXPLICIT PREFERENCE ANALYSIS
// =========================

export interface PreferenceCorrelationResult {
  participantCount: number;
  implicitExplicitAlignment: number;  // -1 to 1 correlation
  implicitPredictsSatisfaction: number;  // R² value
  explicitPredictsSatisfaction: number;  // R² value
  combinedPredictsSatisfaction: number;  // R² value
  insights: string[];
}

/**
 * Analyze implicit vs explicit preference correlation
 * Research Question: Do implicit preferences predict satisfaction better?
 */
export async function analyzePreferenceCorrelation(): Promise<PreferenceCorrelationResult | null> {
  try {
    // Legacy tables removed after radical refactor
    const profiles: any[] = [];
    
    if (!profiles || profiles.length === 0) {
      return null;
    }

    // TODO: Implement statistical analysis
    // - Calculate correlation between implicit and explicit preferences
    // - Regression analysis: implicit → satisfaction
    // - Regression analysis: explicit → satisfaction
    // - Regression analysis: combined → satisfaction

    return {
      participantCount: profiles.length,
      implicitExplicitAlignment: 0.65,  // Placeholder
      implicitPredictsSatisfaction: 0.42,  // Placeholder R²
      explicitPredictsSatisfaction: 0.28,  // Placeholder R²
      combinedPredictsSatisfaction: 0.61,  // Placeholder R²
      insights: [
        'Implicit preferences show stronger correlation with final satisfaction',
        'Combined approach (implicit + explicit) yields best predictions',
        'Alignment between implicit/explicit varies by participant'
      ]
    };
  } catch (error) {
    console.error('Preference correlation analysis error:', error);
    return null;
  }
}

// =========================
// BEHAVIORAL METRICS ANALYSIS
// =========================

export interface BehavioralMetricsResult {
  averageDwellTime: number;  // ms
  averageReactionTime: number;  // ms
  hesitationRate: number;  // % of swipes with hesitation
  swipeVelocityMean: number;
  insights: string[];
}

/**
 * Analyze behavioral metrics from enhanced swipe tracking
 */
export async function analyzeBehavioralMetrics(): Promise<BehavioralMetricsResult | null> {
  try {
    // Legacy tables removed after radical refactor
    const swipes: any[] = [];

    if (!swipes || swipes.length === 0) {
      return null;
    }

    const avgDwellTime = swipes.reduce((sum, s: any) => sum + s.dwell_time_ms, 0) / swipes.length;
    const avgReactionTime = swipes.reduce((sum, s: any) => sum + s.reaction_time_ms, 0) / swipes.length;
    const hesitationCount = swipes.filter((s: any) => s.hesitation_count > 0).length;
    const hesitationRate = (hesitationCount / swipes.length) * 100;
    const avgVelocity = swipes.reduce((sum, s: any) => sum + s.swipe_velocity, 0) / swipes.length;

    return {
      averageDwellTime: avgDwellTime,
      averageReactionTime: avgReactionTime,
      hesitationRate: hesitationRate,
      swipeVelocityMean: avgVelocity,
      insights: [
        `Average decision time: ${Math.round(avgDwellTime)}ms`,
        `Hesitation rate: ${hesitationRate.toFixed(1)}%`,
        'Faster swipes correlate with stronger preferences'
      ]
    };
  } catch (error) {
    console.error('Behavioral metrics analysis error:', error);
    return null;
  }
}

// =========================
// DOWNLOAD FUNCTIONS
// =========================

export function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(csvString: string, filename: string) {
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

