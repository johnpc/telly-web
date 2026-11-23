import { type ComponentProps, type JSX, useEffect } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { focusEngine } from '@/core/focus/focusEngine';
import { DP_ROOT_STYLE, dp, sp } from '@/features/groups/toolCss';
import { SearchIcon, SettingsIcon } from '@/features/guide/GuideIconsScreen';
import { type SheetFlags, type SheetItem, type SheetSection, sheetLabel, sheetRowId } from './sheetMenu';

interface SheetScreenProps {
  scopeId: string;
  /** Row focus ids are `${focusPrefix}${item with dashes}` (hosts key their focus policies off the prefix). */
  focusPrefix: string;
  sections: readonly SheetSection[];
  flags: SheetFlags;
  autoFocus: NonNullable<ComponentProps<typeof FocusScope>['autoFocus']>;
  /** The row BACK from a pushed screen re-lands on; null = whatever `autoFocus` picks. */
  restore: SheetItem | null;
  /** Dim the whole host behind the sheet (the guide dims around the originating row itself). */
  scrim: boolean;
  onItem: (item: SheetItem) => void;
  onBack?: (() => void) | undefined;
}

type RowProps = Pick<SheetScreenProps, 'focusPrefix' | 'flags' | 'onItem'>;

/** Only Search and Settings carry icons in the captured menu (38). */
function SheetIcon({ item }: { item: SheetItem }): JSX.Element | null {
  if (item === 'Search') return <SearchIcon className="h-[1.2em] w-[1.2em]" />;
  return item === 'Settings' ? <SettingsIcon className="h-[1.2em] w-[1.2em]" /> : null;
}

/** One 40 dp sheet row, pill inset 8 dp (the shared `menu-row` test id). */
function SheetRow({ item, flags, focusPrefix, onItem }: RowProps & { item: SheetItem }): JSX.Element {
  return (
    <Focusable
      focusId={sheetRowId(focusPrefix, item)}
      className="flex items-center gap-[0.8em] rounded-[4px] text-telly-text"
      style={{ height: dp(40), fontSize: sp(15), margin: `0 ${dp(8)}`, padding: `0 ${dp(16)}` }}
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
function SheetSectionScreen({ section, ...row }: RowProps & { section: SheetSection }): JSX.Element {
  return (
    <section>
      {section.header !== null && (
        <h3
          className="line-clamp-2 text-telly-playback-accent"
          style={{ padding: `${dp(14)} ${dp(16)} ${dp(4)}`, fontSize: sp(14) }}
        >
          {section.header}
        </h3>
      )}
      {section.items.map((item) => (
        <SheetRow key={item} item={item} {...row} />
      ))}
    </section>
  );
}

/**
 * The ONE 256 dp context sheet docked 8 dp off the top/right (round3-ref 05,
 * captures 38-40), mounted by the guide over its grid and by the player
 * over the channel panel (the shared `channel-menu` test id).
 */
export function SheetScreen({
  scopeId,
  sections,
  autoFocus,
  restore,
  scrim,
  onBack,
  ...row
}: SheetScreenProps): JSX.Element {
  useEffect(() => {
    if (restore !== null) focusEngine.focus(sheetRowId(row.focusPrefix, restore));
  }, [restore, row.focusPrefix]);
  return (
    <FocusScope id={scopeId} trap autoFocus={autoFocus} {...(onBack === undefined ? {} : { onBack })}>
      {scrim && <div className="absolute inset-0 bg-black/60" />}
      <div
        className="absolute z-30 flex flex-col overflow-y-auto rounded-[4px] bg-telly-menu-sheet"
        style={{ ...DP_ROOT_STYLE, top: dp(8), right: dp(8), bottom: dp(8), width: dp(256) }}
        data-testid="channel-menu"
      >
        {sections.map((section, index) => (
          <SheetSectionScreen key={index} section={section} {...row} />
        ))}
      </div>
    </FocusScope>
  );
}
