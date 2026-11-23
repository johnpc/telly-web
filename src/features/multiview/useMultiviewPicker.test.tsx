import { render, screen, waitFor } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it } from 'vitest';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { channel } from '@/features/playback/fixtures.test';
import { rowIdOf } from '@/features/panel/panelKeys';
import { useMultiviewPicker, type MultiviewPickerModel } from './useMultiviewPicker';

const list = [channel(1), channel(2), channel(3, { tvgId: null })];

function Harness({
  current,
  seen,
}: {
  current: number | null;
  seen: (m: MultiviewPickerModel) => void;
}): JSX.Element {
  const model = useMultiviewPicker(list, current);
  seen(model);
  return (
    <RemoteKeysProvider onBack={() => undefined}>
      <FocusScope id="picker">
        {model.rows.map((row) => (
          <Focusable key={row.channel.id} focusId={rowIdOf(row.channel.id)} data-testid="row">
            {row.channel.name}
          </Focusable>
        ))}
        <span data-testid="focused">{model.focusedRow?.channel.name ?? ''}</span>
        <span data-testid="schedule">{model.schedule.length}</span>
      </FocusScope>
    </RemoteKeysProvider>
  );
}

describe('useMultiviewPicker', () => {
  it('builds the All-channels rows, opens focused on the pane channel and feeds the focused row', async () => {
    let latest: MultiviewPickerModel | null = null;
    render(<Harness current={2} seen={(m) => (latest = m)} />);
    await waitFor(() => expect(screen.getAllByTestId('row')).toHaveLength(3));
    await waitFor(() => expect(screen.getByTestId('focused')).toHaveTextContent('Channel 2'));
    expect(latest).not.toBeNull();
    const model = latest as unknown as MultiviewPickerModel;
    expect(model.rows.map((r) => r.displayNumber)).toEqual([1, 2, 3]);
    expect(model.logo.rounded).toBe(true);
    expect(screen.getByTestId('schedule')).toHaveTextContent('0');
  });

  it('falls back to the first row when the pane channel is unknown, and tolerates channels without EPG', async () => {
    render(<Harness current={null} seen={() => undefined} />);
    await waitFor(() => expect(screen.getByTestId('focused')).toHaveTextContent('Channel 1'));
    screen.getAllByTestId('row')[2]?.focus();
    await waitFor(() => expect(screen.getByTestId('focused')).toHaveTextContent('Channel 3'));
  });
});
