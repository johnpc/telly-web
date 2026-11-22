import { act, render, screen } from '@testing-library/react';
import { type JSX, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { landFocus, rowFocusId, useOverlayFocus, useSheetFocus } from './focusMemory';

const memory = new Map<string, string>();

function Pane({ pane, ids }: { pane: string; ids: string[] }): JSX.Element {
  useSheetFocus(memory, pane, ids[0] ?? null, ids.map(rowFocusId));
  return (
    <>
      {ids.map((id) => (
        <Focusable key={id} focusId={rowFocusId(id)}>
          {id}
        </Focusable>
      ))}
    </>
  );
}

function Harness(): JSX.Element {
  const [pane, setPane] = useState('root');
  return (
    <RemoteKeysProvider onBack={() => undefined}>
      <FocusScope id="settings" autoFocus={false}>
        <button onClick={() => setPane(pane === 'root' ? 'general' : 'root')}>swap</button>
        {pane === 'root' ? <Pane pane="root" ids={['a', 'b']} /> : <Pane pane="general" ids={['x']} />}
      </FocusScope>
    </RemoteKeysProvider>
  );
}

function Overlay({ target }: { target: string | null }): JSX.Element {
  useOverlayFocus(target);
  return <Focusable focusId="opt">opt</Focusable>;
}

describe('settings focus memory', () => {
  beforeEach(() => {
    memory.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('lands on the first row, remembers the row you left from and restores it on return', async () => {
    render(<Harness />);
    await act(async () => undefined);
    expect(screen.getByText('a')).toHaveFocus();
    await act(async () => screen.getByText('b').focus());
    expect(memory.get('root')).toBe(rowFocusId('b'));
    await act(async () => screen.getByText('swap').click());
    expect(screen.getByText('x')).toHaveFocus();
    expect(memory.get('general')).toBe(rowFocusId('x'));
    await act(async () => screen.getByText('swap').click());
    expect(screen.getByText('b')).toHaveFocus();
  });

  it('falls back to the first row when the remembered one is gone, and focuses overlay targets', async () => {
    landFocus('settings/missing', 'a');
    landFocus(undefined, null);
    render(
      <RemoteKeysProvider onBack={() => undefined}>
        <FocusScope id="o" autoFocus={false}>
          <Overlay target="opt" />
        </FocusScope>
      </RemoteKeysProvider>,
    );
    await act(async () => undefined);
    expect(screen.getByText('opt')).toHaveFocus();
    render(<Overlay target={null} />);
  });
});
