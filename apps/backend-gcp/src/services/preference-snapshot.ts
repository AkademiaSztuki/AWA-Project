import { createHash } from 'crypto';
import type { PoolClient } from 'pg';

export const PREFERENCE_SNAPSHOT_MILESTONES = [
  'core_profile_complete',
  'room_setup_complete',
] as const;

export type PreferenceSnapshotMilestone = (typeof PREFERENCE_SNAPSHOT_MILESTONES)[number];

export type PreferenceSnapshotSource = 'core_profile' | 'room_setup' | 'session_sync';

const EXPLICIT_SIGNATURE_KEYS = [
  'explicit_style',
  'explicit_palette',
  'explicit_material_1',
  'explicit_material_2',
  'explicit_material_3',
  'explicit_warmth',
  'explicit_brightness',
  'explicit_complexity',
  'explicit_texture',
  'sensory_light',
  'sensory_music',
  'sensory_texture',
  'biophilia_score',
  'nature_metaphor',
  'room_preference_source',
] as const;

export type ExplicitSignatureFields = {
  explicit_style?: string | null;
  explicit_palette?: string | null;
  explicit_material_1?: string | null;
  explicit_material_2?: string | null;
  explicit_material_3?: string | null;
  explicit_warmth?: number | null;
  explicit_brightness?: number | null;
  explicit_complexity?: number | null;
  explicit_texture?: number | null;
  sensory_light?: string | null;
  sensory_music?: string | null;
  sensory_texture?: string | null;
  biophilia_score?: number | null;
  nature_metaphor?: string | null;
  room_preference_source?: string | null;
};

function normStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim().toLowerCase();
}

function normNum(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isNaN(n)) return '';
  return n.toFixed(4);
}

function pickSignatureFields(row: Record<string, unknown>): ExplicitSignatureFields {
  const out: ExplicitSignatureFields = {};
  for (const key of EXPLICIT_SIGNATURE_KEYS) {
    const v = row[key];
    if (v === undefined) continue;
    if (
      key === 'explicit_warmth' ||
      key === 'explicit_brightness' ||
      key === 'explicit_complexity' ||
      key === 'explicit_texture'
    ) {
      const n = typeof v === 'number' ? v : Number(v);
      out[key] = Number.isNaN(n) ? null : n;
    } else if (key === 'biophilia_score') {
      const n = typeof v === 'number' ? v : Number(v);
      out[key] = Number.isNaN(n) ? null : Math.round(n);
    } else {
      out[key] = v === null || v === undefined ? null : String(v);
    }
  }
  return out;
}

/** True when row carries at least one explicit preference signal worth snapshotting. */
export function rowHasExplicitPreferenceData(row: Record<string, unknown>): boolean {
  const sig = pickSignatureFields(row);
  return EXPLICIT_SIGNATURE_KEYS.some((k) => {
    const v = sig[k as keyof ExplicitSignatureFields];
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.length > 0;
    return true;
  });
}

export function buildExplicitContentHash(row: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of EXPLICIT_SIGNATURE_KEYS) {
    const v = row[key];
    if (key.startsWith('explicit_') && (key.includes('warmth') || key.includes('brightness') || key.includes('complexity') || key.includes('texture'))) {
      parts.push(`${key}=${normNum(v)}`);
    } else {
      parts.push(`${key}=${normStr(v)}`);
    }
  }
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

export function buildPayloadFromParticipantRow(row: Record<string, unknown>): Record<string, unknown> {
  const materials = [
    row.explicit_material_1,
    row.explicit_material_2,
    row.explicit_material_3,
  ].filter((m): m is string => typeof m === 'string' && m.trim().length > 0);

  const semantic: Record<string, unknown> = {};
  if (row.explicit_warmth != null) semantic.warmth = row.explicit_warmth;
  if (row.explicit_brightness != null) semantic.brightness = row.explicit_brightness;
  if (row.explicit_complexity != null) semantic.complexity = row.explicit_complexity;
  if (row.explicit_texture != null) semantic.texture = row.explicit_texture;

  const sensory: Record<string, unknown> = {};
  if (row.sensory_light != null) sensory.light = row.sensory_light;
  if (row.sensory_music != null) sensory.music = row.sensory_music;
  if (row.sensory_texture != null) sensory.texture = row.sensory_texture;

  return {
    colorsAndMaterials: {
      selectedStyle: row.explicit_style ?? null,
      selectedPalette: row.explicit_palette ?? null,
      topMaterials: materials,
    },
    semanticDifferential: Object.keys(semantic).length > 0 ? semantic : undefined,
    sensoryPreferences: Object.keys(sensory).length > 0 ? sensory : undefined,
    biophiliaScore: row.biophilia_score ?? null,
    natureMetaphor: row.nature_metaphor ?? null,
    roomPreferenceSource: row.room_preference_source ?? null,
  };
}

export function resolveSnapshotSource(
  row: Record<string, unknown>,
  milestone?: PreferenceSnapshotMilestone | null,
): PreferenceSnapshotSource {
  if (milestone === 'room_setup_complete') return 'room_setup';
  if (milestone === 'core_profile_complete') return 'core_profile';
  const hinted = row.preference_snapshot_source;
  if (hinted === 'room_setup' || hinted === 'core_profile' || hinted === 'session_sync') {
    return hinted;
  }
  return 'session_sync';
}

export function shouldInsertPreferenceSnapshot(params: {
  row: Record<string, unknown>;
  milestone?: PreferenceSnapshotMilestone | null;
  lastContentHash: string | null;
}): boolean {
  const { row, milestone, lastContentHash } = params;
  if (!rowHasExplicitPreferenceData(row)) {
    return false;
  }
  if (milestone && PREFERENCE_SNAPSHOT_MILESTONES.includes(milestone)) {
    return true;
  }
  const hash = buildExplicitContentHash(row);
  if (!lastContentHash) return true;
  return hash !== lastContentHash;
}

export async function getLatestPreferenceSnapshotHash(
  client: PoolClient,
  userHash: string,
): Promise<string | null> {
  const { rows } = await client.query<{ content_hash: string }>(
    `SELECT content_hash FROM participant_preference_snapshots
     WHERE user_hash = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [userHash],
  );
  return rows[0]?.content_hash ?? null;
}

export async function insertPreferenceSnapshotIfNeeded(
  client: PoolClient,
  params: {
    userHash: string;
    row: Record<string, unknown>;
    milestone?: PreferenceSnapshotMilestone | null;
  },
): Promise<{ inserted: boolean; contentHash?: string }> {
  const tableCheck = await client.query<{ reg: string | null }>(
    `SELECT to_regclass('public.participant_preference_snapshots') AS reg`,
  );
  if (!tableCheck.rows[0]?.reg) {
    return { inserted: false };
  }

  const { userHash, row, milestone } = params;
  if (!rowHasExplicitPreferenceData(row)) {
    return { inserted: false };
  }

  const lastHash = await getLatestPreferenceSnapshotHash(client, userHash);
  if (!shouldInsertPreferenceSnapshot({ row, milestone, lastContentHash: lastHash })) {
    return { inserted: false, contentHash: buildExplicitContentHash(row) };
  }

  const contentHash = buildExplicitContentHash(row);
  const source = resolveSnapshotSource(row, milestone);
  const sig = pickSignatureFields(row);
  const spaceId =
    typeof row.current_space_id === 'string' && row.current_space_id.length > 0
      ? row.current_space_id
      : null;
  const payload = buildPayloadFromParticipantRow(row);
  const comparison = row.preference_comparison_json ?? null;

  await client.query(
    `
    INSERT INTO participant_preference_snapshots (
      user_hash, space_id, source, milestone, content_hash,
      explicit_style, explicit_palette,
      explicit_warmth, explicit_brightness, explicit_complexity, explicit_texture,
      explicit_material_1, explicit_material_2, explicit_material_3,
      sensory_light, sensory_music, sensory_texture,
      biophilia_score, nature_metaphor, room_preference_source,
      implicit_style_1, payload, preference_comparison_json
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
    )
    `,
    [
      userHash,
      spaceId,
      source,
      milestone ?? null,
      contentHash,
      sig.explicit_style ?? null,
      sig.explicit_palette ?? null,
      sig.explicit_warmth ?? null,
      sig.explicit_brightness ?? null,
      sig.explicit_complexity ?? null,
      sig.explicit_texture ?? null,
      sig.explicit_material_1 ?? null,
      sig.explicit_material_2 ?? null,
      sig.explicit_material_3 ?? null,
      sig.sensory_light ?? null,
      sig.sensory_music ?? null,
      sig.sensory_texture ?? null,
      sig.biophilia_score ?? null,
      sig.nature_metaphor ?? null,
      sig.room_preference_source ?? null,
      typeof row.implicit_style_1 === 'string' ? row.implicit_style_1 : null,
      JSON.stringify(payload),
      comparison != null ? JSON.stringify(comparison) : null,
    ],
  );

  return { inserted: true, contentHash };
}
