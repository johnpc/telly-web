import { act, fireEvent, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteKeysProvider } from '../input/RemoteKeysProvider';
import { Focusable } from './Focusable';
import { FocusScope } from './FocusScope';
import { rectOf } from './testLayout';
import { useFocusedId } from './useFocusedId';

function Probe(): JSX.Element {
  return <output data-testid="focused">{useFocusedId() ?? 'none'}</output>;
}

interface HarnessProps {
  modal: boolean;
  onA?: () => void;
  onBack?: () => void;
  closeModal?: () => void;
}

const noop = (): void => undefined;

function Harness({ modal, onA, onBack = noop, closeModal = noop }: HarnessProps): JSX.Element {
  return (
    <RemoteKeysProvider onBack={onBack}>
      <FocusScope id="screen">
        <Focusable focusId="a" data-rect="0,0" onClick={onA} className="cell" focusedClassName="ring">
          A
        </Focusable>
        <Focusable focusId="b" as="button" data-rect="120,0">
          {(focused) => (focused ? 'B*' : 'B')}
        </Focusable>
        {modal && (
          <FocusScope id="modal" trap onBack={closeModal}>
            <Focusable focusId="m" data-rect="300,300" />
          </FocusScope>
        )}
      </FocusScope>
      <Probe />
    </RemoteKeysProvider>
  );
}

const settle = (): Promise<void> => act(async () => undefined);
const press = (key: string): void => {
  fireEvent.keyDown(window, { key });
  fireEvent.keyUp(window, { key });
};

describe('FocusScope / Focusable / useFocusedId', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const [x = 0, y = 0] = (this.getAttribute('data-rect') ?? '0,0,0,0').split(',').map(Number);
      return this.hasAttribute('data-rect') ? rectOf({ x, y }) : rectOf({ x: 0, y: 0, w: 0, h: 0 });
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('auto-focuses the first element, moves with arrows, activates with OK and exposes focus state', async () => {
    const onA = vi.fn();
    render(<Harness modal={false} onA={onA} />);
    await settle();
    const a = screen.getByText('A');
    expect(screen.getByTestId('focused')).toHaveTextContent('a');
    expect(a).toHaveClass('cell', 'ring');
    expect(a).toHaveAttribute('data-focused', 'true');
    expect(a).toHaveAttribute('tabindex', '-1');
    expect(a).toHaveAttribute('data-focus-id', 'a');
    press('ArrowRight');
    expect(screen.getByTestId('focused')).toHaveTextContent('b');
    expect(screen.getByRole('button')).toHaveTextContent('B*');
    expect(a).not.toHaveClass('ring');
    expect(a).not.toHaveAttribute('data-focused');
    press('ArrowLeft');
    press('Enter');
    expect(onA).toHaveBeenCalledTimes(1);
    expect(a).toHaveFocus();
  });

  it('adopts native focus from a tap/click', async () => {
    render(<Harness modal={false} />);
    await settle();
    act(() => screen.getByRole('button').focus());
    expect(screen.getByTestId('focused')).toHaveTextContent('b');
  });

  it('a trap scope captures arrows and BACK, and popping it restores the previous focus', async () => {
    const closeModal = vi.fn();
    const onBack = vi.fn();
    const { rerender } = render(<Harness modal={false} onBack={onBack} closeModal={closeModal} />);
    await settle();
    press('ArrowRight');
    expect(screen.getByTestId('focused')).toHaveTextContent('b');
    rerender(<Harness modal onBack={onBack} closeModal={closeModal} />);
    await settle();
    expect(screen.getByTestId('focused')).toHaveTextContent('m');
    press('ArrowLeft');
    expect(screen.getByTestId('focused')).toHaveTextContent('m');
    press('Escape');
    expect(closeModal).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
    rerender(<Harness modal={false} onBack={onBack} closeModal={closeModal} />);
    await settle();
    expect(screen.getByTestId('focused')).toHaveTextContent('b');
    press('Escape');
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
