import type { JSX } from 'react';
import type { WizardEditor } from './useWizardEditor';
import { WizardActionRowScreen } from './WizardActionRowScreen';
import { WizardFieldEditorScreen } from './WizardFieldEditorScreen';
import { WIZARD_DIMS } from './wizardDims';
import { WIZARD_ERROR_TEXT, type WizardError } from './wizardState';

interface UrlFieldProps {
  label: string;
  value: string;
  edit: WizardEditor;
  onValueChange: (value: string) => void;
  uriInput?: boolean;
}

/** The shared inline field: an action row that turns into the inline editor on OK. */
export function WizardUrlFieldScreen({
  label,
  value,
  edit,
  onValueChange,
  uriInput = true,
}: UrlFieldProps): JSX.Element {
  if (edit.editing) {
    return (
      <WizardFieldEditorScreen
        focusId={edit.ids.editor}
        label={label}
        value={value}
        onValueChange={onValueChange}
        onBlur={edit.blur}
        uriInput={uriInput}
      />
    );
  }
  return (
    <WizardActionRowScreen focusId={edit.ids.row} text={label} onClick={edit.open} secondaryText={value} />
  );
}

/** "Paste from clipboard" row: copies the clipboard text into the draft (when the browser allows). */
export function WizardClipboardRowScreen({
  focusId,
  onPaste,
}: {
  focusId: string;
  onPaste: (text: string) => void;
}): JSX.Element {
  const paste = (): void => {
    navigator.clipboard
      ?.readText()
      .then((text) => onPaste(text.trim()))
      .catch(() => undefined);
  };
  return <WizardActionRowScreen focusId={focusId} text="Paste from clipboard" onClick={paste} />;
}

/** Inline validation/load error rendered under the URL row. */
export function WizardUrlErrorScreen({ error }: { error: WizardError }): JSX.Element {
  return (
    <p
      className={`${WIZARD_DIMS.actionWidth} pl-[calc(14*var(--dp))] text-[calc(14*var(--dp))] leading-[calc(19*var(--dp))] text-telly-error`}
      role="alert"
    >
      {WIZARD_ERROR_TEXT[error]}
    </p>
  );
}
