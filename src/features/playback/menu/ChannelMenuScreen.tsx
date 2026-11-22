import { useEffect, type JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { focusEngine } from '@/core/focus/focusEngine';
import { MenuRow } from '../ui/MenuRowScreen';
import type { IconName } from '../ui/IconsScreen';
import { type MenuLabelState, menuLabel, type PlayerMenuItem, type PlayerMenuSection } from './playerMenu';

const ICONS: Readonly<Partial<Record<PlayerMenuItem, IconName>>> = { Search: 'search', Settings: 'settings' };

interface ChannelMenuProps {
  sections: readonly PlayerMenuSection[];
  state: MenuLabelState;
  /** The row BACK from a pushed screen re-lands on; null = the first row. */
  restore: PlayerMenuItem | null;
  onItem: (item: PlayerMenuItem) => void;
  onBack: () => void;
}

/** Right-side context-menu sheet (round3-ref 05 + captures 38-40): 256 dp wide, blue section headers, 40 dp rows. */
export function ChannelMenu({ sections, state, restore, onItem, onBack }: ChannelMenuProps): JSX.Element {
  useEffect(() => {
    if (restore !== null) focusEngine.focus(`menu-${restore}`);
  }, [restore]);
  return (
    <FocusScope id="playback-channel-menu" trap autoFocus="first" onBack={onBack}>
      <div className="absolute inset-0 bg-black/60" data-testid="channel-menu">
        <div className="absolute top-[1rem] right-[1rem] bottom-[1rem] w-[32rem] overflow-y-auto rounded bg-telly-menu-sheet py-[0.5rem]">
          {sections.map((section, index) => (
            <div key={index}>
              {section.header !== null && (
                <p className="px-[2rem] pt-[1.75rem] pb-[0.5rem] text-[1.75rem] text-telly-playback-accent">
                  {section.header}
                </p>
              )}
              {section.items.map((item) => (
                <div key={item} className="px-[1rem]">
                  <MenuRow
                    focusId={`menu-${item}`}
                    label={menuLabel(item, state)}
                    icon={ICONS[item]}
                    onClick={() => onItem(item)}
                    testId="menu-row"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </FocusScope>
  );
}
