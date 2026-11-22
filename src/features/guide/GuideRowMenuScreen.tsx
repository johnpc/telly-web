import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { displayName } from '@/core/db/types';
import { SearchIcon, SettingsIcon } from './GuideIconsScreen';
import type { GuideController } from './guideController';
import { sheetFlagsFor, sheetTarget } from './guideCellLabels';
import { sp } from './guideCss';
import { dp } from './guideGeometry';
import type { GuideInfoData } from './guideInfoBuilder';
import type { GuideRow } from './guideModel';
import { type SheetFlags, type SheetItem, type SheetSection, sheetLabel, sheetSections } from './sheetMenu';
import { useMyListKeys } from './useSheetKeys';

interface RowMenuProps {
  controller: GuideController;
  rows: readonly GuideRow[];
  info: GuideInfoData | null;
}

interface SheetProps {
  sections: SheetSection[];
  flags: SheetFlags;
  onItem: (item: SheetItem) => void;
}

/** Only Search and Settings carry icons in the captured menu (38). */
function SheetIcon({ item }: { item: SheetItem }): JSX.Element | null {
  if (item === 'Search') return <SearchIcon className="h-[1.2em] w-[1.2em]" />;
  return item === 'Settings' ? <SettingsIcon className="h-[1.2em] w-[1.2em]" /> : null;
}

/** One 40 dp sheet row, pill inset 8 dp (the shared `menu-row` test id). */
function SheetRow({ item, flags, onItem }: Omit<SheetProps, 'sections'> & { item: SheetItem }): JSX.Element {
  return (
    <Focusable
      focusId={`guide-sheet-${item.replaceAll(' ', '-')}`}
      className="flex items-center gap-[0.8em] rounded-[4px] text-telly-text"
      style={{
        height: dp(40),
        fontSize: sp(15),
        marginLeft: dp(8),
        marginRight: dp(8),
        paddingLeft: dp(16),
        paddingRight: dp(16),
      }}
      focusedClassName="bg-telly-focus-fill text-telly-focus-text"
      data-testid="menu-row"
      onClick={() => onItem(item)}
    >
      <SheetIcon item={item} />
      <span className="truncate">{sheetLabel(item, flags)}</span>
    </Focusable>
  );
}

/** One blue-headed section of the sheet. */
function SheetSectionScreen({
  section,
  flags,
  onItem,
}: Omit<SheetProps, 'sections'> & { section: SheetSection }): JSX.Element {
  return (
    <section>
      {section.header !== null && (
        <h3
          className="line-clamp-2 text-telly-playback-accent"
          style={{
            paddingLeft: dp(16),
            paddingRight: dp(16),
            paddingTop: dp(14),
            paddingBottom: dp(4),
            fontSize: sp(14),
          }}
        >
          {section.header}
        </h3>
      )}
      {section.items.map((item) => (
        <SheetRow key={item} item={item} flags={flags} onItem={onItem} />
      ))}
    </section>
  );
}

/** The 256 dp sheet docked 8 dp off the top/right (the shared `channel-menu` test id). */
function SheetScreen({ sections, flags, onItem }: SheetProps): JSX.Element {
  return (
    <FocusScope id="guide-sheet" trap>
      <div
        className="absolute z-30 flex flex-col overflow-y-auto rounded-[4px] bg-telly-menu-sheet"
        style={{ top: dp(8), right: dp(8), bottom: dp(8), width: dp(256) }}
        data-testid="channel-menu"
      >
        {sections.map((section, index) => (
          <SheetSectionScreen key={index} section={section} flags={flags} onItem={onItem} />
        ))}
      </div>
    </FocusScope>
  );
}

/**
 * MENU on a guide row: the full right-side context sheet with the grid
 * still visible behind it (round3-ref 05, captures 38-40).
 */
export function GuideRowMenuScreen({ controller, rows, info }: RowMenuProps): JSX.Element | null {
  const myList = useMyListKeys();
  const target = controller.layer.kind === 'RowMenu' ? sheetTarget(controller.engine.focus, rows) : null;
  if (target === null) return null;
  const flags = sheetFlagsFor(target.row.channel, target.cell.program, myList);
  const sections = sheetSections(info?.title ?? null, displayName(target.row.channel));
  return <SheetScreen sections={sections} flags={flags} onItem={controller.parts.onSheetItem} />;
}
