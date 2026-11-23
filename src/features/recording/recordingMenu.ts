import type { ChannelRow } from '@/core/db/types';
import { CustomRecordingForm } from './customRecordingForm';
import type { RecordingCenter } from './recordingCenter';
import { DONE, type RecordingPrompt } from './recordingPrompt';

export interface RecordingMenuDeps {
  center: Pick<RecordingCenter, 'toggleInstant' | 'scheduleProgramme' | 'stop'>;
  clock: () => number;
  /** The host maps prompts onto its own layer/overlay machine. */
  show: (prompt: RecordingPrompt) => void;
}

/**
 * Per-host adapter between the shared context-sheet rows and the DVR facade
 * (Android `RecordingMenu`): the guide, the playback panel and search each
 * own one, feeding `RecordingPrompt`s back through `show`. Holds no state:
 * the custom-recording form travels inside the host's `CustomRecording`
 * layer, so BACK on that layer drops form and screen together.
 */
export class RecordingMenu {
  constructor(private readonly deps: RecordingMenuDeps) {}

  /** The sheet's "Record": instant record, or Stop confirm while live. */
  onRecord(channel: ChannelRow): void {
    void this.deps.center.toggleInstant(channel).then(this.deps.show);
  }

  /** Guide-cell "Record" on a future programme: schedule its slot. */
  onRecordProgramme(channel: ChannelRow, title: string | null, startMs: number, endMs: number): void {
    void this.deps.center.scheduleProgramme(channel, title, startMs, endMs).then(this.deps.show);
  }

  /** "Custom recording": a fresh form for the host to show. */
  onCustomRecording(channel: ChannelRow): void {
    this.deps.show({ kind: 'CustomForm', form: new CustomRecordingForm(channel, this.deps.clock()) });
  }

  /** The form's Create action: schedule and close. */
  createFromForm(form: CustomRecordingForm): void {
    void this.deps.center
      .scheduleProgramme(form.channel, null, form.startMs, form.endMs)
      .then(() => this.deps.show(DONE));
  }

  /** OK on Stop in the GuidedStep confirm. */
  confirmStop(recordingId: number): void {
    void this.deps.center.stop(recordingId).then(() => this.deps.show(DONE));
  }
}
