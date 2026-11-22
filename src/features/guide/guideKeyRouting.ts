import type { RemoteKey } from '@/core/input/remoteKeys';
import { type GuideKey, guideKeyOf } from './guideKeyPolicy';
import type { GuideLayer } from './guideLayer';

/** Focus ids of the nav rail / groups column (the Groups layer's spatial focus). */
export const RAIL_PREFIX = 'guide-rail-';
export const GROUP_PREFIX = 'guide-group-';
export const GEAR_ID = `${RAIL_PREFIX}settings`;

export function groupFocusId(group: string): string {
  return `${GROUP_PREFIX}${group}`;
}

/** True when `focusedId` is a rail icon or a groups-column row. */
export function inGroupsPane(focusedId: string | null): boolean {
  return focusedId !== null && (focusedId.startsWith(RAIL_PREFIX) || focusedId.startsWith(GROUP_PREFIX));
}

export interface KeyRoutingContext {
  layer: GuideLayer['kind'];
  focusedId: string | null;
  onKey: (key: GuideKey) => boolean;
  focusGear: () => void;
  /** True = exit now; false = the confirm toast armed instead. */
  exit: () => boolean;
}

/**
 * The guide's BACK chain mirrors LEFT (director round): grid → groups
 * column → settings gear → exit. On the rail BACK exits (gated by "Confirm
 * exit"); on the groups column it moves to the gear; RIGHT off the column
 * closes back to the grid. Returning false lets BACK fall through to the
 * shell, whose root pop is the web "exit".
 */
function routeGroupsKey(ctx: KeyRoutingContext, key: GuideKey): boolean {
  const inRail = ctx.focusedId?.startsWith(RAIL_PREFIX) ?? false;
  if (key === 'BACK') {
    if (inRail) return !ctx.exit();
    ctx.focusGear();
    return true;
  }
  return key === 'RIGHT' && !inRail ? ctx.onKey('RIGHT') : false;
}

/** One remote key on the guide screen; true = consumed. */
export function routeGuideKey(ctx: KeyRoutingContext, key: RemoteKey): boolean {
  const guideKey = guideKeyOf(key);
  if (guideKey === null) return false;
  if (ctx.layer === 'Grid') return ctx.onKey(guideKey);
  if (ctx.layer === 'Groups') return routeGroupsKey(ctx, guideKey);
  // Overlaid layers own their own (spatial) focus; only BACK routes through the policy.
  return guideKey === 'BACK' ? ctx.onKey('BACK') : false;
}
