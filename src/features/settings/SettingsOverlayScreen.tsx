import type { JSX } from 'react';
import { confirmSpecFor } from './confirmSpecs';
import { useOverlayFocus, rowFocusId } from './focusMemory';
import type { SettingsController } from './settingsController';
import { choosePickerOption } from './settingsOverlayResults';
import type { SettingsOverlay } from './settingsUiState';
import { SettingsConfirmScreen } from './SettingsConfirmScreen';
import { SettingsPinScreen } from './SettingsPinScreen';
import { SettingsRowScreen } from './SettingsRowScreen';
import { SettingsSheetFrameScreen } from './SettingsSheetScreen';
import { SettingsTextEditScreen } from './SettingsTextEditScreen';

interface OverlayProps {
  controller: SettingsController;
  overlay: SettingsOverlay;
}

/** Routes the active overlay to its dialog (Android `SettingsScreenOverlay`). */
export function SettingsOverlayScreen({ controller, overlay }: OverlayProps): JSX.Element | null {
  const confirm = confirmSpecFor(overlay);
  if (confirm !== null) return <SettingsConfirmScreen controller={controller} spec={confirm} />;
  switch (overlay.kind) {
    case 'Picker':
      return <PickerScreen controller={controller} overlay={overlay} />;
    case 'TextEdit':
      return <SettingsTextEditScreen controller={controller} overlay={overlay} />;
    case 'PinSetup':
    case 'PinVerify':
      return <SettingsPinScreen controller={controller} overlay={overlay} />;
    default:
      return null;
  }
}

type Picker = Extract<SettingsOverlay, { kind: 'Picker' }>;

/** Single-choice picker: option list with a blue check on the current one; focus lands on it. */
function PickerScreen({
  controller,
  overlay,
}: {
  controller: SettingsController;
  overlay: Picker;
}): JSX.Element {
  useOverlayFocus(rowFocusId(`picker:${overlay.current}`));
  return (
    <SettingsSheetFrameScreen title={overlay.spec.title}>
      <ul className="m-0 list-none p-0" data-testid="settings-picker">
        {overlay.spec.options.map((option) => (
          <li key={option.raw}>
            <SettingsRowScreen
              row={{
                kind: 'Value',
                id: `picker:${option.raw}`,
                title: option.label,
                selected: option.raw === overlay.current,
              }}
              onActivate={() => choosePickerOption(controller, option.raw)}
            />
          </li>
        ))}
      </ul>
    </SettingsSheetFrameScreen>
  );
}
