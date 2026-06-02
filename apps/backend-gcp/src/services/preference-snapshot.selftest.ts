/**
 * Run: pnpm --filter @aura/backend-gcp test:preference-snapshot
 */
import {
  buildExplicitContentHash,
  rowHasExplicitPreferenceData,
  shouldInsertPreferenceSnapshot,
} from './preference-snapshot';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const baseRow: Record<string, unknown> = {
  explicit_style: 'gothic',
  explicit_palette: 'analogous-harmony',
  explicit_brightness: 0.2,
  sensory_light: 'neutral',
};

const hash1 = buildExplicitContentHash(baseRow);
const hash2 = buildExplicitContentHash({ ...baseRow });
assert(hash1 === hash2, 'same signature → same hash');

const changed = { ...baseRow, explicit_style: 'industrial' };
const hash3 = buildExplicitContentHash(changed);
assert(hash1 !== hash3, 'style change → different hash');

assert(rowHasExplicitPreferenceData(baseRow), 'base row has explicit data');
assert(!rowHasExplicitPreferenceData({ generations_count: 3 }), 'counts only → no snapshot');

assert(
  !shouldInsertPreferenceSnapshot({
    row: baseRow,
    lastContentHash: hash1,
  }),
  'same hash → skip',
);

assert(
  shouldInsertPreferenceSnapshot({
    row: changed,
    lastContentHash: hash1,
  }),
  'changed style → insert',
);

assert(
  shouldInsertPreferenceSnapshot({
    row: baseRow,
    milestone: 'room_setup_complete',
    lastContentHash: hash1,
  }),
  'milestone → insert even if hash unchanged',
);

console.log('[preference-snapshot.selftest] all assertions passed');
