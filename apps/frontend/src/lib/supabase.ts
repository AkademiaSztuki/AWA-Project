import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
