// TIER 2: Adaptive Structured Questions
// These questions are DYNAMIC but from a structured library
// They adapt based on: room type, social context, household size
// Bilingual support: PL / EN

import { LocalizedText, Language } from './validated-scales';

// =========================
// TYPES
// =========================

export interface ActivityOption {
  id: string;
  icon: string;
  label: LocalizedText;
  followUpId?: string; // Which follow-up question to ask
}

export interface FollowUpQuestion {
  id: string;
  condition?: (context: QuestionContext) => boolean;
  question: LocalizedText;
  type: 'select' | 'emoji_scale' | 'multi_select' | 'text';
  options?: Array<{
    id: string;
    label: LocalizedText;
    icon?: string;
  }>;
}

export interface QuestionContext {
  roomType: string;
  socialContext: 'solo' | 'shared';
  sharedWith?: string[];
  householdSize: number;
  activities?: string[]; // Selected activities
}

export interface PainPoint {
  id: string;
  label: LocalizedText;
  icon: string;
}

// =========================
// ACTIVITY QUESTIONS (per room type)
// =========================

export const ACTIVITY_QUESTIONS: Record<string, ActivityOption[]> = {
  bedroom: [
    { 
      id: 'sleep', 
      icon: '💤', 
      label: { pl: 'Spanie', en: 'Sleeping' },
      followUpId: 'sleep_quality'
    },
    { 
      id: 'dress', 
      icon: '👔', 
      label: { pl: 'Ubieranie się', en: 'Getting dressed' },
      followUpId: 'dressing_zone'
    },
    { 
      id: 'work', 
      icon: '💻', 
      label: { pl: 'Praca', en: 'Working' },
      followUpId: 'work_hours'
    },
    { 
      id: 'read', 
      icon: '📖', 
      label: { pl: 'Czytanie', en: 'Reading' },
      followUpId: 'reading_time'
    },
    { 
      id: 'relax', 
      icon: '😌', 
      label: { pl: 'Relaks', en: 'Relaxing' }
    },
    { 
      id: 'exercise', 
      icon: '🧘', 
      label: { pl: 'Ćwiczenia', en: 'Exercising' }
    },
    { 
      id: 'watch_tv', 
      icon: '📺', 
      label: { pl: 'Oglądanie TV', en: 'Watching TV' }
    },
    { 
      id: 'hobby', 
      icon: '🎨', 
      label: { pl: 'Hobby', en: 'Hobby activities' }
    }
  ],

  living_room: [
    { 
      id: 'relax', 
      icon: '😌', 
      label: { pl: 'Relaks', en: 'Relaxing' },
      followUpId: 'alone_or_together'
    },
    { 
      id: 'entertain', 
      icon: '🎉', 
      label: { pl: 'Przyjmowanie gości', en: 'Entertaining guests' },
      followUpId: 'guest_frequency'
    },
    { 
      id: 'watch_tv', 
      icon: '📺', 
      label: { pl: 'Oglądanie TV', en: 'Watching TV/movies' }
    },
    { 
      id: 'read', 
      icon: '📖', 
      label: { pl: 'Czytanie', en: 'Reading' }
    },
    { 
      id: 'work', 
      icon: '💻', 
      label: { pl: 'Praca', en: 'Working' }
    },
    { 
      id: 'eat', 
      icon: '🍽️', 
      label: { pl: 'Jedzenie', en: 'Eating' }
    },
    { 
      id: 'family_time', 
      icon: '👨‍👩‍👧', 
      label: { pl: 'Czas z rodziną', en: 'Family time' }
    },
    { 
      id: 'play', 
      icon: '🎮', 
      label: { pl: 'Gry/zabawa', en: 'Gaming/playing' }
    }
  ],

  kitchen: [
    { 
      id: 'cook', 
      icon: '🍳', 
      label: { pl: 'Gotowanie', en: 'Cooking' },
      followUpId: 'cooking_frequency'
    },
    { 
      id: 'eat', 
      icon: '🍽️', 
      label: { pl: 'Jedzenie', en: 'Eating meals' }
    },
    { 
      id: 'socialize', 
      icon: '☕', 
      label: { pl: 'Spotkania towarzyskie', en: 'Socializing' }
    },
    { 
      id: 'work', 
      icon: '💻', 
      label: { pl: 'Praca', en: 'Working' }
    },
    { 
      id: 'baking', 
      icon: '🧁', 
      label: { pl: 'Pieczenie', en: 'Baking' }
    }
  ],

  home_office: [
    { 
      id: 'deep_work', 
      icon: '🎯', 
      label: { pl: 'Głęboka praca', en: 'Deep focused work' },
      followUpId: 'work_type'
    },
    { 
      id: 'calls', 
      icon: '📞', 
      label: { pl: 'Rozmowy/spotkania', en: 'Calls/meetings' }
    },
    { 
      id: 'creative', 
      icon: '💡', 
      label: { pl: 'Praca kreatywna', en: 'Creative work' }
    },
    { 
      id: 'admin', 
      icon: '📊', 
      label: { pl: 'Zadania administracyjne', en: 'Administrative tasks' }
    },
    { 
      id: 'learning', 
      icon: '📚', 
      label: { pl: 'Nauka/rozwój', en: 'Learning/development' }
    }
  ],

  bathroom: [
    { 
      id: 'morning_routine', 
      icon: '🌅', 
      label: { pl: 'Poranna rutyna', en: 'Morning routine' }
    },
    { 
      id: 'evening_routine', 
      icon: '🌙', 
      label: { pl: 'Wieczorna rutyna', en: 'Evening routine' }
    },
    { 
      id: 'relaxation', 
      icon: '🛁', 
      label: { pl: 'Relaks (kąpiel)', en: 'Relaxation (bath)' }
    },
    { 
      id: 'grooming', 
      icon: '💆', 
      label: { pl: 'Pielęgnacja', en: 'Grooming/self-care' }
    }
  ],

  dining_room: [
    { 
      id: 'daily_meals', 
      icon: '🍽️', 
      label: { pl: 'Codzienne posiłki', en: 'Daily meals' }
    },
    { 
      id: 'entertaining', 
      icon: '🎉', 
      label: { pl: 'Przyjęcia', en: 'Dinner parties' }
    },
    { 
      id: 'work', 
      icon: '💻', 
      label: { pl: 'Praca', en: 'Working' }
    },
    { 
      id: 'homework', 
      icon: '📚', 
      label: { pl: 'Odrabianie lekcji', en: 'Homework/study' }
    },
    { 
      id: 'family_gathering', 
      icon: '👨‍👩‍👧', 
      label: { pl: 'Spotkania rodzinne', en: 'Family gatherings' }
    }
  ],

  kids_room: [
    { 
      id: 'sleep', 
      icon: '💤', 
      label: { pl: 'Spanie', en: 'Sleeping' }
    },
    { 
      id: 'play', 
      icon: '🧸', 
      label: { pl: 'Zabawa', en: 'Playing' }
    },
    { 
      id: 'homework', 
      icon: '📚', 
      label: { pl: 'Odrabianie lekcji', en: 'Homework' }
    },
    { 
      id: 'creative', 
      icon: '🎨', 
      label: { pl: 'Zajęcia kreatywne', en: 'Creative activities' }
    },
    { 
      id: 'reading', 
      icon: '📖', 
      label: { pl: 'Czytanie', en: 'Reading' }
    }
  ],

  default: [
    { 
      id: 'work', 
      icon: '💻', 
      label: { pl: 'Praca', en: 'Working' }
    },
    { 
      id: 'relax', 
      icon: '😌', 
      label: { pl: 'Relaks', en: 'Relaxing' }
    },
    { 
      id: 'socialize', 
      icon: '👥', 
      label: { pl: 'Spotkania', en: 'Socializing' }
    },
    { 
      id: 'hobby', 
      icon: '🎨', 
      label: { pl: 'Hobby', en: 'Hobby activities' }
    }
  ]
};

// =========================
// FOLLOW-UP QUESTIONS
// =========================

export const FOLLOW_UP_QUESTIONS: Record<string, FollowUpQuestion> = {
  sleep_quality: {
    id: 'sleep_quality',
    question: { 
      pl: 'Jak dobrze śpisz w tym pokoju?',
      en: 'How well do you sleep in this room?'
    },
    type: 'emoji_scale',
    options: [
      { id: 'great', label: { pl: 'Świetnie', en: 'Great' }, icon: '😊' },
      { id: 'ok', label: { pl: 'OK', en: 'OK' }, icon: '😐' },
      { id: 'struggling', label: { pl: 'Z trudem', en: 'Struggling' }, icon: '😕' }
    ]
  },

  dressing_zone: {
    id: 'dressing_zone',
    question: { 
      pl: 'Czy masz dedykowaną strefę do ubierania się?',
      en: 'Do you have a dedicated dressing area?'
    },
    type: 'select',
    options: [
      { id: 'yes_works', label: { pl: 'Tak, działa świetnie', en: 'Yes, works great' } },
      { id: 'yes_cramped', label: { pl: 'Tak, ale ciasno', en: 'Yes, but cramped' } },
      { id: 'no_need', label: { pl: 'Nie, ale sobie radzę', en: 'No, but I manage' } },
      { id: 'no_want', label: { pl: 'Nie i potrzebuję', en: 'No, and I need one' } }
    ]
  },

  work_hours: {
    id: 'work_hours',
    question: { 
      pl: 'Ile czasu pracujesz w tym pokoju?',
      en: 'How much time do you work in this room?'
    },
    type: 'select',
    options: [
      { id: 'few_hours', label: { pl: 'Kilka godzin dziennie', en: 'Few hours daily' } },
      { id: 'half_day', label: { pl: 'Pół dnia', en: 'Half day' } },
      { id: 'full_day', label: { pl: 'Cały dzień', en: 'Full day' } },
      { id: 'occasionally', label: { pl: 'Okazjonalnie', en: 'Occasionally' } }
    ]
  },

  alone_or_together: {
    id: 'alone_or_together',
    condition: (context) => Array.isArray(context.activities) ? context.activities.includes('relax') : false,
    question: { 
      pl: 'Relaks - sam czy z kimś?',
      en: 'Relaxing - alone or with others?'
    },
    type: 'select',
    options: [
      { id: 'alone', label: { pl: 'Sam/sama', en: 'Alone' } },
      { id: 'partner', label: { pl: 'Z partnerem/partnerką', en: 'With partner' } },
      { id: 'family', label: { pl: 'Z rodziną', en: 'With family' } },
      { id: 'varies', label: { pl: 'Różnie', en: 'Varies' } }
    ]
  },

  guest_frequency: {
    id: 'guest_frequency',
    question: { 
      pl: 'Jak często przyjmujesz gości?',
      en: 'How often do you have guests?'
    },
    type: 'select',
    options: [
      { id: 'daily', label: { pl: 'Codziennie', en: 'Daily' } },
      { id: 'weekly', label: { pl: 'Co tydzień', en: 'Weekly' } },
      { id: 'monthly', label: { pl: 'Co miesiąc', en: 'Monthly' } },
      { id: 'rarely', label: { pl: 'Rzadko', en: 'Rarely' } }
    ]
  },

  cooking_frequency: {
    id: 'cooking_frequency',
    question: { 
      pl: 'Jak często gotujesz?',
      en: 'How often do you cook?'
    },
    type: 'select',
    options: [
      { id: 'daily', label: { pl: 'Codziennie', en: 'Daily' } },
      { id: 'few_times_week', label: { pl: 'Kilka razy w tygodniu', en: 'Few times a week' } },
      { id: 'occasionally', label: { pl: 'Okazjonalnie', en: 'Occasionally' } },
      { id: 'rarely', label: { pl: 'Rzadko', en: 'Rarely' } }
    ]
  },

  work_type: {
    id: 'work_type',
    question: { 
      pl: 'Jaki typ pracy wykonujesz głównie?',
      en: 'What type of work do you mainly do?'
    },
    type: 'select',
    options: [
      { id: 'analytical', label: { pl: 'Analityczna (liczby, dane)', en: 'Analytical (numbers, data)' } },
      { id: 'creative', label: { pl: 'Kreatywna (design, pisanie)', en: 'Creative (design, writing)' } },
      { id: 'communication', label: { pl: 'Komunikacyjna (spotkania, calls)', en: 'Communication (meetings, calls)' } },
      { id: 'mixed', label: { pl: 'Mieszana', en: 'Mixed' } }
    ]
  },

  reading_time: {
    id: 'reading_time',
    question: { 
      pl: 'Kiedy najczęściej czytasz?',
      en: 'When do you usually read?'
    },
    type: 'select',
    options: [
      { id: 'before_sleep', label: { pl: 'Przed snem', en: 'Before sleep' } },
      { id: 'morning', label: { pl: 'Rano', en: 'Morning' } },
      { id: 'afternoon', label: { pl: 'Popołudniu', en: 'Afternoon' } },
      { id: 'varies', label: { pl: 'Różnie', en: 'Varies' } }
    ]
  }
};

// =========================
// PAIN POINTS (common across room types)
// =========================

export const PAIN_POINTS: PainPoint[] = [
  { id: 'layout', label: { pl: 'Układ', en: 'Layout' }, icon: '📐' },
  { id: 'light', label: { pl: 'Oświetlenie', en: 'Lighting' }, icon: '💡' },
  { id: 'color', label: { pl: 'Kolory', en: 'Colors' }, icon: '🎨' },
  { id: 'clutter', label: { pl: 'Bałagan', en: 'Clutter' }, icon: '📦' },
  { id: 'storage', label: { pl: 'Brak miejsca', en: 'Lack of storage' }, icon: '🗄️' },
  { id: 'comfort', label: { pl: 'Dyskomfort', en: 'Discomfort' }, icon: '🪑' },
  { id: 'too_cold', label: { pl: 'Zimno', en: 'Too cold' }, icon: '❄️' },
  { id: 'too_busy', label: { pl: 'Chaos', en: 'Too busy' }, icon: '🌀' }
];

// =========================
// SOCIAL DYNAMICS QUESTIONS (for shared rooms)
// =========================

export const SOCIAL_DYNAMICS_QUESTIONS: FollowUpQuestion[] = [
  {
    id: 'similar_needs',
    question: { 
      pl: 'Czy macie podobne potrzeby w tym pokoju?',
      en: 'Do you have similar needs in this room?'
    },
    type: 'select',
    options: [
      { id: 'very_similar', label: { pl: 'Bardzo podobne', en: 'Very similar' } },
      { id: 'somewhat', label: { pl: 'Częściowo', en: 'Somewhat similar' } },
      { id: 'quite_different', label: { pl: 'Całkiem różne', en: 'Quite different' } }
    ]
  },
  {
    id: 'main_conflict',
    condition: (context) => true, // Show if they said "different"
    question: { 
      pl: 'Co jest największą różnicą/konfliktem?',
      en: 'What is the main difference/conflict?'
    },
    type: 'multi_select',
    options: [
      { id: 'temperature', label: { pl: 'Temperatura (ciepło/zimno)', en: 'Temperature preferences' } },
      { id: 'light', label: { pl: 'Preferencje światła', en: 'Light preferences' } },
      { id: 'clutter', label: { pl: 'Tolerancja bałaganu', en: 'Clutter tolerance' } },
      { id: 'style', label: { pl: 'Gust estetyczny', en: 'Aesthetic taste' } },
      { id: 'activities', label: { pl: 'Konflikt aktywności', en: 'Activity conflicts' } },
      { id: 'timing', label: { pl: 'Rytm dnia (skowronek/sowa)', en: 'Daily rhythm (morning/night person)' } }
    ]
  },
  {
    id: 'solution',
    question: { 
      pl: 'Co pomogłoby wam obojgu?',
      en: 'What would help both of you?'
    },
    type: 'multi_select',
    options: [
      { id: 'zoning', label: { pl: 'Strefy (każdy swoją przestrzeń)', en: 'Zoning (each own space)' } },
      { id: 'flexible_lighting', label: { pl: 'Elastyczne oświetlenie', en: 'Flexible lighting' } },
      { id: 'personal_storage', label: { pl: 'Osobiste przechowywanie', en: 'Personal storage' } },
      { id: 'compromise_aesthetic', label: { pl: 'Kompromis estetyczny', en: 'Compromise aesthetics' } },
      { id: 'schedule', label: { pl: 'Harmonogram użytkowania', en: 'Usage schedule' } }
    ]
  }
];

// =========================
// ROOM TYPE NORMALIZATION
// =========================

/**
 * Maps detected room types from AI to normalized room types used in the app
 * This ensures consistency between AI detection and UI/DB
 */
export const ROOM_TYPE_MAPPING: Record<string, string> = {
  // AI detected types -> normalized types
  'office': 'home_office',
  'home_office': 'home_office',
  'kitchen': 'kitchen',
  'bedroom': 'bedroom',
  'living_room': 'living_room',
  'bathroom': 'bathroom',
  'dining_room': 'dining_room',
  'kids_room': 'kids_room',
  'empty_room': 'empty_room',
  // Fallback
  'other': 'other'
};

/**
 * Normalizes detected room type from AI to app's internal format
 * @param detectedType - Raw type from AI (e.g., "office")
 * @returns Normalized type (e.g., "home_office")
 */
export function normalizeDetectedRoomType(detectedType: string | null | undefined): string {
  if (!detectedType) return 'other';
  const normalized = ROOM_TYPE_MAPPING[detectedType.toLowerCase()];
  return normalized || 'other';
}

/**
 * Normalizes room type to key used in ACTIVITY_QUESTIONS
 * This ensures we always get the right questions for the room type
 * @param roomType - Room type (can be raw or already normalized)
 * @returns Key for ACTIVITY_QUESTIONS
 */
export function normalizeRoomTypeForQuestions(roomType: string | null | undefined): string {
  if (!roomType) return 'default';

  const normalized = normalizeDetectedRoomType(roomType);

  // empty_room / other: no dedicated activity set — use living_room breadth so users still see ~8 options
  if (normalized === 'empty_room' || normalized === 'other') {
    return 'living_room';
  }

  if (ACTIVITY_QUESTIONS[normalized]) {
    return normalized;
  }

  return 'default';
}

// =========================
// QUESTION ROUTER
// =========================

export function getQuestionsForRoom(
  roomType: string,
  socialContext: 'solo' | 'shared'
): ActivityOption[] {
  const normalizedType = normalizeRoomTypeForQuestions(roomType);
  const baseActivities = ACTIVITY_QUESTIONS[normalizedType] || ACTIVITY_QUESTIONS.default;
  
  // Return base activities - social dynamics questions come later if needed
  return baseActivities;
}

export function getSocialDynamicsQuestions(
  socialContext: 'solo' | 'shared'
): FollowUpQuestion[] {
  if (socialContext === 'shared') {
    return SOCIAL_DYNAMICS_QUESTIONS;
  }
  return [];
}

export function getFollowUpQuestion(
  followUpId: string,
  context: QuestionContext
): FollowUpQuestion | null {
  const question = FOLLOW_UP_QUESTIONS[followUpId];
  if (!question) return null;
  
  // Check condition if exists
  if (question.condition && !question.condition(context)) {
    return null;
  }
  
  return question;
}

// =========================
// HELPER FUNCTIONS
// =========================

export function getLocalizedActivityLabel(
  activity: ActivityOption,
  lang: Language = 'pl'
): string {
  return activity.label[lang];
}

export function getLocalizedPainPointLabel(
  painPoint: PainPoint,
  lang: Language = 'pl'
): string {
  return painPoint.label[lang];
}

