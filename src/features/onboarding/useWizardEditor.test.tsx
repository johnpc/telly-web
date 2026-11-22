import { act, fireEvent, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { rectOf } from '@/core/focus/testLayout';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { useWizardEditor } from './useWizardEditor';
import { WizardFieldEditorScreen } from './WizardFieldEditorScreen';

function Row({
  canNext,
  value,
  onChange,
}: {
  canNext: boolean;
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  const edit = useWizardEditor('row', 'next', canNext);
  return (
    <>
      <output data-testid="editing">{String(edit.editing)}</output>
      {edit.editing ? (
        <WizardFieldEditorScreen
          focusId={edit.ids.editor}
          label="Enter URL"
          value={value}
          onValueChange={onChange}
          onBlur={edit.blur}
        />
      ) : (
        <Focusable focusId="row" data-rect="0,0" onClick={edit.open}>
          Enter URL
        </Focusable>
      )}
    </>
  );
}

function Harness({ canNext = true }: { canNext?: boolean }): JSX.Element {
  return (
    <RemoteKeysProvider onBack={() => undefined}>
      <FocusScope id="step" autoFocus="first">
        <Row canNext={canNext} value="http://x" onChange={() => undefined} />
        <Focusable focusId="next" data-rect="400,0">
          Next
        </Focusable>
      </FocusScope>
    </RemoteKeysProvider>
  );
}

const settle = (): Promise<void> => act(async () => undefined);
const press = (key: string): void => {
  fireEvent.keyDown(window, { key });
  fireEvent.keyUp(window, { key });
};

describe('useWizardEditor', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const [x = 0, y = 0] = (this.getAttribute('data-rect') ?? '0,0').split(',').map(Number);
      return rectOf({ x, y });
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('OK on the row opens the editor with the value selected; OK commits and hands focus to Next', async () => {
    render(<Harness />);
    await settle();
    expect(screen.getByText('Enter URL')).toHaveFocus();
    press('Enter');
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(screen.getByTestId('editing')).toHaveTextContent('true');
    expect(input).toHaveFocus();
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 'http://x'.length]);
    press('ArrowRight');
    expect(input.selectionStart).toBe('http://x'.length);
    expect(input).toHaveFocus();
    press('Enter');
    expect(screen.getByTestId('editing')).toHaveTextContent('false');
    expect(screen.getByText('Next')).toHaveFocus();
  });

  it('BACK cancels back to the row; a commit without a usable value also returns to the row', async () => {
    const { rerender } = render(<Harness canNext={false} />);
    await settle();
    press('Enter');
    press('Escape');
    expect(screen.getByTestId('editing')).toHaveTextContent('false');
    expect(screen.getByText('Enter URL')).toHaveFocus();
    press('Enter');
    press('Enter');
    expect(screen.getByText('Enter URL')).toHaveFocus();
    rerender(<Harness canNext />);
  });

  it('focus leaving the field closes the editor without stealing focus back', async () => {
    render(<Harness />);
    await settle();
    press('Enter');
    const next = screen.getByText('Next');
    act(() => next.focus());
    expect(screen.getByTestId('editing')).toHaveTextContent('false');
    expect(next).toHaveFocus();
  });
});
