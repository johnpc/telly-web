import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { watchHistoryRepository } from '@/core/db/watchHistoryRepository';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useClockStyle } from '@/features/playback/info/usePlayerSettings';
import { LAST_CHANNEL_KEY, playbackDeps } from '@/features/playback/tune';
import { IconCircle } from '@/features/playback/ui/IconCircleScreen';
import { LogoTile } from '@/features/playback/ui/LogoTileScreen';
import type { HistoryRow } from './historyRows';
import { useHistoryRows } from './useHistoryRows';

function Row({ row, onClick }: { row: HistoryRow; onClick: () => void }): JSX.Element {
  return (
    <Focusable
      focusId={`history-${row.channel.id}`}
      as="button"
      data-testid="history-row"
      onClick={onClick}
      className="flex h-[4.875rem] w-full items-center gap-[1.25rem] rounded px-[1rem] text-left text-telly-text"
      focusedClassName="bg-telly-focus-fill text-telly-focus-text"
    >
      <LogoTile logoUrl={row.channel.logoUrl} name={row.name} className="h-[3rem] w-[3rem] text-[0.75rem]" />
      <span className="w-[22.5rem] truncate text-[1.875rem]" data-testid="history-row-name">
        {row.name}
      </span>
      <span className="flex-1 truncate text-[1.75rem] opacity-70">{row.programmeTitle ?? ''}</span>
      <span className="text-[1.625rem] opacity-70">{row.watchedText}</span>
    </Focusable>
  );
}

/** Top-right header: "History" with the 40 dp clear-all trash to its right (history-round2 uidump 12). */
function Header(): JSX.Element {
  return (
    <div className="absolute top-[2.5rem] right-[3rem] flex items-center gap-[1.5rem]">
      <h1 className="text-[3.5rem] text-white">History</h1>
      <IconCircle
        focusId="history-clear"
        icon="trash"
        label="Clear history"
        testId="history-clear"
        onClick={() => void watchHistoryRepository.clear()}
      />
    </div>
  );
}

/** OK on a row persists the channel like search does; the player re-tunes it on return. */
function pickRow(row: HistoryRow): void {
  playbackDeps.store.set(LAST_CHANNEL_KEY, String(row.channel.id));
}

/**
 * The full-screen History list (history-round2 §3): title "History" +
 * clear-all trash top-RIGHT, rows of recently watched channels (or a
 * centered "No history"), BACK popping to the fullscreen player.
 */
export function HistoryScreen(): JSX.Element {
  const navigator = useNavigator();
  const rows = useHistoryRows(useClockStyle()) ?? [];
  return (
    <FocusScope id="history" autoFocus="first" onBack={() => navigator.pop()}>
      <div className="relative h-full w-full bg-telly-onboarding-bg" data-testid="history-screen">
        <Header />
        {rows.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-[2.25rem] text-telly-text-muted">
            No history
          </p>
        )}
        <div className="absolute inset-x-[5rem] top-[10rem] bottom-0 overflow-y-auto">
          {rows.map((row) => (
            <Row
              key={row.channel.id}
              row={row}
              onClick={() => {
                pickRow(row);
                navigator.pop();
              }}
            />
          ))}
        </div>
      </div>
    </FocusScope>
  );
}
