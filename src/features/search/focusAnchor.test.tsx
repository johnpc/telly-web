import { act, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { focusEngine } from '@/core/focus/focusEngine';
import { restoreFocus, useFocusAnchor } from './focusAnchor';

function Harness({ modal }: { modal: boolean }): JSX.Element {
  const restore = useFocusAnchor(modal);
  return (
    <RemoteKeysProvider onBack={() => undefined}>
      <button onClick={restore}>restore</button>
      <FocusScope id="screen">
        <Focusable focusId="row-a">A</Focusable>
        <Focusable focusId="row-b">B</Focusable>
        {modal && (
          <FocusScope id="modal" trap autoFocus="first">
            <Focusable focusId="modal-x">X</Focusable>
          </FocusScope>
        )}
      </FocusScope>
    </RemoteKeysProvider>
  );
}

describe('useFocusAnchor', () => {
  it('captures the node focused when the overlay opens and restores it on close', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const { rerender } = render(<Harness modal={false} />);
    await act(async () => undefined);
    act(() => {
      focusEngine.focus('row-b');
    });
    rerender(<Harness modal />);
    await act(async () => undefined);
    expect(focusEngine.current).toBe('modal-x');
    act(() => screen.getByText('restore').click());
    expect(focusEngine.current).toBe('row-b');
    rerender(<Harness modal={false} />);
    await act(async () => undefined);
    expect(focusEngine.current).toBe('row-b');
    expect(restoreFocus(null)).toBe(false);
    expect(restoreFocus('nope')).toBe(false);
  });
});
