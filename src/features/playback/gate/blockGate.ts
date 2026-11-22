import type { ChannelRow } from '@/core/db/types';
import type { ParentalControls } from '@/core/settings/parentalControls';
import type { TuneGate } from '../tune/tunePolicies';
import { BlockSession } from './blockSession';

/**
 * PIN gate in front of every tune of a blocked channel (blocked channels stay
 * listed but are PIN-gated to play). Pure logic — the PIN card lives in the
 * UI layer; wrong or cancelled PINs never tune (Android `BlockGate`).
 */
// @stateMachine('Blocked-channel gate')
export type BlockGateState =
  | { kind: 'Ungated' }
  | { kind: 'Prompting'; channel: ChannelRow }
  | { kind: 'PassOnce'; id: number }
  | { kind: 'SessionUnlocked' };

const UNGATED: BlockGateState = { kind: 'Ungated' };

export class BlockGate implements TuneGate {
  private state: BlockGateState = UNGATED;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly parental: ParentalControls | null = null,
    private readonly session: BlockSession = new BlockSession(),
  ) {}

  /** The gate's mode; `SessionUnlocked` is derived from the shared session while nothing else is pending. */
  get current(): BlockGateState {
    if (this.state.kind === 'Ungated' && this.sessionUnlocked()) return { kind: 'SessionUnlocked' };
    return this.state;
  }

  /** The blocked channel awaiting a PIN, or null when no prompt is open. */
  get prompt(): ChannelRow | null {
    return this.state.kind === 'Prompting' ? this.state.channel : null;
  }

  /** "PIN input method" = Keyboard swaps the prompt to the masked digit entry. */
  get keyboardPin(): boolean {
    return this.parental?.usesKeyboardPin === true;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** True when tuning `channel` is gated; the prompt opens instead. */
  intercept(channel: ChannelRow): boolean {
    if (this.state.kind === 'PassOnce' && this.state.id === channel.id) {
      this.set(UNGATED);
      return false;
    }
    const gated = channel.blocked && this.parental?.hasPin === true && !this.sessionUnlocked();
    this.set(gated ? { kind: 'Prompting', channel } : UNGATED);
    return gated;
  }

  /** The pending channel when `pin` verifies (its next tune passes once); keeps prompting otherwise. */
  async unlock(pin: string): Promise<ChannelRow | null> {
    const channel = this.prompt;
    if (channel === null || this.parental === null) return null;
    if (!(await this.parental.verifyPin(pin))) return null;
    if (!this.parental.relocksAfterUnlock()) this.session.unlock();
    this.set({ kind: 'PassOnce', id: channel.id });
    return channel;
  }

  dismiss(): void {
    if (this.state.kind === 'Prompting') this.set(UNGATED);
  }

  private sessionUnlocked(): boolean {
    return this.session.unlocked && this.parental?.relocksAfterUnlock() === false;
  }

  private set(next: BlockGateState): void {
    this.state = next;
    for (const listener of this.listeners) listener();
  }
}
