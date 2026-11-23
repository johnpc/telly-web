import type { CustomRecordingForm } from './customRecordingForm';

/**
 * What a Record / Custom recording action wants the hosting surface (guide
 * sheet, panel sheet, cell dropdown, search dropdown) to show next (Android
 * `RecordingPrompt`). Hosts map these onto their own layer/overlay types;
 * the recording slice stays host-agnostic.
 */
export type RecordingPrompt =
  /** The action completed (capture started/scheduled/stopped): close chrome. */
  | { kind: 'Done' }
  /** A second Record on a recording channel offers Stop (GuidedStep). */
  | { kind: 'StopConfirm'; recordingId: number; channelName: string }
  /** Open the custom-recording form it carries (the host's layer owns it from here on). */
  | { kind: 'CustomForm'; form: CustomRecordingForm };

export const DONE: RecordingPrompt = { kind: 'Done' };
