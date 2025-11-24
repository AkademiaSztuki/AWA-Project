import { RoomActivity, ActivityContext } from '@/types/deep-personalization';

interface ActivityMappingRule {
  furniture?: string[];
  zones?: string[];
  storage?: string[];
  lighting?: string[];
}

const BASE_ACTIVITY_RULES: Record<string, ActivityMappingRule> = {
  sleep: {
    furniture: ['upholstered_bed', 'comfort_mattress', 'nightstands'],
    zones: ['rest_zone'],
    lighting: ['circadian_lighting']
  },
  relax: {
    furniture: ['lounge_sofa', 'accent_chair', 'low_table'],
    zones: ['rest_zone'],
    lighting: ['dimmable_ambient']
  },
  entertain: {
    furniture: ['modular_seating', 'extendable_table', 'extra_stools'],
    zones: ['social_zone'],
    storage: ['hidden_bar_storage']
  },
  watch_tv: {
    furniture: ['media_wall', 'acoustic_paneling'],
    zones: ['media_zone'],
    lighting: ['bias_lighting']
  },
  work: {
    furniture: ['ergonomic_desk', 'task_chair', 'monitor_arm'],
    zones: ['focus_zone'],
    lighting: ['task_lighting'],
    storage: ['cable_management', 'document_drawers']
  },
  deep_work: {
    furniture: ['height_adjustable_desk', 'ergonomic_chair'],
    zones: ['focus_zone'],
    lighting: ['anti_glare_task'],
    storage: ['acoustic_partition']
  },
  creative: {
    furniture: ['project_table', 'material_cart'],
    zones: ['creative_zone'],
    storage: ['open_shelving']
  },
  read: {
    furniture: ['reading_chair', 'ottoman', 'bookcase'],
    zones: ['retreat_corner'],
    lighting: ['floor_lamp']
  },
  cook: {
    furniture: ['island_or_prep_zone', 'ventilation_hood'],
    zones: ['prep_zone'],
    lighting: ['counter_task_lighting'],
    storage: ['pantry_pullouts']
  },
  eat: {
    furniture: ['dining_table', 'bench_seating'],
    zones: ['dining_zone']
  },
  family_time: {
    furniture: ['sectional_sofa', 'storage_ottoman'],
    zones: ['family_zone'],
    storage: ['boardgame_drawer']
  },
  play: {
    furniture: ['soft_flooring', 'toy_storage'],
    zones: ['play_zone']
  },
  exercise: {
    furniture: ['mirror_panel', 'equipment_storage'],
    zones: ['movement_zone'],
    lighting: ['bright_even']
  },
  calls: {
    furniture: ['acoustic_panel', 'perch_stool'],
    zones: ['call_zone']
  },
  socialize: {
    furniture: ['conversation_group', 'bar_cart'],
    zones: ['social_zone']
  }
};

const addItems = (target: Set<string>, items?: string[]) => {
  items?.forEach((item) => target.add(item));
};

export function mapActivitiesToRecommendations(activities: RoomActivity[] = []): ActivityContext {
  const furniture = new Set<string>();
  const zones = new Set<string>();
  const storage = new Set<string>();
  const lighting = new Set<string>();

  activities.forEach((activity) => {
    const rules = BASE_ACTIVITY_RULES[activity.type] || {};
    addItems(furniture, rules.furniture);
    addItems(zones, rules.zones);
    addItems(storage, rules.storage);
    addItems(lighting, rules.lighting);

    if (activity.withWhom && activity.withWhom !== 'alone') {
      zones.add('multi_user_zoning');
      furniture.add('flexible_seating');
    }

    if (activity.timeOfDay === 'evening' || activity.timeOfDay === 'night') {
      lighting.add('layered_dimming');
    }

    if (activity.satisfaction === 'difficult') {
      storage.add(`improve_${activity.type}_support`);
    }
  });

  return {
    requiredFurniture: Array.from(furniture),
    behaviorZones: Array.from(zones),
    storageNeeds: Array.from(storage),
    lightingNotes: Array.from(lighting)
  };
}

