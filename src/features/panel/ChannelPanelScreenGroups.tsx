import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { groupIdOf } from './panelKeys';

interface GroupsProps {
  groups: readonly string[];
  selected: string;
  locked: ReadonlySet<string>;
  /** Focus id RIGHT lands on (the remembered row), or undefined when the list is empty. */
  rightTarget: string | undefined;
  onSelect(group: string): void;
}

/**
 * Groups column (captures 25/47): Favorites, All channels, then playlist and
 * custom groups. The selected group keeps a dark pill; focus is the usual
 * light pill. Locked groups show a padlock and need the PIN.
 */
export function ChannelPanelScreenGroups({
  groups,
  selected,
  locked,
  rightTarget,
  onSelect,
}: GroupsProps): JSX.Element {
  return (
    <nav
      data-testid="panel-groups"
      className="flex w-[27.5rem] shrink-0 flex-col gap-2 overflow-y-auto px-8 pt-20 pb-8 portrait:w-[14rem] portrait:px-3"
      role="listbox"
      aria-label="Groups"
    >
      {groups.map((group) => {
        const isSelected = group === selected;
        return (
          <Focusable
            key={group}
            focusId={groupIdOf(group)}
            data-testid={groupIdOf(group)}
            data-selected={isSelected ? 'true' : undefined}
            data-focus-right={rightTarget}
            aria-selected={isSelected}
            role="option"
            onClick={() => onSelect(group)}
            className={`flex h-[4.875rem] shrink-0 items-center gap-4 rounded-lg px-8 text-[1.875rem] ${
              isSelected ? 'bg-telly-button-resting' : ''
            }`}
            focusedClassName="bg-telly-focus-fill focused:text-telly-focus-text"
          >
            <span className="truncate">{group}</span>
            {locked.has(group) && (
              <span data-testid="group-lock" aria-label="Locked" className="text-[1.5rem]">
                🔒
              </span>
            )}
          </Focusable>
        );
      })}
    </nav>
  );
}
