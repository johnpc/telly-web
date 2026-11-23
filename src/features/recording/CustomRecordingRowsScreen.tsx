import type { JSX } from 'react';
import { Focusable } from '@/core/focus/Focusable';

export const CUSTOM_RECORDING_TITLE = 'Custom recording';
export const START_ID = 'custom-recording-start';
export const DURATION_ID = 'custom-recording-duration';

const ROW_CLASS =
  'flex h-[5rem] w-full items-center rounded px-[2rem] text-left text-[1.875rem] text-telly-text';
const ROW_FOCUSED_CLASS = 'bg-telly-focus-fill text-telly-focus-text';

/** The read-only channel line above the form's adjustable rows. */
export function ValueRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex h-[5rem] items-center px-[2rem] text-[1.875rem]">
      <span className="text-telly-text-muted">{label}</span>
      <span className="flex-1" />
      <span className="text-white">{value}</span>
    </div>
  );
}

/** A focusable label+value row: LEFT/RIGHT step the value, OK steps forward. */
export function StepperRow({
  focusId,
  label,
  value,
  onAdjust,
}: {
  focusId: string;
  label: string;
  value: string;
  onAdjust: (steps: number) => void;
}): JSX.Element {
  return (
    <Focusable
      focusId={focusId}
      as="button"
      onClick={() => onAdjust(+1)}
      className={ROW_CLASS}
      focusedClassName={ROW_FOCUSED_CLASS}
      data-testid={focusId}
    >
      <span>{label}</span>
      <span className="flex-1" />
      <span data-testid={`${focusId}-value`}>{value}</span>
    </Focusable>
  );
}

/** The form's Create action row. */
export function ActionRow({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <Focusable
      focusId={`custom-recording-${label.toLowerCase()}`}
      as="button"
      onClick={onClick}
      className={ROW_CLASS}
      focusedClassName={ROW_FOCUSED_CLASS}
    >
      {label}
    </Focusable>
  );
}
