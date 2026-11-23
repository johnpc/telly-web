import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { focusEngine } from '@/core/focus/focusEngine';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { displayName } from '@/core/db/types';
import { clockText } from '@/core/time';
import { useClockStyle } from '@/features/playback/info/usePlayerSettings';
import type { CustomRecordingForm } from './customRecordingForm';
import {
  ActionRow,
  CUSTOM_RECORDING_TITLE,
  DURATION_ID,
  START_ID,
  StepperRow,
  ValueRow,
} from './CustomRecordingRowsScreen';
import type { RecordingMenu } from './recordingMenu';
import { useObservableVersion } from './useRecordings';

/** LEFT/RIGHT on the focused stepper row adjust its value (the form's own keys ride above the host's). */
function useStepperKeys(form: CustomRecordingForm): void {
  useKeyHandler((key) => {
    if (key !== 'LEFT' && key !== 'RIGHT') return false;
    const steps = key === 'LEFT' ? -1 : +1;
    if (focusEngine.current === START_ID) form.adjustStart(steps);
    else if (focusEngine.current === DURATION_ID) form.adjustDuration(steps);
    else return false;
    return true;
  });
}

function FormDialog({ form, menu }: { form: CustomRecordingForm; menu: RecordingMenu }): JSX.Element {
  useObservableVersion(form);
  useStepperKeys(form);
  const style = useClockStyle();
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center"
      data-testid="custom-recording-form"
    >
      <div className="w-[52.5rem] rounded-[0.25rem] bg-telly-menu-sheet px-[1rem] py-[2rem]">
        <h2 className="px-[2rem] py-[0.5rem] text-[2.25rem] text-white">{CUSTOM_RECORDING_TITLE}</h2>
        <ValueRow label="Channel" value={displayName(form.channel)} />
        <StepperRow
          focusId={START_ID}
          label="Start time"
          value={clockText(form.startMs, style)}
          onAdjust={(steps) => form.adjustStart(steps)}
        />
        <StepperRow
          focusId={DURATION_ID}
          label="Duration"
          value={`${form.durationMinutes} min`}
          onAdjust={(steps) => form.adjustDuration(steps)}
        />
        <ActionRow label="Create" onClick={() => menu.createFromForm(form)} />
      </div>
    </div>
  );
}

/**
 * The "Custom recording" form (Android `RecordingScreenForm`): a small
 * centered dialog — channel prefilled from the invoking context, start time
 * and duration adjustable with LEFT/RIGHT (OK also steps forward), Create
 * schedules it. The guide, playback and search hosts all render this.
 */
export function CustomRecordingFormScreen({
  form,
  menu,
  onBack,
}: {
  /** The form the host's layer carries (BACK pops layer and form together). */
  form: CustomRecordingForm;
  menu: RecordingMenu;
  onBack: () => void;
}): JSX.Element {
  return (
    <FocusScope id="custom-recording" trap autoFocus="first" onBack={onBack}>
      <FormDialog form={form} menu={menu} />
    </FocusScope>
  );
}
