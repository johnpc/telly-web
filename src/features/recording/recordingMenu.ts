import type { ChannelRow } from '@/core/db/types';
import { Observable } from '@/features/guide/observable';
import { CustomRecordingForm } from './customRecordingForm';
import type { RecordingCenter } from './recordingCenter';
import { CUSTOM_FORM, DONE, type RecordingPrompt } from './recordingPrompt';

export interface RecordingMenuDeps {
  center: Pick<RecordingCenter, 'toggleInstant' | 'scheduleProgramme' | 'stop'>;
  clock: () => number;
  /** The host maps prompts onto its own layer/overlay machine. */
  show: (prompt: RecordingPrompt) => void;
}

/**
 * Per-host adapter between the shared context-sheet rows and the DVR facade
 * (Android `RecordingMenu`): the guide, the playback panel and search each
 * own one, feeding `RecordingPrompt`s back through `show`. Also owns the
 * custom-recording form the host renders while `CustomForm` is up.
 */
export class RecordingMenu extends Observable {
  private open: CustomRecordingForm | null = null;

  constructor(private readonly deps: RecordingMenuDeps) {
    super();
  }

  /** The open custom-recording form (null while none is up). */
  get form(): CustomRecordingForm | null {
    return this.open;
  }

  /** The sheet's "Record": instant record, or Stop confirm while live. */
  onRecord(channel: ChannelRow): void {
    void this.deps.center.toggleInstant(channel).then(this.deps.show);
  }

  /** Guide-cell "Record" on a future programme: schedule its slot. */
  onRecordProgramme(channel: ChannelRow, title: string | null, startMs: number, endMs: number): void {
    void this.deps.center.scheduleProgramme(channel, title, startMs, endMs).then(this.deps.show);
  }

  /** "Custom recording": prime the form and ask the host to show it. */
  onCustomRecording(channel: ChannelRow): void {
    this.open = new CustomRecordingForm(channel, this.deps.clock());
    this.notify();
    this.deps.show(CUSTOM_FORM);
  }

  /** The form's Create action: schedule and close. */
  createFromForm(): void {
    const form = this.open;
    if (form === null) return;
    void this.deps.center.scheduleProgramme(form.channel, null, form.startMs, form.endMs).then(() => {
      this.dismissForm();
      this.deps.show(DONE);
    });
  }

  /** OK on Stop in the GuidedStep confirm. */
  confirmStop(recordingId: number): void {
    void this.deps.center.stop(recordingId).then(() => this.deps.show(DONE));
  }

  /** BACK out of the form drops its state. */
  dismissForm(): void {
    if (this.open === null) return;
    this.open = null;
    this.notify();
  }
}
