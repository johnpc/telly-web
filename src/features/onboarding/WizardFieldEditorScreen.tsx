import type { JSX } from 'react';
import { useFocusable } from '@/core/focus/useFocusable';
import { CONDENSED_FONT, WIZARD_DIMS } from './wizardDims';

interface FieldEditorProps {
  focusId: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur: () => void;
  uriInput?: boolean;
}

/**
 * Inline editor for a wizard row (reference 08/09): white label above an
 * underlined grey field. A real `<input>` so TV browsers raise their
 * on-screen keyboard; the value is selected on open so typing replaces it.
 */
export function WizardFieldEditorScreen({
  focusId,
  label,
  value,
  onValueChange,
  onBlur,
  uriInput = false,
}: FieldEditorProps): JSX.Element {
  const { ref, props } = useFocusable(focusId);
  return (
    <div
      className={`${WIZARD_DIMS.actionWidth} pt-[calc(14*var(--dp))] pb-[calc(11*var(--dp))] pl-[calc(14*var(--dp))]`}
      style={CONDENSED_FONT}
      data-testid="wizard-field-editor"
    >
      <div className={`${WIZARD_DIMS.title} text-telly-text`}>{label}</div>
      <input
        {...props}
        ref={ref}
        type={uriInput ? 'url' : 'text'}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={(event) => {
          props.onFocus();
          event.currentTarget.select();
        }}
        onBlur={onBlur}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        aria-label={label}
        className="mt-[calc(2*var(--dp))] ml-[calc(4*var(--dp))] block w-[calc(270*var(--dp))] border-0 bg-transparent pt-[calc(6*var(--dp))] pb-[calc(2.5*var(--dp))] text-[calc(12*var(--dp))] leading-[calc(16*var(--dp))] text-telly-text-faint caret-telly-text outline-none"
      />
      <div className="mt-[calc(4*var(--dp))] mb-[calc(10*var(--dp))] ml-[calc(4*var(--dp))] h-[calc(1*var(--dp))] bg-telly-field-underline" />
    </div>
  );
}
