import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { PinPrompt } from './PinPromptScreen';

const press = (key: string): void => {
  fireEvent.keyDown(window, { key });
  fireEvent.keyUp(window, { key });
};

describe('PinPrompt / usePinEntry', () => {
  it('drives the wheels with the D-pad and digits, commits on OK and blanks, BACK dismisses', async () => {
    const onSubmit = vi.fn();
    const onDismiss = vi.fn();
    const onBack = vi.fn();
    render(
      <RemoteKeysProvider onBack={onBack}>
        <PinPrompt title="Enter PIN" keyboard={false} onSubmit={onSubmit} onDismiss={onDismiss} />
      </RemoteKeysProvider>,
    );
    await act(async () => undefined);
    expect(screen.getByText('Enter PIN')).toBeInTheDocument();
    press('ArrowUp');
    press('ArrowUp');
    press('ArrowRight');
    press('4');
    press('6');
    press('ArrowDown');
    expect(screen.getByTestId('pin-wheel')).toHaveTextContent('2469');
    press('Enter');
    expect(onSubmit).toHaveBeenCalledWith('2469');
    expect(screen.getByTestId('pin-wheel')).toHaveTextContent('0000');
    press('Escape');
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('without onDismiss BACK falls through; the keyboard method commits on the fourth digit', async () => {
    const onSubmit = vi.fn();
    const onBack = vi.fn();
    const { rerender } = render(
      <RemoteKeysProvider onBack={onBack}>
        <PinPrompt title="Set a PIN" keyboard={false} onSubmit={onSubmit} />
      </RemoteKeysProvider>,
    );
    await act(async () => undefined);
    press('Escape');
    expect(onBack).toHaveBeenCalledTimes(1);
    rerender(
      <RemoteKeysProvider onBack={onBack}>
        <PinPrompt title="Set a PIN" keyboard onSubmit={onSubmit} />
      </RemoteKeysProvider>,
    );
    const field = screen.getByTestId<HTMLInputElement>('pin-keyboard');
    fireEvent.change(field, { target: { value: '12x' } });
    expect(field.value).toBe('12');
    fireEvent.change(field, { target: { value: '1234' } });
    expect(onSubmit).toHaveBeenCalledWith('1234');
    expect(field.value).toBe('');
  });
});
