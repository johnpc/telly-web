import { act, fireEvent, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { pinValue, pinView } from './pinEntry';
import { usePinEntry, type PinEntryHandlers } from './usePinEntry';

const press = (key: string): void => {
  fireEvent.keyDown(window, { key });
  fireEvent.keyUp(window, { key });
};

function Prompt(handlers: PinEntryHandlers): JSX.Element {
  const { state, onTyped } = usePinEntry(handlers);
  const view = pinView(state);
  return (
    <div data-testid="state">
      {state.kind}:{pinValue(view.wheel)}
      <input data-testid="field" value={view.typed} onChange={(e) => onTyped(e.target.value)} />
    </div>
  );
}

interface Deferred {
  promise: Promise<void>;
  resolve(): void;
}
function deferred(): Deferred {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('usePinEntry', () => {
  it('keyboard: the fourth digit submits once and a trailing Enter cannot flip the host twice', async () => {
    let blocked = false;
    const gate = deferred();
    const onSubmit = vi.fn((): Promise<void> => {
      blocked = !blocked;
      return gate.promise;
    });
    render(
      <RemoteKeysProvider onBack={() => undefined}>
        <Prompt keyboard onSubmit={onSubmit} />
      </RemoteKeysProvider>,
    );
    fireEvent.change(screen.getByTestId('field'), { target: { value: '1234' } });
    press('Enter');
    press('Enter');
    fireEvent.change(screen.getByTestId('field'), { target: { value: '9' } });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('1234');
    expect(blocked).toBe(true);
    expect(screen.getByTestId('state')).toHaveTextContent('Submitted');
    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    expect(screen.getByTestId('state')).toHaveTextContent('Typing:0000');
    expect(screen.getByTestId<HTMLInputElement>('field').value).toBe('');
    fireEvent.change(screen.getByTestId('field'), { target: { value: '12' } });
    press('Enter');
    expect(onSubmit).toHaveBeenLastCalledWith('12');
  });

  it('wheels: OK submits the dialed PIN once, keys are deaf until the host answers, a rejection blanks the wheels', async () => {
    const gate = deferred();
    const onSubmit = vi.fn(() => gate.promise);
    const onDismiss = vi.fn();
    render(
      <RemoteKeysProvider onBack={() => undefined}>
        <Prompt keyboard={false} onSubmit={onSubmit} onDismiss={onDismiss} />
      </RemoteKeysProvider>,
    );
    press('ArrowUp');
    press('ArrowRight');
    press('4');
    expect(screen.getByTestId('state')).toHaveTextContent('Typing:1400');
    press('Enter');
    press('Enter');
    press('ArrowUp');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('1400');
    expect(screen.getByTestId('state')).toHaveTextContent('Submitted:0000');
    press('Escape');
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    expect(screen.getByTestId('state')).toHaveTextContent('Typing:0000');
    press('ArrowUp');
    expect(screen.getByTestId('state')).toHaveTextContent('Typing:1000');
  });

  it('a synchronous host (void) still blanks after the microtask; OK on an empty field is swallowed, BACK falls through without onDismiss', async () => {
    const onBack = vi.fn();
    const onSubmit = vi.fn();
    render(
      <RemoteKeysProvider onBack={onBack}>
        <Prompt keyboard onSubmit={onSubmit} />
      </RemoteKeysProvider>,
    );
    press('Enter');
    expect(onSubmit).not.toHaveBeenCalled();
    press('Escape');
    expect(onBack).toHaveBeenCalledTimes(1);
    press('7');
    press('7');
    press('Enter');
    expect(onSubmit).toHaveBeenCalledWith('77');
    await act(async () => undefined);
    expect(screen.getByTestId('state')).toHaveTextContent('Typing');
  });
});
