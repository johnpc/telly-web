import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { displayName } from '@/core/db/types';
import { LogoTile, ProgressBar } from './ChannelPanelScreenWidgets';
import { rowIdOf } from './panelKeys';
import type { PanelRow } from './panelRows';
import type { LogoStyle } from './usePanelModel';

interface RowProps {
  row: PanelRow;
  playing: boolean;
  logo: LogoStyle;
  /** Focus id LEFT lands on (the selected group). */
  leftTarget: string;
  /** The now/next read has not answered yet: no programme text, no progress track. */
  pending?: boolean;
  onFocus(): void;
  onClick(): void;
}

/**
 * One 39 dp channel row (78 px pitch in the 1080p captures): number, logo,
 * name, airing programme and its progress. The playing channel renders its
 * number/name in accent blue with a play marker (captures 24/47).
 */
export function ChannelPanelScreenRow({
  row,
  playing,
  logo,
  leftTarget,
  pending = false,
  onFocus,
  onClick,
}: RowProps): JSX.Element {
  const name = displayName(row.channel);
  const tone = playing ? 'text-telly-playback-accent' : '';
  return (
    <Focusable
      focusId={rowIdOf(row.channel.id)}
      data-testid={rowIdOf(row.channel.id)}
      data-channel-row
      role="option"
      aria-selected={playing}
      data-playing={playing ? 'true' : undefined}
      data-focus-left={leftTarget}
      onFocusCapture={onFocus}
      onClick={onClick}
      className="flex h-[4.875rem] shrink-0 items-center rounded-lg px-4"
      focusedClassName="bg-telly-focus-fill focused:text-telly-focus-text"
    >
      <span data-testid="row-number" className={`w-14 shrink-0 text-[1.875rem] ${tone}`}>
        {row.displayNumber}
      </span>
      <LogoTile
        logoUrl={row.channel.logoUrl}
        name={name}
        sizeClass="h-12 w-12"
        textClass="text-base"
        style={logo}
      />
      <span
        data-testid="row-name"
        className={`ml-5 w-[16.25rem] shrink-0 truncate text-[1.875rem] portrait:w-auto portrait:min-w-0 portrait:flex-1 `}
      >
        {name}
      </span>
      {row.channel.blocked && (
        <span
          data-testid="blocked-lock"
          aria-label="Blocked"
          className="ml-2 text-[1.25rem] text-telly-text-muted"
        >
          🔒
        </span>
      )}
      {playing && <span className="ml-2 text-[1.375rem] text-telly-playback-accent">▶</span>}
      <span
        data-testid="row-programme"
        className="ml-5 min-w-0 flex-1 truncate text-[1.75rem] opacity-70 portrait:hidden"
      >
        {pending ? '' : (row.nowTitle ?? '')}
      </span>
      {!pending && (
        <ProgressBar
          permille={row.progressPermille}
          widthClass="w-20"
          heightClass="h-1"
          fillClass="bg-telly-playback-accent"
        />
      )}
    </Focusable>
  );
}
