// One process-wide "already unlocked" bit shared by every `BlockGate` (the
// guide preview and fullscreen playback build their own tuners), honoured
// only while Parental → "Don't require PIN after unlocking" says so.
// Relocked when parental controls turn off or the PIN changes
// (`parentalRelock.ts`), so a stale unlock never outlives the settings that
// granted it (Android `BlockSession`).
// @stateMachine('Block session')
export type BlockSessionState = 'Locked' | 'Unlocked';

export class BlockSession {
  private state: BlockSessionState = 'Locked';

  get current(): BlockSessionState {
    return this.state;
  }

  get unlocked(): boolean {
    return this.state === 'Unlocked';
  }

  unlock(): void {
    this.state = 'Unlocked';
  }

  relock(): void {
    this.state = 'Locked';
  }
}
