import { useEffect, type JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { focusEngine } from '@/core/focus/focusEngine';
import type { ChannelRow } from '@/core/db/types';
import { TellySettings } from '@/core/settings/tellySettings';
import type { CustomGroup } from '@/features/groups/customGroups';
import { GuideRailScreen } from './GuideRailScreen';
import type { GuideController } from './guideController';
import { sp } from './guideCss';
import { dp } from './guideGeometry';
import { groupFocusId, inGroupsPane } from './guideKeyRouting';
import { groupNames, visibleGroupNames } from './guideRowsBuilder';

interface GroupsProps {
  controller: GuideController;
  channels: readonly ChannelRow[];
  custom: readonly CustomGroup[];
}

/**
 * Nav rail + groups column slid in at the guide's left (capture 25), grid
 * shifts right. Focus lands on the selected group; LEFT from a row reaches
 * the gear, RIGHT closes back to the grid (routed by the key policy).
 */
export function GuideGroupsScreen({ controller, channels, custom }: GroupsProps): JSX.Element {
  const settings = controller.deps.settings;
  const groups = visibleGroupNames(groupNames(channels, custom), {
    allChannels: settings.get(TellySettings.SHOW_ALL_CHANNELS_GROUP),
    favorites: settings.get(TellySettings.SHOW_FAVORITES_GROUP),
  });
  const selected = controller.selectedGroup;
  const landing = groups.includes(selected) ? selected : (groups[0] ?? selected);
  useEffect(() => {
    // Idempotent on purpose (StrictMode re-runs mount effects): never yank focus that already sits in the pane.
    if (!inGroupsPane(focusEngine.current)) focusEngine.focus(groupFocusId(landing));
  }, [landing]);
  return (
    <FocusScope id="guide-groups" trap autoFocus={false}>
      <div className="flex h-full shrink-0" data-testid="guide-groups">
        <GuideRailScreen controller={controller} groupsFocusId={groupFocusId(landing)} />
        <ul
          className="flex flex-col overflow-hidden"
          style={{
            width: dp(252),
            paddingTop: dp(213),
            paddingLeft: dp(16),
            paddingRight: dp(16),
            gap: dp(2.5),
          }}
        >
          {groups.map((group, index) => (
            <Focusable
              key={group}
              as="li"
              focusId={groupFocusId(group)}
              className={`flex shrink-0 items-center truncate rounded-[4px] text-telly-text ${group === selected ? 'bg-telly-button-resting' : ''}`}
              style={{ height: dp(36), paddingLeft: dp(16), paddingRight: dp(16), fontSize: sp(18) }}
              focusedClassName="bg-telly-focus-fill text-telly-focus-text"
              aria-selected={group === selected}
              data-testid={`panel-group-${group}`}
              data-selected={group === selected ? 'true' : 'false'}
              data-focus-left="guide-rail-settings"
              data-focus-up={groupFocusId(groups[index - 1] ?? group)}
              data-focus-down={groupFocusId(groups[index + 1] ?? group)}
              onClick={() => controller.selectGroup(group)}
            >
              {group}
            </Focusable>
          ))}
        </ul>
      </div>
    </FocusScope>
  );
}
