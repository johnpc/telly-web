import { act, fireEvent, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChannelRow } from '@/core/db/types';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorProvider } from '@/core/navigation/NavigatorProvider';
import { type MyListScreenRow, myListRowId } from './myListRows';
import type { MyListModel } from './useMyList';
import { useMyListActions } from './useMyListActions';

const tune = vi.fn();
vi.mock('@/features/playback/tune', () => ({
  usePlaybackSession: () => ({ tuner: { tune }, channels: [], engine: {}, playing: null }),
}));

const channel = { id: 1, name: 'News One' } as ChannelRow;
const rowOf = (startMs: number, airing: boolean): MyListScreenRow => ({
  entry: {
    channelKey: 'k',
    startMs,
    endMs: startMs + 1,
    title: `T${startMs}`,
    description: null,
    addedAtMs: 0,
  },
  channel,
  airTimeText: '',
  airing,
});
const rows = [rowOf(1, true), rowOf(2, false)];
const remove = vi.fn(async () => undefined);
const model: MyListModel = { rows, remove };

function Harness({ navigator }: { navigator: Navigator }): JSX.Element {
  return (
    <NavigatorProvider navigator={navigator}>
      <RemoteKeysProvider onBack={() => navigator.pop()}>
        <FocusScope id="t">
          <Probe />
        </FocusScope>
      </RemoteKeysProvider>
    </NavigatorProvider>
  );
}

function Probe(): JSX.Element {
  const actions = useMyListActions(model);
  return (
    <div>
      {rows.map((row) => (
        <Focusable key={row.entry.startMs} focusId={myListRowId(row)} onClick={() => actions.onRow(row)}>
          {row.entry.title}
        </Focusable>
      ))}
      <output>{actions.described?.entry.title ?? 'none'}</output>
      <button onClick={actions.closeDescription}>close</button>
    </div>
  );
}

describe('useMyListActions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  it('tunes airing rows with the guide-root chain, describes future rows, removes on long-OK', async () => {
    const navigator = new Navigator({ kind: 'MyList' });
    render(<Harness navigator={navigator} />);
    await act(async () => undefined);
    fireEvent.click(screen.getByText('T2'));
    expect(screen.getByRole('status')).toHaveTextContent('T2');
    fireEvent.click(screen.getByText('close'));
    expect(screen.getByRole('status')).toHaveTextContent('none');
    fireEvent.click(screen.getByText('T1'));
    expect(tune).toHaveBeenCalledWith(channel);
    expect(navigator.stack.map((r) => r.kind)).toEqual(['Guide', 'Playback']);
    // Long-OK on the focused row removes it.
    fireEvent.keyDown(window, { key: 'Enter' });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.keyUp(window, { key: 'Enter' });
    expect(remove).toHaveBeenCalledWith(rows[0]);
  });
});
