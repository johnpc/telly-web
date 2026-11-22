import type { JSX, ReactNode } from 'react';
import { Focusable } from '@/core/focus/Focusable';
import { CONDENSED_FONT, WIZARD_DIMS } from './wizardDims';

export interface WizardActionRowProps {
  focusId: string;
  text: string;
  onClick: () => void;
  /** 298 dp action rows (middle column) or 112 dp buttons (right column). */
  width?: 'action' | 'button';
  /** Disabled rows are skipped when focusing, as leanback does. */
  enabled?: boolean;
  secondaryText?: string | null;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

interface RowBodyProps extends Pick<
  WizardActionRowProps,
  'text' | 'secondaryText' | 'leadingIcon' | 'trailingIcon'
> {
  focused: boolean;
}

function RowBody({ text, secondaryText, leadingIcon, trailingIcon, focused }: RowBodyProps): JSX.Element {
  // Reference: #5D5F61 at rest, #6F7071 on the focused pill.
  const secondaryColor = focused ? 'text-telly-text-faint-focused' : 'text-telly-text-faint';
  return (
    <>
      {leadingIcon !== undefined && <span className="mr-[calc(4*var(--dp))] flex">{leadingIcon}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={WIZARD_DIMS.title}>{text}</span>
        {secondaryText !== undefined && secondaryText !== null && secondaryText !== '' && (
          <span className={`${WIZARD_DIMS.secondary} ${secondaryColor} truncate`}>{secondaryText}</span>
        )}
      </span>
      {trailingIcon !== undefined && <span className="ml-[calc(4*var(--dp))] flex">{trailingIcon}</span>}
    </>
  );
}

/**
 * A leanback-style guided action: transparent at rest, light pill when
 * focused. Metrics from the reference uidumps: 44 dp single-line rows,
 * 62.5 dp two-line rows, 14 sp titles over 12 sp descriptions.
 */
export function WizardActionRowScreen(props: WizardActionRowProps): JSX.Element {
  const { focusId, onClick, width = 'action', enabled = true, ...body } = props;
  const base = `${WIZARD_DIMS.actionRow} ${width === 'button' ? WIZARD_DIMS.buttonWidth : WIZARD_DIMS.actionWidth}`;
  if (!enabled) {
    return (
      <div className={`${base} text-telly-text-disabled`} style={CONDENSED_FONT} aria-disabled="true">
        <RowBody {...body} focused={false} />
      </div>
    );
  }
  return (
    <Focusable
      focusId={focusId}
      role="button"
      onClick={onClick}
      className={`${base} text-telly-text`}
      focusedClassName={WIZARD_DIMS.focusPill}
      style={CONDENSED_FONT}
    >
      {(focused) => <RowBody {...body} focused={focused} />}
    </Focusable>
  );
}
