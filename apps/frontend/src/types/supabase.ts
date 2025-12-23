// Typy dla bazy danych Supabase

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_hash: string;
          timestamp_consent_given: string;
          project_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_hash: string;
          timestamp_consent_given: string;
          project_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_hash?: string;
          timestamp_consent_given?: string;
          project_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      discovery_sessions: {
        Row: {
          id: string;
          project_id: string;
          visual_dna: any;
          dna_accuracy_score: number;
          laddering_path: any;
          core_need: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          visual_dna: any;
          dna_accuracy_score: number;
          laddering_path: any;
          core_need: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          visual_dna?: any;
          dna_accuracy_score?: number;
          laddering_path?: any;
          core_need?: string;
          created_at?: string;
        };
      };
      generation_sets: {
        Row: {
          id: string;
          project_id: string;
          prompt: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          prompt: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          prompt?: string;
          created_at?: string;
        };
      };
      generated_images: {
        Row: {
          id: string;
          generation_set_id: string;
          parent_image_id?: string;
          image_url: string;
          prompt_fragment: string;
          aesthetic_match_score?: number;
          character_score?: number;
          harmony_score?: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          generation_set_id: string;
          parent_image_id?: string;
          image_url: string;
          prompt_fragment: string;
          aesthetic_match_score?: number;
          character_score?: number;
          harmony_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          generation_set_id?: string;
          parent_image_id?: string;
          image_url?: string;
          prompt_fragment?: string;
          aesthetic_match_score?: number;
          character_score?: number;
          harmony_score?: number;
          created_at?: string;
        };
      };
      behavioral_logs: {
        Row: {
          id: number;
          project_id: string;
          event_type: string;
          event_data: any;
          created_at: string;
        };
        Insert: {
          id?: number;
          project_id: string;
          event_type: string;
          event_data: any;
          created_at?: string;
        };
        Update: {
          id?: number;
          project_id?: string;
          event_type?: string;
          event_data?: any;
          created_at?: string;
        };
      };
      research_consents: {
        Row: {
          id: string;
          user_id: string;
          consent_version: string;
          consent_research: boolean;
          consent_processing: boolean;
          acknowledged_art13: boolean;
          locale: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          consent_version: string;
          consent_research: boolean;
          consent_processing: boolean;
          acknowledged_art13: boolean;
          locale: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          consent_version?: string;
          consent_research?: boolean;
          consent_processing?: boolean;
          acknowledged_art13?: boolean;
          locale?: string;
          created_at?: string;
        };
      };
    };
  };
}
